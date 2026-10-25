/* Cookie Policy Rejector — background worker.
 * Keeps the lifetime tally, the per-tab list of answered banners (for the badge and
 * popup) and the toolbar icon that shows the current mode. */
const ext = globalThis.browser ?? globalThis.chrome;

const DEFAULTS = { mode: 'reject', paused: {}, stats: { reject: 0, accept: 0, hide: 0 } };
const ICONS = {
  reject: { 16: 'icons/x-16.png', 32: 'icons/x-32.png' },
  accept: { 16: 'icons/ok-16.png', 32: 'icons/ok-32.png' },
};
const tabLogs = new Map();
const session = ext.storage.session; // absent on older Safari: memory only
let statsQueue = Promise.resolve();
let logQueue = Promise.resolve();

const quiet = (p) => p?.catch?.(() => {});

async function getLog(tabId) {
  if (tabLogs.has(tabId)) return tabLogs.get(tabId);
  const key = `tab:${tabId}`;
  const saved = session ? (await session.get(key))[key] : null;
  const log = Array.isArray(saved) ? saved : [];
  tabLogs.set(tabId, log);
  return log;
}

function setLog(tabId, log) {
  tabLogs.set(tabId, log);
  if (session) quiet(session.set({ [`tab:${tabId}`]: log }));
}

// Messages from several frames can land together; apply them one at a time.
function updateLog(tabId, change) {
  logQueue = logQueue.then(async () => {
    const next = change(await getLog(tabId));
    setLog(tabId, next);
    return next;
  }).catch(() => null);
  return logQueue;
}

function paintBadge(tabId, log, paused) {
  const action = ext.action;
  if (!action || tabId == null) return;
  quiet(action.setBadgeText({ tabId, text: paused ? 'OFF' : log.length ? String(log.length) : '' }));
  quiet(action.setBadgeBackgroundColor({ tabId, color: paused ? '#5c5c5c' : '#000000' }));
  if (action.setBadgeTextColor) quiet(action.setBadgeTextColor({ tabId, color: '#ffffff' }));
}

async function paintIcon() {
  const { mode } = await ext.storage.local.get({ mode: DEFAULTS.mode });
  if (ext.action?.setIcon) quiet(ext.action.setIcon({ path: ICONS[mode] || ICONS.reject }));
}

function bumpStats(action) {
  statsQueue = statsQueue.then(async () => {
    const { stats } = await ext.storage.local.get({ stats: DEFAULTS.stats });
    stats[action] = (stats[action] || 0) + 1;
    await ext.storage.local.set({ stats });
  }).catch(() => {});
}

ext.runtime.onInstalled.addListener(async () => {
  const current = await ext.storage.local.get(null);
  await ext.storage.local.set({ ...DEFAULTS, ...current });
  paintIcon();
});

ext.runtime.onStartup?.addListener(paintIcon);

ext.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.mode) paintIcon();
});

ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  switch (msg?.type) {
    case 'cpr:page':
      if (tabId != null && sender.frameId === 0) {
        updateLog(tabId, () => []).then(() => paintBadge(tabId, [], msg.paused));
      }
      return false;
    case 'cpr:state':
      if (tabId != null) updateLog(tabId, (log) => log).then((log) => log && paintBadge(tabId, log, msg.paused));
      return false;
    case 'cpr:handled': {
      if (tabId == null) return false;
      const entry = { cmp: String(msg.cmp), action: String(msg.action) };
      updateLog(tabId, (log) => [...log, entry].slice(-20)).then((log) => log && paintBadge(tabId, log, false));
      if (!msg.replay && ['reject', 'accept', 'hide'].includes(msg.action)) bumpStats(msg.action);
      return false;
    }
    case 'cpr:tab':
      logQueue.then(() => getLog(msg.tabId)).then((log) => sendResponse({ log }));
      return true;
    default:
      return false;
  }
});

ext.tabs.onRemoved.addListener((tabId) => {
  tabLogs.delete(tabId);
  if (session) quiet(session.remove(`tab:${tabId}`));
});

paintIcon();
