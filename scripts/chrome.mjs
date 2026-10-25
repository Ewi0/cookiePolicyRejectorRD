// Headless Chrome with the extension loaded, driven over the DevTools pipe (no dependencies).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME_PATH || {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
}[process.platform] || 'google-chrome';
export const EXT = fileURLToPath(new URL('../extension', import.meta.url));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Pipe {
  constructor(proc) {
    this.seq = 0;
    this.pending = new Map();
    this.listeners = new Set();
    this.out = proc.stdio[3];
    const input = proc.stdio[4];
    input.setEncoding('utf8');
    let buf = '';
    input.on('data', (chunk) => {
      buf += chunk;
      for (let i = buf.indexOf('\0'); i >= 0; i = buf.indexOf('\0')) {
        const msg = JSON.parse(buf.slice(0, i));
        buf = buf.slice(i + 1);
        const waiter = msg.id && this.pending.get(msg.id);
        if (waiter) {
          this.pending.delete(msg.id);
          msg.error ? waiter.reject(new Error(`${waiter.method}: ${msg.error.message}`)) : waiter.resolve(msg.result);
        } else this.listeners.forEach((fn) => fn(msg));
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    this.out.write(`${JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })}\0`);
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }
}

/** Starts Chrome, loads the extension, returns helpers. Call close() when done. */
export async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'cpr-chrome-'));
  const proc = spawn(CHROME, [
    '--headless', '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-search-engine-choice-screen', '--window-size=1280,900',
    ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), // Chrome will not start as root otherwise (containers)
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
  const cdp = new Pipe(proc);
  const errors = [];
  const logs = []; // engine debug lines ({ sessionId, text }) when storage.debug is on
  cdp.listeners.add((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errors.push(`${d.exception?.description || d.text} @ ${d.url || '?'}`);
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.args?.[0]?.value === '[CPR]') {
      logs.push({ sessionId: m.sessionId, text: m.params.args.slice(1).map((a) => a.value ?? a.description ?? '').join(' ') });
    }
  });
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: EXT });

  async function open(url, { width = 1280, height = 800 } = {}) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
    await cdp.send('Page.navigate', { url }, sessionId);
    return {
      sessionId,
      eval: async (expression) => (await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)).result.value,
      screenshot: async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId)).data, 'base64'),
      close: () => cdp.send('Target.closeTarget', { targetId }),
    };
  }

  async function close() {
    const exited = new Promise((r) => proc.once('exit', r));
    proc.kill();
    await Promise.race([exited, sleep(5000)]);
    // Helper processes can outlive the browser on Linux; a leftover temp profile is harmless.
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* left in tmp */ }
  }

  return { id, cdp, open, close, errors, logs };
}
