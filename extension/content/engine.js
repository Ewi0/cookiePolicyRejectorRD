/* Cookie Policy Rejector — consent engine.
 * Runs in every frame at document_start. Known CMPs are pre-hidden by prehide.css
 * and answered through rules.js; anything else is found by its wording (patterns.js),
 * hidden before it paints, and answered by pressing the matching button. */
(() => {
  'use strict';
  const CPR = globalThis.CPR;
  const html = document.documentElement;
  if (!CPR?.rules || !CPR.patterns || CPR.engine || !(html instanceof HTMLElement)) return;
  CPR.engine = true;

  const ext = globalThis.browser ?? globalThis.chrome;
  const P = CPR.patterns;
  const isTop = window === window.top;
  const site = siteKey();
  const MAX_TEXT = 5000;
  const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head', 'title', 'textarea', 'select', 'option', 'iframe']);
  const CLICKABLE = 'button, a, [role="button"], [role="link"], input[type="button"], input[type="submit"], [onclick], [tabindex]:not([tabindex="-1"]), [class*="btn" i], [class*="button" i]';
  const TEXT_INPUTS = 'input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="number"], textarea';
  const RULES = CPR.rules.filter(ruleApplies);
  const KNOWN = RULES.filter((r) => r.conceal !== false).flatMap((r) => [r.detect, ...(r.hide || [])]).join(', ');

  let mode = 'reject';
  let paused = false;
  let running = false;
  let observer = null;
  let timers = [];
  let watchUntil = 0;
  let knownQueued = false;
  let flow = null; // generic multi-layer answer in progress: { root, layers }
  let userOpenedAt = 0;
  let debug = false; // storage.local.debug = true → decisions go to the page console
  const done = new Set();
  const busy = new Set();
  const seenRoots = new WeakSet();
  const misses = new WeakMap();
  const pending = new Map(); // root → time after which we stop waiting for its buttons
  const concealed = new Map();
  const log = [];

  // ---------- small helpers ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const dbg = (...args) => debug && console.debug('[CPR]', ...args);
  const describe = (el) => `${el.localName}${el.id ? `#${el.id}` : ''}${typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''} "${(el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)}"`;
  /** Rendered text of `root`, through shadow roots, stopping once past `cap` characters.
   *  Collapsed FAQ answers and hidden vendor lists do not count. */
  function deepText(root, cap = MAX_TEXT + 1) {
    let s = '';
    const walk = (r) => {
      const w = document.createTreeWalker(r, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.nodeType === 1 && (SKIP_TAGS.has(n.localName) || getComputedStyle(n).display === 'none')
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      for (let n = w.nextNode(); n && s.length < cap; n = w.nextNode()) {
        if (n.nodeType === 3) s += n.data;
        else if (n.shadowRoot) walk(n.shadowRoot);
      }
    };
    if (root.shadowRoot) walk(root.shadowRoot);
    walk(root);
    return s.replace(/\s+/g, ' ');
  }
  const textLen = (el) => deepText(el).length;
  // Consent UIs sometimes live in their own (large) iframe; ads and widgets are small.
  const genericHere = () => isTop || (innerWidth >= 300 && innerHeight >= 150);
  async function waitFor(fn, timeout) {
    const end = Date.now() + timeout;
    for (;;) {
      const v = fn();
      if (v) return v;
      if (Date.now() >= end) return null;
      await sleep(100);
    }
  }
  function send(msg) {
    try { ext?.runtime?.sendMessage(msg)?.catch?.(() => {}); } catch { /* context gone after an update */ }
  }
  function siteKey() {
    let host = location.hostname;
    if (!isTop) {
      const anc = location.ancestorOrigins;
      try { host = new URL(anc?.length ? anc[anc.length - 1] : document.referrer).hostname; } catch { /* keep own host */ }
    }
    return host.replace(/^www\./, '');
  }
  function ruleApplies(rule) {
    if (rule.frame === true ? isTop : rule.frame !== 'any' && !isTop) return false;
    return !rule.url || rule.url.test(location.href);
  }

  // ---------- DOM: shadow-aware queries and visibility ----------
  function shadowOf(el) {
    if (el.shadowRoot) return el.shadowRoot;
    if (!el.localName.includes('-')) return null;
    try { return ext?.dom?.openOrClosedShadowRoot?.(el) ?? el.openOrClosedShadowRoot ?? null; } catch { return null; }
  }
  function shadowRootsIn(root) {
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const s = shadowOf(n); if (s) out.push(s); }
    return out;
  }
  function qsa(root, sel) {
    try { return [...root.querySelectorAll(sel)]; } catch { return []; }
  }
  function deepAll(sel, root, out = []) {
    out.push(...qsa(root, sel));
    const own = root.nodeType === 1 ? shadowOf(root) : null;
    for (const s of own ? [own, ...shadowRootsIn(root)] : shadowRootsIn(root)) deepAll(sel, s, out);
    return out;
  }
  const queryAll = (sel, deep) => (deep ? deepAll(sel, document) : qsa(document, sel));
  function closestDeep(el, sel) {
    for (let n = el; n;) {
      try { const hit = n.closest(sel); if (hit) return hit; } catch { return null; }
      const r = n.getRootNode();
      n = r instanceof ShadowRoot ? r.host : null;
    }
    return null;
  }
  const parentOf = (el) => el.parentElement || (el.getRootNode() instanceof ShadowRoot ? el.getRootNode().host : null);
  const hasBox = (el) => { const r = el.getBoundingClientRect(); return r.width >= 2 && r.height >= 2; };
  function isShown(el) {
    if (!el?.isConnected || el.nodeType !== 1) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (cs.display !== 'contents') {
      if (el.checkVisibility && !el.checkVisibility()) return false;
      if (hasBox(el)) return true;
    }
    const kids = [...el.children, ...(el.shadowRoot ? el.shadowRoot.children : [])];
    return kids.some((k) => hasBox(k) && getComputedStyle(k).visibility !== 'hidden');
  }
  function coversViewport(el) {
    const r = el.getBoundingClientRect();
    return r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9;
  }

  // ---------- hiding (opacity keeps layout, so CMP scripts still see their UI) ----------
  const STYLE_KEYS = ['opacity', 'pointer-events', 'transition', 'display'];
  function conceal(el) {
    if (!el?.style || concealed.has(el)) return;
    concealed.set(el, STYLE_KEYS.map((k) => [el.style.getPropertyValue(k), el.style.getPropertyPriority(k)]));
    el.style.setProperty('transition', 'none', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
  }
  function forceHide(el) {
    if (!el?.style) return;
    conceal(el);
    el.style.setProperty('display', 'none', 'important');
  }
  function restoreAll() {
    for (const [el, saved] of concealed) {
      STYLE_KEYS.forEach((k, i) => (saved[i][0] ? el.style.setProperty(k, saved[i][0], saved[i][1]) : el.style.removeProperty(k)));
    }
    concealed.clear();
  }
  function unlockScroll(classes = [], force = false) {
    const els = [html, document.body].filter(Boolean);
    for (const el of els) for (const c of classes) el.classList.remove(c);
    if (!force) return;
    for (const el of els) {
      const y = getComputedStyle(el).overflowY;
      if (y === 'hidden' || y === 'clip') el.style.setProperty('overflow-y', el === html ? 'auto' : 'visible', 'important');
    }
    const body = document.body;
    if (body && getComputedStyle(body).position === 'fixed') {
      const top = parseInt(body.style.top, 10) || 0;
      body.style.setProperty('position', 'static', 'important');
      if (top) scrollTo(0, -top);
    }
  }

  // ---------- buttons ----------
  function press(el) {
    if (typeof el.click === 'function') el.click();
    else el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
  }
  function labelOf(el) {
    let raw = String((el instanceof HTMLInputElement ? el.value : el.innerText ?? el.textContent) || '').trim();
    if (raw.length < 2 && !/\p{L}/u.test(raw)) raw = el.getAttribute('aria-label') || el.getAttribute('title') || raw;
    return raw;
  }
  function safeAnchor(a) {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^javascript:/i.test(href) || a.getAttribute('role') === 'button') return true;
    try {
      const u = new URL(href, location.href);
      return u.origin === location.origin && u.pathname === location.pathname && u.search === location.search;
    } catch { return false; }
  }
  /** Sort the visible controls inside `box` by what pressing them would mean. */
  function classify(box) {
    const found = [];
    for (const el of deepAll(CLICKABLE, box)) {
      if (el.disabled || el.getAttribute('aria-disabled') === 'true' || !isShown(el)) continue;
      const raw = labelOf(el);
      if (!raw || raw.length > 80) continue;
      const label = P.norm(raw);
      let kind = null;
      if (P.close.test(raw.toLowerCase()) || (label && P.close.test(label))) kind = 'close';
      else if (!label || label.length > 60 || P.never.test(label)) continue;
      else if (P.reject.test(label)) kind = 'reject';
      else if (P.save.test(label)) kind = 'save';
      else if (P.accept.test(label)) kind = P.weak.test(label) ? 'weak' : 'accept';
      else if (P.settings.test(label)) kind = 'settings';
      if (!kind || (el.localName === 'a' && !safeAnchor(el))) continue;
      found.push({ el, kind });
    }
    const out = { reject: [], save: [], accept: [], weak: [], settings: [], close: [] };
    for (const f of found) {
      // Keep the innermost of nested matches; its click bubbles to the outer control.
      if (!found.some((g) => g !== f && f.el.contains(g.el))) out[f.kind].push(f.el);
    }
    return out;
  }
  function uncheckAll(box) {
    const pressed = [];
    for (const el of deepAll('input[type="checkbox"], [role="switch"], [role="checkbox"]', box)) {
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
      if (pressed.some((p) => p.contains(el) || el.contains(p))) continue;
      const on = el instanceof HTMLInputElement ? el.checked : el.getAttribute('aria-checked') === 'true';
      if (on) { press(el); pressed.push(el); }
    }
  }

  // ---------- reporting ----------
  function report(cmp, action) {
    log.push({ cmp, action });
    send({ type: 'cpr:handled', cmp, action });
  }
  function release() {
    if (!busy.size && !flow) html.setAttribute('data-cpr-done', '');
  }
  const userOpened = () => Date.now() - userOpenedAt < 5000;

  // ---------- known CMPs ----------
  function scanKnown() {
    knownQueued = false;
    for (const rule of RULES) {
      if (done.has(rule) || busy.has(rule)) continue;
      const el = queryAll(rule.detect, rule.shadow).find(isShown);
      if (el) runRule(rule, el);
    }
  }
  function queueKnown() {
    if (knownQueued) return;
    knownQueued = true;
    setTimeout(scanKnown, 60);
  }
  async function runRule(rule, el) {
    busy.add(rule);
    const root = (rule.root && closestDeep(el, rule.root)) || el;
    dbg('rule', rule.name, mode, describe(root));
    if (userOpened()) return finishRule(rule, null);
    if (rule.conceal !== false && rule.prehide === false) conceal(root);
    let action = null;
    if (rule.delegate) {
      unlockScroll(rule.unlock);
      if (!(await waitFor(() => !isShown(el), rule.delegate))) action = 'hide';
    } else {
      for (const plan of rule[mode] || []) {
        if (!isShown(el)) break;
        const pressed = await runPlan(rule, plan);
        // The host page usually tears a consent iframe down the instant it is answered.
        if (pressed && rule.frame === true) return finishRule(rule, mode);
        if (pressed && (await waitFor(() => !isShown(el), 2500))) break;
      }
      action = isShown(el) ? 'hide' : mode;
    }
    // Inside an iframe there is nothing useful to hide: the page-level rule hides the container.
    if (action === 'hide' && rule.frame === true) return finishRule(rule, null);
    if (action === 'hide' && rule.conceal !== false) {
      forceHide(root);
      for (const sel of rule.hide || []) queryAll(sel, rule.shadow).filter(isShown).forEach(forceHide);
    }
    unlockScroll(rule.unlock, action === 'hide');
    finishRule(rule, rule.delegate && action !== 'hide' ? null : action);
  }
  function finishRule(rule, action) {
    dbg('rule done', rule.name, action || '(nothing to report)');
    busy.delete(rule);
    done.add(rule);
    if (action) report(rule.name, action);
    release();
  }
  async function runPlan(rule, plan) {
    const steps = typeof plan === 'string' ? [{ click: plan }] : plan;
    for (let i = 0; i < steps.length; i++) {
      const ok = await runStep(rule, steps[i], i === 0 ? 400 : 3000, i === steps.length - 1);
      if (!ok && !steps[i].optional) return false;
    }
    return true;
  }
  async function runStep(rule, step, timeout, last) {
    const deep = Boolean(rule.shadow);
    let target = null;
    if (step.click) {
      target = await waitFor(() => queryAll(step.click, deep).find((e) => isShown(e) && !e.disabled), timeout);
    } else if (step.text) {
      target = await waitFor(() => {
        for (const box of queryAll(step.in, deep).filter(isShown)) {
          const c = classify(box);
          const hit = step.text === 'accept' ? c.accept[0] || c.weak[0] : c[step.text][0];
          if (hit) return hit;
        }
        return null;
      }, timeout);
    } else if (step.uncheck) {
      const box = await waitFor(() => queryAll(step.uncheck, deep).find(isShown), timeout);
      if (box) { uncheckAll(box); await sleep(200); }
      return Boolean(box);
    }
    if (target) {
      press(target);
      if (!last) await sleep(300);
    }
    return Boolean(target);
  }

  // ---------- everything else: find banners by their words ----------
  function walkText(root, onText, budget) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeType === 1 && SKIP_TAGS.has(n.localName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = w.nextNode(); n && budget.n-- > 0; n = w.nextNode()) {
      if (n.nodeType === 3) { if (n.data.length > 5 && P.topic.test(n.data)) onText(n); }
      else if (n.shadowRoot) walkText(n.shadowRoot, onText, budget);
    }
  }
  const isOverlay = (el, cs) => cs.position === 'fixed' || cs.position === 'sticky' || el.localName === 'dialog'
    || /^(alert)?dialog$/.test(el.getAttribute('role') || '') || el.getAttribute('aria-modal') === 'true';
  /** Climb from a sentence about cookies to the box that holds the banner. */
  function findRoot(start) {
    let named = null;
    for (let el = start, depth = 0; el && el !== document.body && el !== html && depth < 40; el = parentOf(el), depth++) {
      // A fixed app shell full of other content is not the banner; fall back to a named box inside it.
      if (isOverlay(el, getComputedStyle(el))) return textLen(el) <= MAX_TEXT ? widen(el) : named;
      const id = `${el.id} ${typeof el.className === 'string' ? el.className : ''}`;
      if (/cookie|consent|gdpr|privacy|cmp/i.test(id) && textLen(el) <= MAX_TEXT) named = el;
    }
    return named;
  }
  /** A dialog inside a full-screen wrapper that holds nothing else: hide the wrapper. */
  function widen(el) {
    const len = textLen(el);
    for (let i = 0; i < 4; i++) {
      const p = parentOf(el);
      if (!p || p === document.body || p === html || textLen(p) > len + 40) break;
      const cs = getComputedStyle(p);
      if (!isOverlay(p, cs) && !coversViewport(p)) break;
      el = p;
    }
    return el;
  }
  function qualifies(root, relaxed) {
    if (!isShown(root)) return null;
    const text = deepText(root);
    if (misses.get(root) === text.length) return null;
    const miss = (why) => { dbg('skip', why, describe(root)); misses.set(root, text.length); return null; };
    try { if (KNOWN && (root.matches(KNOWN) || root.closest(KNOWN) || root.querySelector(KNOWN))) return miss('known CMP'); } catch { /* bad selector */ }
    if (text.length > MAX_TEXT || text.trim().length < 20) return miss(`text length ${text.length}`);
    // Site navigation (a menu of links) or a search box: this is page chrome, not a banner.
    if (qsa(root, 'nav, [role="navigation"], [role="menubar"]').some((n) => qsa(n, 'a[href]').length >= 5)) return miss('navigation');
    if (qsa(root, '[role="search"]').length || qsa(root, TEXT_INPUTS).some(isShown)) return miss('form fields');
    const b = classify(root);
    if (b.reject.length + b.accept.length + b.weak.length) return b;
    if (relaxed && b.save.length + b.settings.length) return b;
    if (!pending.has(root)) { dbg('waiting for buttons', describe(root)); pending.set(root, Date.now() + 6000); }
    return null;
  }
  function alphaOf(color) {
    const m = color.match(/rgba\([^)]*,\s*([\d.]+)\)|\/\s*([\d.]+%?)\s*\)/);
    if (!m) return color === 'transparent' ? 0 : 1;
    const v = m[1] ?? m[2];
    return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
  }
  /** Dimming layers next to the banner (semi-transparent, full-screen, no content). */
  function backdropsOf(root) {
    const out = [];
    for (let el = root, i = 0; el?.parentElement && i < 3; el = el.parentElement, i++) {
      for (const sib of el.parentElement.children) {
        if (sib === el || concealed.has(sib) || (sib.textContent || '').trim().length > 20) continue;
        const cs = getComputedStyle(sib);
        const alpha = alphaOf(cs.backgroundColor);
        const dims = (alpha > 0 && alpha < 1) || (cs.backdropFilter && cs.backdropFilter !== 'none');
        if (/^(fixed|absolute)$/.test(cs.position) && dims && cs.backgroundImage === 'none' && coversViewport(sib) && isShown(sib)) out.push(sib);
      }
      if (el.parentElement === document.body) break;
    }
    return out;
  }
  function consider(root) {
    if (seenRoots.has(root)) return;
    if (flow) {
      if (root === flow.root || flow.root.contains(root)) return;
      if (qualifies(root, true)) { seenRoots.add(root); conceal(root); flow.layers.push(root); }
      return;
    }
    const b = qualifies(root, false);
    if (!b) return;
    pending.delete(root);
    seenRoots.add(root);
    if (!userOpened()) handleGeneric(root, b);
  }
  function scanGeneric(scope) {
    if (!scope || paused || !genericHere()) return;
    const starts = new Set();
    const budget = { n: 40000 };
    const visit = (t) => { const p = t.parentElement || t.parentNode?.host; if (p) starts.add(p); };
    if (scope.nodeType === 3) { if (P.topic.test(scope.data)) visit(scope); }
    else {
      if (scope.shadowRoot) walkText(scope.shadowRoot, visit, budget);
      walkText(scope, visit, budget);
    }
    const roots = new Set();
    for (const el of starts) { const r = findRoot(el); if (r) roots.add(r); }
    roots.forEach(consider);
  }
  async function handleGeneric(root, b) {
    conceal(root);
    const backdrops = backdropsOf(root);
    backdrops.forEach(conceal);
    const modal = backdrops.length > 0 || coversViewport(root) || root.getAttribute('aria-modal') === 'true' || root.localName === 'dialog';
    flow = { root, layers: [] };
    dbg('generic', mode, describe(root), Object.entries(b).filter(([, v]) => v.length).map(([k, v]) => `${k}:${v.length}`).join(' '));
    let action = 'hide';
    try { action = await answer(root, b); } catch (e) { dbg('generic failed', e); }
    const left = [root, ...flow.layers, ...backdrops].filter(isShown);
    left.forEach(forceHide);
    flow = null;
    if (modal) unlockScroll([], true);
    dbg('generic done', action);
    report('Generic', action);
    release();
  }
  async function answer(root, b) {
    if (mode === 'reject') {
      if (b.reject[0] && (await pressUntilGone(b.reject[0], root))) return 'reject';
      if (b.settings[0] && (await rejectViaSettings(root, b.settings[0]))) return 'reject';
      return 'hide';
    }
    const btn = b.accept[0] || ((root.textContent || '').length < 1200 ? b.weak[0] : null);
    return btn && (await pressUntilGone(btn, root)) ? 'accept' : 'hide';
  }
  async function pressUntilGone(btn, root) {
    for (const pause of [0, 500, 1200]) {
      if (pause) await sleep(pause);
      if (!isShown(root)) return true;
      if (!btn.isConnected) break;
      press(btn);
      if (await waitFor(() => !isShown(root), 900)) return true;
    }
    return !isShown(root);
  }
  async function rejectViaSettings(root, opener) {
    press(opener);
    const found = await waitFor(() => {
      scanGeneric(document.body); // settings layers are often revealed, not inserted
      for (const box of [...flow.layers, root]) {
        if (!isShown(box)) continue;
        const b = classify(box);
        if (b.reject.length || b.save.length) return { box, b };
      }
      return null;
    }, 3000);
    if (!found) return false;
    if (found.b.reject[0]) press(found.b.reject[0]);
    else {
      uncheckAll(found.box);
      await sleep(250);
      press(classify(found.box).save[0] || found.b.save[0]);
    }
    return Boolean(await waitFor(() => !isShown(root) && !flow.layers.some(isShown), 3000));
  }

  // ---------- lifecycle ----------
  function onMutations(records) {
    if (!running) return;
    let added = false;
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.nodeType === 1) {
          added = true;
          const t = n.textContent;
          if (t && t.length < 200000 && P.topic.test(t)) scanGeneric(n);
        } else if (n.nodeType === 3 && P.topic.test(n.data)) scanGeneric(n);
      }
    }
    if (added) queueKnown();
    const now = Date.now();
    for (const [root, until] of [...pending]) {
      if (!root.isConnected || now > until) pending.delete(root);
      else consider(root);
    }
  }
  function scanAll() {
    if (!running) return;
    scanKnown();
    scanGeneric(document.body);
  }
  function start() {
    if (running || paused) return;
    running = true;
    watchUntil = Date.now() + (isTop ? 30000 : 9000);
    scanAll();
    if (genericHere()) {
      observer = new MutationObserver(onMutations);
      observer.observe(html, { childList: true, subtree: true });
      document.addEventListener('DOMContentLoaded', scanAll, { once: true });
      addEventListener('load', () => { watchUntil = Math.max(watchUntil, Date.now() + 15000); scanAll(); }, { once: true });
    }
    const sweeps = isTop ? [250, 700, 1500, 2500, 4000, 6000, 9000, 13000, 19000, 25000, 32000, 40000] : [300, 800, 1600, 3000, 5000, 8000];
    for (const ms of sweeps) timers.push(setTimeout(() => Date.now() <= watchUntil && scanAll(), ms));
    timers.push(setTimeout(endWatch, isTop ? 30000 : 9000));
  }
  function endWatch() {
    if (Date.now() < watchUntil) { timers.push(setTimeout(endWatch, watchUntil - Date.now())); return; }
    stop();
    release();
  }
  function stop() {
    running = false;
    observer?.disconnect();
    observer = null;
    timers.forEach(clearTimeout);
    timers = [];
  }
  function applyPaused(next) {
    paused = next;
    if (paused) {
      stop();
      html.setAttribute('data-cpr-off', '');
      restoreAll();
    } else {
      html.removeAttribute('data-cpr-off');
      start();
    }
  }

  // The user asked for the consent UI ("Cookie settings" in a footer): stand back.
  addEventListener('click', (e) => {
    if (!e.isTrusted || !(e.target instanceof Element)) return;
    const t = e.target.closest('a, button, [role="button"], [onclick]');
    const label = t ? P.norm(labelOf(t)) : '';
    if (label && label.length < 60 && P.privacyLink.test(label)) {
      userOpenedAt = Date.now();
      html.setAttribute('data-cpr-done', '');
    }
  }, true);

  addEventListener('pageshow', (e) => {
    if (!e.persisted || !isTop) return;
    send({ type: 'cpr:page', paused });
    for (const entry of log) send({ type: 'cpr:handled', ...entry, replay: true });
  });

  ext?.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.debug) debug = Boolean(changes.debug.newValue);
    if (changes.mode) mode = changes.mode.newValue === 'accept' ? 'accept' : 'reject';
    if (changes.paused) {
      const next = Boolean(site && changes.paused.newValue?.[site]);
      if (next !== paused) {
        applyPaused(next);
        if (isTop) send({ type: 'cpr:state', paused: next });
      }
    }
  });

  (async () => {
    let cfg = {};
    try { cfg = (await ext.storage.local.get({ mode: 'reject', paused: {}, debug: false })) || {}; } catch { /* storage unavailable */ }
    mode = cfg.mode === 'accept' ? 'accept' : 'reject';
    debug = Boolean(cfg.debug);
    const isPaused = Boolean(site && cfg.paused?.[site]);
    if (isTop) send({ type: 'cpr:page', paused: isPaused });
    applyPaused(isPaused);
  })();
})();
