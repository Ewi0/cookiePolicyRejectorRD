/* Cookie Policy Rejector — popup.
 * Outside the extension (opened as a file, or framed by mockups/) it renders demo data
 * from the query string: ?mode=accept&host=nytimes.com&cmp=OneTrust&total=2481&paused&touch */
'use strict';

const ext = globalThis.browser ?? globalThis.chrome;
const live = Boolean(ext?.storage?.local && ext?.tabs?.query);
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

const COPY = {
  reject: { headline: 'REFUSED EVERYTHING.', sub: 'EVERY BANNER ANSWERED NO. BEFORE YOU SEE IT.' },
  accept: { headline: 'APPROVED EVERYTHING.', sub: 'EVERY BANNER ANSWERED YES. BEFORE YOU SEE IT.' },
};
const VERB = { reject: 'REFUSED', accept: 'APPROVED', hide: 'HIDDEN' };

let state = { mode: 'reject', paused: false, host: 'example.com', log: [], total: 0 };

const root = document.documentElement;
root.classList.add('no-anim');
if (params.has('touch') || matchMedia('(pointer: coarse)').matches) root.classList.add('touch');

function hostOf(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}
const sum = (stats = {}) => Object.values(stats).reduce((a, b) => a + (Number(b) || 0), 0);

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
    host,
    log,
    total: sum(store.stats),
  };
}

function demo() {
  const mode = params.get('mode') === 'accept' ? 'accept' : 'reject';
  return {
    mode,
    paused: params.has('paused'),
    host: params.has('host') ? params.get('host') : 'example.com',
    log: (params.get('cmp') || '').split(',').filter(Boolean).map((cmp) => ({ cmp, action: params.get('action') || mode })),
    total: Number(params.get('total') || 0),
  };
}

function detail() {
  if (!state.host) return 'BROWSER PAGES ARE OFF LIMITS.';
  if (state.paused) return 'BANNERS SHOW NORMALLY HERE.';
  if (!state.log.length) return 'NO BANNER ON THIS PAGE.';
  const names = [...new Set(state.log.map((e) => e.cmp.toUpperCase()))].join(' + ');
  return `${names} — ${VERB[state.log[state.log.length - 1].action] || 'HANDLED'}`;
}

function render() {
  const { mode, paused, host, log, total } = state;
  const idle = !host;
  document.body.dataset.mode = mode;
  document.body.toggleAttribute('data-paused', paused);
  document.body.toggleAttribute('data-idle', idle);
  $('headline').textContent = paused ? 'PAUSED.' : COPY[mode].headline;
  $('sub').textContent = paused ? 'THIS SITE GETS ITS BANNERS BACK.' : COPY[mode].sub;
  $('status').textContent = idle ? '— IDLE' : paused ? '○ PAUSED' : '● ARMED';
  for (const b of document.querySelectorAll('.switch button')) {
    const on = b.dataset.mode === mode;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  }
  $('host').textContent = idle ? 'SYSTEM PAGE' : host.toUpperCase();
  $('count').textContent = String(log.length).padStart(2, '0');
  $('detail').textContent = detail();
  const pause = $('pause');
  pause.disabled = idle;
  pause.setAttribute('aria-pressed', String(paused));
  pause.textContent = paused ? 'RESUME ON THIS SITE' : 'PAUSE ON THIS SITE';
  $('total').textContent = total.toLocaleString('en-US');
  $('noun').textContent = total === 1 ? 'BANNER' : 'BANNERS';
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
$('pause').addEventListener('click', togglePause);

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
