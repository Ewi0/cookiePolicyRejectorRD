// Fixture expectations shared by the Chrome (e2e.mjs) and Firefox (firefox-e2e.mjs) runners.
// clicked: controls the page saw pressed, in order. visible: banner still on screen.
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
];

// Every answered banner must reach the lifetime tally (both modes, plus the paused run).
export const TALLY = { reject: 10, accept: 13, hide: 3 };

const RULES = readFileSync(new URL('../extension/content/rules.js', import.meta.url), 'utf8');

/** Evaluated in any page: how many selectors rules.js uses, and which ones this browser cannot parse.
 *  A selector that does not parse fails silently at runtime, so its rule would never fire. */
export const SELECTOR_PROBE = `(() => {
  const g = {};
  new Function('globalThis', ${JSON.stringify(RULES)})(g);
  const all = [];
  for (const r of g.CPR.rules) {
    all.push(r.detect, r.root, ...(r.hide || []));
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
  const locked = [document.documentElement, document.body].some((e) => /hidden|clip/.test(getComputedStyle(e).overflowY));
  return JSON.stringify({ clicked: (window.__cpr && window.__cpr.clicked) || [], visible: seen(banner), locked });
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
  await sleep(400); // catch late extra clicks
  got = (await probe().catch(() => null)) || got;
  const problems = [];
  if (!same(got?.clicked, expected)) problems.push(`pressed ${JSON.stringify(got?.clicked)}, expected ${JSON.stringify(expected)}`);
  if (got?.visible !== Boolean(c.visible)) problems.push(got?.visible ? 'banner still visible' : 'banner was hidden');
  if (c.unlocked && got?.locked) problems.push('page scroll still locked');
  return problems;
}
