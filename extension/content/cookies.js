/* Cookie Policy Rejector — what refuse mode does to the cookies themselves.
 *
 * Answering a banner "no" only helps if the site honours it, and only for the visit that shows the
 * banner. Two gaps stay open without this file:
 *   1. An earlier "yes" (given before the extension was installed, or in approve mode) is stored by
 *      the consent platform, so the banner never comes back and the site keeps tracking.
 *      revokeStale() finds such a stored "yes" and deletes it at document_start, before the consent
 *      script reads it: the banner shows again and the engine refuses it.
 *   2. Some sites set analytics and ad cookies whatever the answer. sweep() deletes well-known
 *      tracking cookies from the page's own cookie jar, and guard() keeps doing it while the page is open.
 * Nothing here touches login, cart, language or consent-refusal cookies: only the names listed below. */
var CPR = globalThis.CPR || (globalThis.CPR = {});

(() => {
  // Analytics and advertising cookies that scripts set in the site's own (first-party) jar.
  const TRACKERS = new RegExp(`^(?:${[
    '_ga', '_ga_[A-Z0-9]+', '_gid', '_gat(?:_.+)?', '_gac_.+', '_gcl_(?:au|aw|dc|gb|gf|ha|gs)', '__utm[abctvz]', '_dc_gtm_.+', // Google
    '_fbp', '_fbc', // Meta
    '_uetsid', '_uetvid', '_uetmsclkid', 'MUIDB', // Microsoft Ads
    '_clck', '_clsk', // Microsoft Clarity
    '_hjSessionUser_\\d+', '_hjSession_\\d+', '_hjid', '_hjFirstSeen', '_hjIncludedInSessionSample(?:_\\d+)?', '_hjAbsoluteSessionInProgress', '_hjTLDTest', // Hotjar
    '_pin_unauth', '_pinterest_ct_ua', '_epik', // Pinterest
    '_ttp', '_tt_enable_cookie', 'ttcsid(?:_[A-Z0-9]+)?', // TikTok
    '_scid', '_scid_r', '_sctr', '_screload', // Snap
    '_rdt_uuid', '_rdt_cid', // Reddit
    '_twclid', 'twclid', // X
    '_li_ss', '_lc2_fpi', '_lc2_fpi_meta', 'li_fat_id', // LinkedIn first-party
    '__hstc', '__hssc', '__hssrc', 'hubspotutk', // HubSpot
    '_mkto_trk', // Marketo
    'ajs_anonymous_id', 'ajs_user_id', // Segment
    'mp_[0-9a-f]+_mixpanel', 'amplitude_id_.+', 'AMP_[0-9a-f]+', 'AMP_MKTG_[0-9a-f]+', // product analytics
    '_hp2_id\\..+', '_hp2_ses_props\\..+', // Heap
    '_pk_id\\..+', '_pk_ses\\..+', '_pk_ref\\..+', // Matomo
    '_sp_id\\..+', '_sp_ses\\..+', // Snowplow
    's_cc', 's_sq', 's_vi', 's_fid', 's_ppv', 'AMCV_.+', 'AMCVS_.+', // Adobe
    '_cb', '_cb_svref', '_chartbeat2', '_chartbeat4', // Chartbeat
    '__qca', // Quantcast measure
    '_parsely_session', '_parsely_visitor', // Parse.ly
    '_vwo_uuid(?:_v2)?', '_vwo_ds', '_vwo_sn', '_vis_opt_s', '_vis_opt_test_cookie', // VWO
    '_ym_uid', '_ym_d', '_ym_isad', '_ym_visorc', // Yandex Metrica
    '_shopify_y', '_shopify_s', '_shopify_sa_t', '_shopify_sa_p', // Shopify analytics (not the cart)
    '_lfa', '_gd\\d+', '_omappvp', '_omappvs', '_ce\\.s', '_ce\\.clock_data', 'cebs', 'cebsp_', // misc. analytics
    '_tq_id\\.TV-.+', '_yjsu_yjad', '_awl',
  ].join('|')})$`);

  // ---------- reading and deleting ----------
  const decode = (v) => { try { return decodeURIComponent(v); } catch { return v; } };
  function jar() {
    const out = new Map();
    for (const part of document.cookie ? document.cookie.split(/;\s*/) : []) {
      const i = part.indexOf('=');
      if (i > 0) out.set(part.slice(0, i).trim(), decode(part.slice(i + 1)));
    }
    return out;
  }
  /** Every domain a script on this page could have set a cookie for: host-only, the host, its parents. */
  function domains() {
    const parts = location.hostname.split('.');
    const out = [''];
    if (/^[\d.]+$|:/.test(location.hostname)) return out; // IP address: host-only cookies only
    for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'));
    return out;
  }
  /** The page's path and every parent, with and without a trailing slash (a script's default cookie path). */
  function paths() {
    const out = new Set(['/']);
    for (let p = location.pathname; p.length > 1;) {
      out.add(p);
      p = p.endsWith('/') ? p.slice(0, -1) : p.slice(0, p.lastIndexOf('/')) || '/';
    }
    return [...out];
  }
  /** Deletes the cookie `name` wherever this page can see it. Returns true if it is gone. */
  function expire(name) {
    const secure = location.protocol === 'https:' ? '; secure' : '';
    for (const d of domains()) {
      for (const p of paths()) {
        try {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=${p}${d ? `; domain=${d}` : ''}${secure}`;
        } catch { /* sandboxed document: no cookie access */ }
      }
    }
    return !jar().has(name);
  }
  function dropStorage(keys) {
    for (const area of ['localStorage', 'sessionStorage']) {
      for (const k of keys) { try { globalThis[area]?.removeItem(k); } catch { /* storage blocked here */ } }
    }
  }
  const stored = (key) => { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } };

  // ---------- a stored "yes" ----------
  /** IAB TCF v2 consent string: true if any purpose has consent. */
  function tcfConsents(tc) {
    const core = String(tc || '').trim().split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    if (core.length < 30) return false;
    let bin;
    try { bin = atob(core); } catch { return false; }
    const bit = (i) => (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
    let version = 0;
    for (let i = 0; i < 6; i++) version = (version << 1) | bit(i);
    if (version !== 2 || bin.length < 22) return false;
    // Core segment: purpose consents are bits 152–175 (after created, updated, CMP, screen, language,
    // vendor-list and policy versions, the two flags and the special-feature opt-ins).
    for (let i = 152; i < 176; i++) if (bit(i)) return true;
    return false;
  }
  const json = (s) => { try { return JSON.parse(s); } catch { return null; } };
  const b64json = (s) => { try { return JSON.parse(atob(String(s).replace(/-/g, '+').replace(/_/g, '/'))); } catch { return json(s); } };

  /** Each entry: does the jar hold a "yes" from this platform, and what to delete so it asks again. */
  const STALE = [
    {
      name: 'OneTrust',
      yes: (c) => c.has('OptanonAlertBoxClosed') && (/(?:^|&)groups=([^&]*)/.exec(c.get('OptanonConsent') || '')?.[1] || '')
        .split(',').some((g) => { const [id, v] = g.split(':'); return v === '1' && !/^(?:C0001|1|BG\d+)$/.test(id); }),
      cookies: ['OptanonConsent', 'OptanonAlertBoxClosed', 'eupubconsent-v2', 'euconsent-v2'],
    },
    {
      name: 'Cookiebot',
      yes: (c) => /(?:preferences|statistics|marketing):true/.test(c.get('CookieConsent') || ''),
      cookies: ['CookieConsent', 'CookieConsentBulkSetting', 'CookieConsentBulkTicket'],
    },
    {
      name: 'CookieYes',
      yes: (c) => /(?:functional|analytics|performance|advertisement|other):yes/.test(c.get('cookieyes-consent') || '')
        || [...c].some(([k, v]) => /^cookielawinfo-checkbox-(?!necessary)/.test(k) && v === 'yes'),
      cookies: (c) => [...c.keys()].filter((k) => k === 'cookieyes-consent' || k === 'viewed_cookie_policy' || k === 'CookieLawInfoConsent' || k.startsWith('cookielawinfo-checkbox-')),
    },
    {
      name: 'Complianz',
      yes: (c) => ['cmplz_marketing', 'cmplz_statistics', 'cmplz_preferences'].some((k) => c.get(k) === 'allow'),
      cookies: (c) => [...c.keys()].filter((k) => k.startsWith('cmplz_')),
    },
    {
      name: 'Borlabs',
      yes: (c) => {
        const v = json(c.get('borlabs-cookie') || '');
        return Boolean(v?.consents && Object.entries(v.consents).some(([k, list]) => k !== 'essential' && Array.isArray(list) && list.length));
      },
      cookies: ['borlabs-cookie'],
    },
    {
      name: 'iubenda',
      yes: (c) => [...c].some(([k, v]) => {
        if (!/^_iub_cs-\d+$/.test(k)) return false;
        const p = json(v);
        return Boolean(p && (p.consent === true || Object.entries(p.purposes || {}).some(([id, on]) => id !== '1' && on === true)));
      }),
      cookies: (c) => [...c.keys()].filter((k) => /^_iub_cs-/.test(k)),
    },
    {
      name: 'Didomi',
      yes: (c) => {
        const t = b64json(c.get('didomi_token') || stored('didomi_token') || '');
        return Boolean(t?.purposes?.enabled?.length || t?.vendors?.enabled?.length);
      },
      cookies: ['didomi_token', 'euconsent-v2'],
      storage: ['didomi_token', 'euconsent-v2'],
    },
    {
      name: 'Google Funding Choices',
      yes: (c) => tcfConsents(/\b(C[A-Za-z0-9_-]{30,}(?:\.[A-Za-z0-9_-]+)*)/.exec(c.get('FCCDCF') || '')?.[1]),
      cookies: ['FCCDCF', 'FCNEC'],
    },
    {
      name: 'IAB TCF',
      yes: (c) => tcfConsents(c.get('euconsent-v2')) || tcfConsents(stored('euconsent-v2')),
      cookies: ['euconsent-v2', 'addtl_consent'],
      storage: ['euconsent-v2', 'addtl_consent'],
    },
  ];

  /** Deletes every stored "yes" it recognises, except for platforms `skip` names. Returns the platforms it reset. */
  function revokeStale(skip = () => false) {
    const c = jar();
    const reset = [];
    for (const s of STALE) {
      if (skip(s.name)) continue;
      let yes = false;
      try { yes = s.yes(c); } catch { /* malformed value: leave it */ }
      if (!yes) continue;
      for (const name of typeof s.cookies === 'function' ? s.cookies(c) : s.cookies) if (c.has(name)) expire(name);
      if (s.storage) dropStorage(s.storage);
      reset.push(s.name);
    }
    return reset;
  }

  // ---------- tracking cookies ----------
  let last = null;
  /** Deletes known tracking cookies. Returns the names it removed. */
  function sweep() {
    const raw = document.cookie;
    if (raw === last) return [];
    const removed = [];
    for (const name of jar().keys()) if (TRACKERS.test(name) && expire(name)) removed.push(name);
    last = document.cookie;
    return removed;
  }

  let timer = 0;
  let onChange = null;
  /** Keeps tracking cookies out while the page is open: at once, on every cookie change the browser
   *  reports (Cookie Store API), and on a light poll for browsers without it. */
  function guard(on, report = () => {}) {
    clearTimeout(timer);
    timer = 0;
    const store = globalThis.cookieStore;
    if (onChange) { try { store?.removeEventListener('change', onChange); } catch { /* gone */ } onChange = null; }
    if (!on) return;
    const run = () => {
      let r = [];
      try { r = sweep(); } catch { /* a sandboxed document has no cookies */ }
      if (r.length) report(r);
    };
    run();
    if (store?.addEventListener) {
      onChange = (e) => { if (e.changed?.some((x) => TRACKERS.test(x.name))) run(); };
      try { store.addEventListener('change', onChange); } catch { onChange = null; }
    }
    const started = Date.now();
    const tick = () => { run(); timer = setTimeout(tick, Date.now() - started < 30000 ? 1000 : 5000); };
    timer = setTimeout(tick, 1000);
  }

  CPR.cookies = { TRACKERS, revokeStale, sweep, guard, tcfConsents };
})();
