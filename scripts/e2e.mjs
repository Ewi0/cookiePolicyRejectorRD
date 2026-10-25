// End-to-end test: loads extension/ into a real headless Chrome and checks what it
// does to every fixture in test/fixtures, in both modes.
//   node scripts/e2e.mjs            CHROME_PATH=/path/to/chrome to override
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

    for (const [name, problems] of [...await popupStates(browser), await popupLayout(browser)]) {
      if (problems.length) failed++;
      console.log(`${problems.length ? 'FAIL' : 'pass'}  popup  ${name.padEnd(30)} ${problems.join('; ')}`);
    }

    const late = await installedLater();
    if (late.length) failed++;
    console.log(`${late.length ? 'FAIL' : 'pass'}  install devsite.html, open before install  ${late.join('; ')}`);
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

const POPUP_STATE = `JSON.stringify({
  needs: document.body.dataset.needs || '',
  status: document.getElementById('status').textContent,
  headline: document.getElementById('headline').textContent,
  detail: document.getElementById('detail').textContent,
  button: document.getElementById('pause').textContent,
  tally: document.getElementById('tally').textContent,
  report: document.getElementById('report').href,
  lang: document.documentElement.lang,
  calls: window.__calls || [],
})`;

/** The real popup against a pretend active tab: the extension APIs it consults are stubbed before it
 *  loads, so each state can be checked, including what its button does. */
async function popupStates(browser) {
  const results = [];
  const open = async ({ running, access }) => {
    const init = `(() => {
      const tab = { id: 4242, url: 'https://news.example/story' };
      const note = (name) => async (arg) => { window.__calls.push([name, arg]); return false; };
      window.__calls = [];
      chrome.tabs.query = async () => [tab];
      chrome.tabs.sendMessage = async () => { if (${running}) return true; throw new Error('Could not establish connection'); };
      chrome.tabs.reload = note('reload');
      chrome.tabs.create = note('create');
      chrome.permissions.contains = async () => ${access};
      chrome.permissions.request = note('request');
      window.close = () => window.__calls.push(['close']);
    })();`;
    const page = await browser.open(`chrome-extension://${browser.id}/popup/popup.html`, { width: 360, height: 560, init });
    await sleep(600);
    return page;
  };
  const read = async (page) => JSON.parse(await page.eval(POPUP_STATE));
  const expect = (problems, what, got, want) => { if (got !== want) problems.push(`${what}: ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`); };

  // Working: armed, and the report link carries nothing about the page.
  let page = await open({ running: true, access: true });
  let s = await read(page);
  let problems = [];
  expect(problems, 'status', s.status, '● ARMED');
  expect(problems, 'button', s.button, 'PAUSE ON THIS SITE');
  const { version } = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  expect(problems, 'report', s.report, `https://github.com/Ewi0/cookiePolicyRejectorRD/issues/new?template=site.yml&version=${version}`);
  await page.eval(`document.getElementById('report').click()`);
  expect(problems, 'report opens', JSON.stringify((await read(page)).calls[0]), JSON.stringify(['create', { url: s.report }]));
  results.push(['running', problems]);
  await page.close();

  // Opened before the extension: say so, and reload that tab.
  page = await open({ running: false, access: true });
  s = await read(page);
  problems = [];
  expect(problems, 'needs', s.needs, 'Reload');
  expect(problems, 'status', s.status, '○ NOT RUNNING');
  expect(problems, 'button', s.button, 'RELOAD THIS PAGE');
  await page.eval(`document.getElementById('pause').click()`);
  expect(problems, 'click', JSON.stringify((await read(page)).calls), JSON.stringify([['reload', 4242], ['close']]));
  results.push(['page older than extension', problems]);
  await page.close();

  // Site access withheld: ask for it.
  page = await open({ running: false, access: false });
  s = await read(page);
  problems = [];
  expect(problems, 'needs', s.needs, 'NoAccess');
  expect(problems, 'status', s.status, '○ NO ACCESS');
  expect(problems, 'button', s.button, 'ALLOW ON EVERY SITE');
  await page.eval(`document.getElementById('pause').click()`);
  expect(problems, 'click', JSON.stringify((await read(page)).calls), JSON.stringify([['request', { origins: ['<all_urls>'] }]]));
  results.push(['no site access', problems]);
  await page.close();

  // Another language (demo mode over http): text, plural form and number format.
  page = await browser.open(`http://127.0.0.1:${PORT}/extension/popup/popup.html?lang=de&host=spiegel.de&cmp=Sourcepoint&action=hide&total=1234`, { width: 360, height: 560 });
  await sleep(600);
  s = await read(page);
  problems = [];
  expect(problems, 'lang', s.lang, 'de');
  expect(problems, 'headline', s.headline, 'ALLES ABGELEHNT.');
  expect(problems, 'detail', s.detail, 'SOURCEPOINT — AUSGEBLENDET');
  expect(problems, 'tally', s.tally, '1.234 BANNER NIE GESEHEN');
  results.push(['German', problems]);
  await page.close();
  return results;
}

/** Every language in every state must fit the 360 × 560 popup: long translations wrap, and a popup
 *  that outgrows its box scrolls (Chrome caps popups at 600 px). Drives the popup's own render(). */
async function popupLayout(browser) {
  const states = [
    ['refuse', { mode: 'reject', host: 'spiegel.de', log: [{ cmp: 'Sourcepoint', action: 'hide' }], total: 12345 }],
    ['approve', { mode: 'accept', log: [{ cmp: 'Generic', action: 'accept' }], total: 2 }],
    ['paused', { paused: true, total: 1 }],
    ['no access', { paused: false, access: false, running: false }],
    ['reload', { access: true, running: false }],
    ['browser page', { running: true, host: '' }],
  ];
  const measure = `JSON.stringify(${JSON.stringify(states)}.map(([name, patch]) => {
    state = { ...state, ...patch };
    render();
    return [name, Math.round(document.querySelector('.panel').getBoundingClientRect().height), document.documentElement.scrollWidth];
  }))`;
  const problems = [];
  const locales = readdirSync(new URL('../extension/_locales/', import.meta.url));
  for (const lang of locales) {
    const page = await browser.open(`http://127.0.0.1:${PORT}/extension/popup/popup.html?lang=${lang}`, { width: 360, height: 900 });
    await sleep(400);
    for (const [name, height, width] of JSON.parse(await page.eval(measure))) {
      if (height > 560 || width > 360) problems.push(`${lang} ${name}: ${width}×${height}`);
    }
    await page.close();
  }
  return [`layout, ${locales.length} languages × ${states.length} states`, problems];
}

/** A tab that was open before the extension was installed: the engine has to start there without a
 *  reload, and find the bar at the end of a page far bigger than one scan used to cover. */
async function installedLater() {
  const b = await launch({ extension: false });
  try {
    const tab = await b.open(BASE + 'devsite.html');
    await sleep(2500); // the bar is up before the extension exists
    await b.loadExtension();
    return await check(async () => JSON.parse(await tab.eval(PROBE)), { page: 'devsite.html', wait: 6000 }, [], sleep);
  } finally {
    await b.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
