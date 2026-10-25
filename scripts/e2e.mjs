// End-to-end test: loads extension/ into a real headless Chrome and checks what it
// does to every fixture in test/fixtures, in both modes.
//   node scripts/e2e.mjs            CHROME_PATH=/path/to/chrome to override
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, PROBE, SELECTOR_PROBE, TALLY, check, selectorReport } from './cases.mjs';
import { launch, sleep } from './chrome.mjs';
import { serve } from './serve.mjs';

const OUT = fileURLToPath(new URL('../test/output/', import.meta.url));
const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}/test/fixtures/`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await serve(PORT);
  const browser = await launch();
  let failed = 0;
  try {
    console.log(`chrome: extension loaded (${browser.id})\n`);
    const blank = await browser.open('about:blank');
    const selectors = JSON.parse(await blank.eval(SELECTOR_PROBE));
    await blank.close();
    if (selectors.bad.length) failed++;
    console.log(selectorReport(selectors));

    const popup = await browser.open(`chrome-extension://${browser.id}/popup/popup.html`);
    await sleep(500);
    const setStore = (obj) => popup.eval(`chrome.storage.local.set(${JSON.stringify(obj)})`);

    const run = async (c, mode, expected) => {
      const tab = await browser.open(BASE + c.page);
      const problems = await check(async () => JSON.parse(await tab.eval(PROBE)), c, expected, sleep);
      await tab.close();
      if (problems.length) failed++;
      console.log(`${problems.length ? 'FAIL' : 'pass'}  ${mode.padEnd(6)} ${c.page.padEnd(30)} ${problems.join('; ')}`);
    };

    for (const mode of ['reject', 'accept']) {
      await setStore({ mode, paused: {} });
      for (const c of CASES) await run(c, mode, c[mode]);
    }

    // Paused on this site: nothing pressed, banner shows.
    await setStore({ mode: 'reject', paused: { '127.0.0.1': true } });
    await run({ page: 'onetrust.html', visible: true, wait: 2500 }, 'paused', []);
    await setStore({ paused: {} });

    // The real popup, rendered by Chrome with live extension APIs.
    await popup.close();
    const shot = await browser.open(`chrome-extension://${browser.id}/popup/popup.html`, { width: 360, height: 560 });
    await sleep(700);
    const stats = await shot.eval('chrome.storage.local.get("stats").then((s) => s.stats)');
    writeFileSync(join(OUT, 'popup-chrome.png'), await shot.screenshot());
    const tallyOk = Object.entries(TALLY).every(([k, v]) => stats?.[k] === v);
    if (!tallyOk) failed++;
    console.log(`\n${tallyOk ? 'pass' : 'FAIL'}  tally ${JSON.stringify(stats)}${tallyOk ? '' : `, expected ${JSON.stringify(TALLY)}`}`);
    console.log('popup screenshot: test/output/popup-chrome.png');
  } finally {
    await browser.close();
    server.close();
  }
  if (browser.errors.length) {
    console.log(`\nscript errors:\n  ${[...new Set(browser.errors)].join('\n  ')}`);
    failed++;
  }
  console.log(failed ? `\n${failed} problem(s)` : '\nall green');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
