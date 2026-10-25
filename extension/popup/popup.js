/* Cookie Policy Rejector — popup.
 * Outside the extension (served by npm run serve, or framed by mockups/) it renders demo data from
 * the query string: ?mode=accept&host=nytimes.com&cmp=OneTrust&total=2481&paused&noaccess&reload&touch&lang=de */
'use strict';

const ext = globalThis.browser ?? globalThis.chrome;
const live = Boolean(ext?.storage?.local && ext?.tabs?.query);
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const REPO = 'https://github.com/Ewi0/cookiePolicyRejectorRD';

const VERB = { reject: 'verbReject', accept: 'verbAccept', hide: 'verbHide' };

let messages = {}; // demo mode: _locales/<lang>/messages.json laid over English
/** The string for `key` in the user's language, or '' if no locale has it. */
const msg = (key) => (live ? ext.i18n.getMessage(key) : messages[key]?.message) || '';
const t = (key) => msg(key) || key;
// Missing in older Safari: the popup then assumes access, as before.
const canAsk = !live || typeof ext.permissions?.request === 'function';

let state = { mode: 'reject', paused: false, access: true, running: true, host: 'example.com', tabId: null, log: [], total: 0 };

const root = document.documentElement;
root.classList.add('no-anim');
if (params.has('touch') || matchMedia('(pointer: coarse)').matches) root.classList.add('touch');

/** Static labels: text from data-i18n, accessible names from data-i18n-label. */
function translate() {
  root.lang = msg('lang') || 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-label]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nLabel));
    if (el.localName === 'a') el.title = t(el.dataset.i18nLabel);
  }
}
if (live) translate(); // before the first paint; demo mode waits for its messages

function hostOf(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}
const sum = (stats = {}) => Object.values(stats).reduce((a, b) => a + (Number(b) || 0), 0);

/** Is the engine running in this tab, and if not, does the browser let it in at all? Users can withhold
 *  site access (Chrome "on click", Firefox and Safari per-site permissions), and a page that loaded
 *  before the extension has no engine until it reloads. Either way nothing would get answered. */
async function probe(tab) {
  try {
    if (await ext.tabs.sendMessage(tab.id, { type: 'cpr:ping' })) return { access: true, running: true };
  } catch { /* nothing listening in that tab */ }
  if (!ext.permissions?.contains) return { access: true, running: false };
  const { protocol, hostname } = new URL(tab.url);
  try {
    return { access: await ext.permissions.contains({ origins: [`${protocol}//${hostname}/*`] }), running: false };
  } catch {
    return { access: true, running: false };
  }
}

async function load() {
  if (!live) return demo();
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  const host = hostOf(tab?.url);
  const store = await ext.storage.local.get({ mode: 'reject', paused: {}, stats: {} });
  let log = [];
  if (tab?.id != null) {
    try { log = (await ext.runtime.sendMessage({ type: 'cpr:tab', tabId: tab.id }))?.log || []; } catch { /* worker asleep */ }
  }
  return {
    mode: store.mode === 'accept' ? 'accept' : 'reject',
    paused: Boolean(host && store.paused[host]),
    ...(host ? await probe(tab) : { access: true, running: true }),
    host,
    tabId: tab?.id ?? null,
    log,
    total: sum(store.stats),
  };
}

async function demo() {
  const lang = (params.get('lang') || 'en').replace('-', '_');
  const read = (l) => fetch(`../_locales/${l}/messages.json`).then((r) => r.json()).catch(() => ({}));
  const [en, local] = await Promise.all([read('en'), lang === 'en' ? {} : read(lang)]);
  messages = { ...en, ...local };
  translate();
  const mode = params.get('mode') === 'accept' ? 'accept' : 'reject';
  return {
    mode,
    paused: params.has('paused'),
    access: !params.has('noaccess'),
    running: !params.has('noaccess') && !params.has('reload'),
    host: params.has('host') ? params.get('host') : 'example.com',
    tabId: null,
    log: (params.get('cmp') || '').split(',').filter(Boolean).map((cmp) => ({ cmp, action: params.get('action') || mode })),
    total: Number(params.get('total') || 0),
  };
}

function detail() {
  if (!state.host) return t('detailOffLimits');
  if (!state.access) return t(canAsk ? 'detailPaused' : 'detailNoAccessManual');
  if (state.paused || !state.running) return t('detailPaused');
  if (!state.log.length) return t('detailNone');
  const names = [...new Set(state.log.map((e) => e.cmp.toUpperCase()))].join(' + ');
  return `${names} — ${t(VERB[state.log[state.log.length - 1].action] || 'verbOther')}`;
}

/** The GitHub issue form for a site that misbehaves. Only the extension version goes along: nothing
 *  about the user or the page leaves the browser unless they type it into the form themselves. */
const reportUrl = () => `${REPO}/issues/new?template=site.yml&version=${live ? ext.runtime.getManifest().version : ''}`;

function renderTally(total) {
  const plural = new Intl.PluralRules(root.lang).select(total);
  const text = msg(`tally${plural[0].toUpperCase()}${plural.slice(1)}`) || t('tallyOther');
  const [before, after = ''] = text.split('{n}');
  const num = document.createElement('b');
  num.textContent = total.toLocaleString(root.lang);
  $('tally').replaceChildren(before, num, after);
}

function render() {
  const { mode, paused, host, log, total } = state;
  const idle = !host;
  // Not working on this page yet: no site access, or no engine in it (opened before the extension).
  const needs = idle ? '' : !state.access ? 'NoAccess' : !state.running ? 'Reload' : '';
  const look = needs || (paused ? 'Paused' : mode === 'accept' ? 'Accept' : 'Reject');
  document.body.dataset.mode = mode;
  document.body.toggleAttribute('data-paused', paused && !needs);
  document.body.toggleAttribute('data-idle', idle);
  if (needs) document.body.dataset.needs = needs;
  else delete document.body.dataset.needs;
  $('headline').textContent = t(`headline${look}`);
  $('sub').textContent = t(`sub${look}`);
  $('status').textContent = t(idle ? 'statusIdle' : needs ? `status${needs}` : paused ? 'statusPaused' : 'statusArmed');
  for (const b of document.querySelectorAll('.switch button')) {
    const on = b.dataset.mode === mode;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  }
  $('host').textContent = idle ? t('systemPage') : host.toUpperCase();
  $('count').textContent = String(log.length).padStart(2, '0');
  $('detail').textContent = detail();
  $('report').hidden = idle;
  const pause = $('pause');
  pause.disabled = idle || (needs === 'NoAccess' && !canAsk);
  if (needs) pause.removeAttribute('aria-pressed');
  else pause.setAttribute('aria-pressed', String(paused));
  pause.textContent = t(needs === 'NoAccess' ? 'allowAccess' : needs ? 'reloadPage' : paused ? 'resumeSite' : 'pauseSite');
  renderTally(total);
}

function setMode(mode) {
  if (mode === state.mode) return;
  state.mode = mode;
  render();
  if (live) ext.storage.local.set({ mode });
}

async function togglePause() {
  if (!state.host) return;
  state.paused = !state.paused;
  render();
  if (!live) return;
  const { paused } = await ext.storage.local.get({ paused: {} });
  if (state.paused) paused[state.host] = true;
  else delete paused[state.host];
  await ext.storage.local.set({ paused });
}

function allowAccess() {
  if (!live) return;
  // Firefox only shows its prompt when request() runs straight from the click, before any await.
  ext.permissions.request({ origins: ['<all_urls>'] }).then((granted) => {
    if (!granted) return;
    if (state.tabId != null) ext.tabs.reload(state.tabId);
    window.close();
  }).catch(() => {});
}

function reloadTab() {
  if (!live || state.tabId == null) return;
  ext.tabs.reload(state.tabId);
  window.close();
}

const modeSwitch = document.querySelector('.switch');
modeSwitch.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-mode]');
  if (b) setMode(b.dataset.mode);
});
modeSwitch.addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const next = state.mode === 'reject' ? 'accept' : 'reject';
  setMode(next);
  modeSwitch.querySelector(`[data-mode="${next}"]`).focus();
});
$('pause').addEventListener('click', () => (!state.access ? allowAccess() : !state.running ? reloadTab() : togglePause()));
$('report').href = reportUrl();
for (const link of [$('report'), $('donate')]) {
  link.addEventListener('click', (e) => {
    if (!live) return;
    e.preventDefault();
    ext.tabs.create({ url: link.href });
    window.close();
  });
}

if (live) {
  ext.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.stats) {
      state.total = sum(changes.stats.newValue);
      render();
    }
  });
}

load()
  .then((s) => { state = s; })
  .catch(() => {})
  .finally(() => {
    render();
    // Only animate the mark on user changes, not on open.
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-anim')));
  });
