// End-to-end test in real Firefox: installs dist/firefox as a temporary add-on over
// WebDriver BiDi (no dependencies, no signing) and runs the same fixtures as e2e.mjs.
// BiDi cannot open moz-extension:// pages, so each mode runs from a copy of the build
// whose background defaults are preset (refuse / approve / paused on 127.0.0.1).
//   node scripts/build.mjs && node scripts/firefox-e2e.mjs      FIREFOX_PATH to override
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, PROBE, SELECTOR_PROBE, check, selectorReport } from './cases.mjs';
import { serve } from './serve.mjs';

const FIREFOX = process.env.FIREFOX_PATH || {
  darwin: '/Applications/Firefox.app/Contents/MacOS/firefox',
  win32: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
}[process.platform] || 'firefox';
const EXT = fileURLToPath(new URL('../dist/firefox', import.meta.url));
const ADDON_ID = JSON.parse(readFileSync(join(EXT, 'manifest.json'), 'utf8')).browser_specific_settings.gecko.id;
const UUID = '6f1b4f6e-0c1e-4b8e-9a8c-2f6b8a1d4c11';
const PORT = 4175;
const BIDI_PORT = 9333;
const BASE = `http://127.0.0.1:${PORT}/test/fixtures/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startFirefox(profile) {
  writeFileSync(join(profile, 'user.js'), [
    `user_pref("extensions.webextensions.uuids", ${JSON.stringify(JSON.stringify({ [ADDON_ID]: UUID }))});`,
    'user_pref("extensions.originControls.grantByDefault", true);',
    'user_pref("browser.shell.checkDefaultBrowser", false);',
    'user_pref("browser.aboutwelcome.enabled", false);',
    'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
    'user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);',
  ].join('\n'));
  const proc = spawn(FIREFOX, ['--headless', '--no-remote', '--profile', profile, `--remote-debugging-port=${BIDI_PORT}`, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  const ready = new Promise((resolve, reject) => {
    let log = '';
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (d) => {
      log += d;
      if (/WebDriver BiDi listening on/.test(log)) resolve();
    });
    proc.once('exit', () => reject(new Error(`firefox exited:\n${log.slice(-800)}`)));
  });
  return { proc, ready };
}

function bidi(url) {
  const ws = new WebSocket(url);
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    const p = msg.id && pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    msg.type === 'error' ? p.reject(new Error(`${p.method}: ${msg.error} ${msg.message}`)) : p.resolve(msg.result);
  };
  const opened = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params }));
  });
  return { opened, send, close: () => ws.close() };
}

/** Copy of the build with different first-run defaults in background.js. */
function variant(profile, name, from, to) {
  const dir = join(profile, `ext-${name}`);
  cpSync(EXT, dir, { recursive: true });
  const file = join(dir, 'background.js');
  const code = readFileSync(file, 'utf8');
  if (!code.includes(from)) throw new Error(`background.js no longer contains ${from}`);
  writeFileSync(file, code.replace(from, to));
  return dir;
}

async function main() {
  const server = await serve(PORT);
  const profile = mkdtempSync(join(tmpdir(), 'cpr-firefox-'));
  const { proc, ready } = startFirefox(profile);
  let failed = 0;
  try {
    await ready;
    const b = bidi(`ws://127.0.0.1:${BIDI_PORT}/session`);
    await b.opened;
    await b.send('session.new', { capabilities: {} });
    let installed = null;
    const install = async (path) => {
      if (installed) await b.send('webExtension.uninstall', { extension: installed });
      installed = (await b.send('webExtension.install', { extensionData: { type: 'path', path } })).extension;
      await sleep(500);
    };

    const open = async (url) => {
      const { context } = await b.send('browsingContext.create', { type: 'tab' });
      await b.send('browsingContext.navigate', { context, url, wait: 'complete' });
      const evaluate = async (expression) => {
        const r = await b.send('script.evaluate', { expression, target: { context }, awaitPromise: true });
        if (r.type !== 'success') throw new Error(r.exceptionDetails?.text || 'evaluate failed');
        return r.result.value;
      };
      return { evaluate, close: () => b.send('browsingContext.close', { context }) };
    };

    const run = async (c, mode, expected) => {
      const tab = await open(BASE + c.page);
      const problems = await check(async () => JSON.parse(await tab.evaluate(PROBE)), c, expected, sleep);
      await tab.close();
      if (problems.length) failed++;
      console.log(`${problems.length ? 'FAIL' : 'pass'}  ${mode.padEnd(6)} ${c.page.padEnd(30)} ${problems.join('; ')}`);
    };

    const DEFAULT_MODE = "mode: 'reject'";
    await install(EXT);
    console.log(`firefox: ${installed} installed as a temporary add-on\n`);
    const blank = await open('about:blank');
    const selectors = JSON.parse(await blank.evaluate(SELECTOR_PROBE));
    await blank.close();
    if (selectors.bad.length) failed++;
    console.log(selectorReport(selectors));
    for (const c of CASES) await run(c, 'reject', c.reject);
    await install(variant(profile, 'accept', DEFAULT_MODE, "mode: 'accept'"));
    for (const c of CASES) await run(c, 'accept', c.accept);
    await install(variant(profile, 'paused', 'paused: {}', "paused: { '127.0.0.1': true }"));
    await run({ page: 'onetrust.html', visible: true, wait: 2500 }, 'paused', []);
    b.close();
  } finally {
    const exited = new Promise((r) => proc.once('exit', r));
    proc.kill();
    await Promise.race([exited, sleep(5000)]);
    server.close();
    // Helper processes can outlive the browser on Linux; a leftover temp profile is harmless.
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* left in tmp */ }
  }
  console.log(failed ? `\n${failed} problem(s)` : '\nall green');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
