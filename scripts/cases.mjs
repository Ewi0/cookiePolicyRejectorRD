// Fixture expectations shared by the Chrome (e2e.mjs) and Firefox (firefox-e2e.mjs) runners.
// clicked: controls the page saw pressed, in order. visible: banner (or a second layer) still on screen.
// cookies: per mode, cookie names that must be gone or kept afterwards.
import { readFileSync } from 'node:fs';

export const CASES = [
  { page: 'onetrust.html', reject: ['reject'], accept: ['accept'] },
  { page: 'onetrust.html?second-layer', reject: ['settings', 'reject'], accept: ['accept'] },
  { page: 'cookiebot.html', reject: ['decline'], accept: ['allow-all'], unlocked: true },
  { page: 'reactdesk.html', reject: ['essential-only'], accept: ['accept-all'] },
  { page: 'de-modal.html', reject: ['nur-notwendige'], accept: ['alle-akzeptieren'], unlocked: true },
  { page: 'fr-two-layer.html', reject: ['parametrer', 'tout-refuser'], accept: ['tout-accepter'] },
  { page: 'fr-two-layer.html?layer=modal', reject: ['parametrer', 'tout-refuser'], accept: ['tout-accepter'] },
  { page: 'shadow.html', reject: ['deny'], accept: ['accept'] },
  { page: 'sourcepoint.html', reject: ['reject'], accept: ['accept'], unlocked: true },
  { page: 'info-only.html', reject: [], accept: ['got-it'] },
  { page: 'pay-or-consent.html', reject: [], accept: ['accept'], unlocked: true },
  { page: 'late.html', reject: ['rechazar'], accept: ['aceptar'], wait: 7000 },
  { page: 'login-modal.html', reject: [], accept: [], visible: true },
  { page: 'devsite.html', reject: [], accept: ['ok'], wait: 6000 },
  // Look-alikes of real consent platforms (test/fixtures/cmps.js). What the site was told is what counts.
  ...[
    'cookiebot', 'cookiebot-selection', 'didomi', 'inmobi', 'trustarc', 'usercentrics-v2', 'usercentrics-v3', 'funding-choices',
    'osano', 'cookieyes', 'complianz', 'iubenda', 'klaro', 'borlabs-v2', 'consentmanager', 'cookie-control', 'cookieconsent-v3',
    'shopify', 'hubspot', 'cookie-notice', 'termly', 'amazon', 'stack-exchange', 'wix', 'cookie-script', 'moove', 'tarteaucitron',
    'axeptio', 'generic-pl', 'generic-ru', 'generic-ja', 'generic-sv-shadow',
  ].map((id) => ({ page: `cmp.html?cmp=${id}`, reject: ['reject'], accept: ['accept'] })),
  // Second layers: refuse in the settings, or switch everything off and save.
  ...['didomi-two-layer', 'inmobi-two-layer', 'funding-choices-manage', 'cookieconsent-v2-settings', 'onetrust-toggles',
    'generic-it-two-layer', 'generic-nl-toggles',
  ].map((id) => ({ page: `cmp.html?cmp=${id}`, reject: ['settings', 'reject'], accept: ['accept'], wait: 9000 })),
  // Tracking cookies the site sets anyway: gone in refuse mode, the cookies the site needs stay.
  {
    page: 'trackers.html', reject: ['reject'], accept: ['accept'], wait: 3500,
    cookies: {
      reject: { gone: ['_ga', '_gid', '_fbp', '_ga_TEST123'], kept: ['session_id', 'lang'] },
      accept: { kept: ['_ga', '_gid', '_fbp', 'session_id', 'lang'] },
    },
  },
  // An earlier "yes" stored by the platform: withdrawn in refuse mode, so the banner returns and is refused.
  ...['onetrust', 'cookiebot', 'tcf'].map((cmp) => ({ page: `stale.html?cmp=${cmp}`, reject: ['reject'], accept: [], wait: 6000 })),
  // An earlier "no" stays: nothing to do.
  { page: 'stale.html?cmp=onetrust-refused', reject: [], accept: [], wait: 3000 },
];

// Every answered banner must reach the lifetime tally (both modes, plus the paused run).
export const TALLY = { reject: 53, accept: 53, hide: 3 };

const RULES = readFileSync(new URL('../extension/content/rules.js', import.meta.url), 'utf8');

/** Evaluated in any page: how many selectors rules.js uses, and which ones this browser cannot parse.
 *  A selector that does not parse fails silently at runtime, so its rule would never fire. */
export const SELECTOR_PROBE = `(() => {
  const g = {};
  new Function('globalThis', ${JSON.stringify(RULES)})(g);
  const all = [];
  for (const r of g.CPR.rules) {
    all.push(r.detect, r.root, ...(r.hide || []), ...(r.layers || []));
    for (const plan of [...(r.reject || []), ...(r.accept || [])]) {
      for (const step of typeof plan === 'string' ? [{ click: plan }] : plan) all.push(step.click, step.in, step.uncheck);
    }
  }
  const sels = [...new Set(all.filter(Boolean))];
  const bad = sels.filter((s) => { try { document.querySelector(s); return false; } catch { return true; } });
  return JSON.stringify({ total: sels.length, bad });
})()`;

export const selectorReport = ({ total, bad }) =>
  `${bad.length ? 'FAIL' : 'pass'}  rules  ${total} selectors parse${bad.length ? `; invalid: ${bad.join(' | ')}` : ''}`;

/** Evaluated in the fixture page: what was pressed, is the banner on screen, is scrolling locked. */
export const PROBE = `(() => {
  const up = (n) => n.parentElement || (n.getRootNode() instanceof ShadowRoot ? n.getRootNode().host : null);
  const seen = (el) => {
    if (!el || !el.isConnected) return false;
    for (let n = el; n; n = up(n)) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const host = document.querySelector('[data-test="banner"]');
  const banner = host?.shadowRoot?.querySelector('[data-test="banner-inner"]') || host;
  const layers = [...document.querySelectorAll('[data-test="layer"]')];
  const locked = [document.documentElement, document.body].some((e) => /hidden|clip/.test(getComputedStyle(e).overflowY));
  const cookies = document.cookie.split(';').map((c) => c.trim()).map((c) => c.split('=')[0]).filter(Boolean);
  return JSON.stringify({ clicked: (window.__cpr && window.__cpr.clicked) || [], visible: seen(banner) || layers.some(seen), locked, cookies });
})()`;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Polls a fixture until it settles, then returns the list of problems (empty = pass). */
export async function check(probe, c, expected, sleep) {
  const deadline = Date.now() + (c.wait || 4500);
  let got;
  for (;;) {
    await sleep(250);
    got = (await probe().catch(() => null)) || got;
    const settled = got && same(got.clicked, expected) && got.visible === Boolean(c.visible);
    if ((settled && expected.length) || Date.now() > deadline) break;
  }
  await sleep(c.cookies ? 2500 : 400); // catch late extra clicks, and cookies a page sets again later
  got = (await probe().catch(() => null)) || got;
  const problems = [];
  if (!same(got?.clicked, expected)) problems.push(`pressed ${JSON.stringify(got?.clicked)}, expected ${JSON.stringify(expected)}`);
  if (got?.visible !== Boolean(c.visible)) problems.push(got?.visible ? 'banner still visible' : 'banner was hidden');
  if (c.unlocked && got?.locked) problems.push('page scroll still locked');
  const jar = c.cookies?.[c.mode];
  if (jar) {
    const have = new Set(got?.cookies || []);
    const stayed = (jar.gone || []).filter((n) => have.has(n));
    const lost = (jar.kept || []).filter((n) => !have.has(n));
    if (stayed.length) problems.push(`tracking cookies left: ${stayed.join(', ')}`);
    if (lost.length) problems.push(`cookies wrongly deleted: ${lost.join(', ')}`);
  }
  return problems;
}
