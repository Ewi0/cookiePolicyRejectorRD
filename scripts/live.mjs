// Live smoke test against real sites (REFUSE mode, throwaway profile). Banners depend on
// your region, so "nothing" can simply mean the site shows none where you are.
//   node scripts/live.mjs [url ...]       screenshots → test/output/live/
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './chrome.mjs';

const OUT = fileURLToPath(new URL('../test/output/live/', import.meta.url));
const SITES = process.argv.slice(2).length ? process.argv.slice(2) : [
  'https://www.cookiebot.com/en/',
  'https://usercentrics.com/',
  'https://www.onetrust.com/',
  'https://www.didomi.io/',
  'https://www.lemonde.fr/',
  'https://www.spiegel.de/',
  'https://www.theguardian.com/international',
  'https://www.osano.com/',
  'https://www.iubenda.com/en/',
  'https://www.cookieyes.com/',
  'https://www.consentmanager.net/en/',
  'https://www.ikea.com/gb/en/',
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  try {
    const ctl = await browser.open(`chrome-extension://${browser.id}/popup/popup.html`);
    await sleep(500);
    const verbose = process.env.CPR_DEBUG === '1';
    await ctl.eval(`chrome.storage.local.set({ mode: 'reject', paused: {}, debug: ${verbose} })`);
    for (const url of SITES) {
      const tab = await browser.open(url);
      await sleep(9000);
      const log = await ctl.eval(`(async () => {
        const tabs = await chrome.tabs.query({});
        const t = tabs.find((x) => x.url && x.url.startsWith(${JSON.stringify(new URL(url).origin)}));
        return t ? (await chrome.runtime.sendMessage({ type: 'cpr:tab', tabId: t.id }))?.log : null;
      })()`).catch(() => null);
      const name = new URL(url).hostname.replace(/^www\./, '');
      writeFileSync(join(OUT, `${name}.png`), await tab.screenshot());
      const what = log?.length ? log.map((e) => `${e.cmp}:${e.action}`).join(', ') : 'nothing';
      console.log(`${name.padEnd(24)} ${what}`);
      if (verbose) for (const l of browser.logs.filter((x) => x.sessionId === tab.sessionId)) console.log(`    · ${l.text.slice(0, 160)}`);
      await tab.close();
    }
  } finally {
    await browser.close();
  }
  const errs = [...new Set(browser.errors)].filter((e) => /chrome-extension:/.test(e));
  console.log(errs.length ? `\nextension errors:\n  ${errs.join('\n  ')}` : '\nno extension errors');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
