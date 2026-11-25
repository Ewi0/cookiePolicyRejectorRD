// What refuse mode deletes from the site's cookie jar (content/cookies.js), without a browser.
// Deleting and the stored-consent formats are checked against real cookies by e2e.mjs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadContent } from './load.mjs';

const { TRACKERS, tcfConsents } = loadContent('cookies.js').cookies;

/** A TCF v2 core string with the given purpose consents (1-based), base64url like real CMPs write it. */
function tcString(purposes) {
  const bits = new Array(230).fill(0);
  const put = (at, width, value) => { for (let i = 0; i < width; i++) bits[at + i] = (value >> (width - 1 - i)) & 1; };
  put(0, 6, 2); // version
  put(78, 12, 10); // CMP id, so the string is not all zeros
  for (const p of purposes) bits[152 + p - 1] = 1;
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8).join('').padEnd(8, '0'), 2));
  return Buffer.from(bytes).toString('base64url');
}

test('tracking cookies of the common analytics and ad tools are recognised', () => {
  for (const name of ['_ga', '_ga_ABC123XYZ', '_gid', '_gat_UA-1234-1', '_gcl_au', '_fbp', '_fbc', '_uetsid', '_uetvid', '_clck',
    '_hjSessionUser_123456', '_ttp', '__hstc', 'hubspotutk', 'ajs_anonymous_id', 'mp_0123abcd_mixpanel', '_pk_id.1.1fff',
    'AMCV_1234%40AdobeOrg', '_shopify_y', '__qca', '_scid', '_rdt_uuid', '_ym_uid']) {
    assert.ok(TRACKERS.test(name), name);
  }
});

test('login, cart, language and consent cookies are never touched', () => {
  for (const name of ['session', 'sessionid', 'PHPSESSID', 'JSESSIONID', 'csrftoken', 'XSRF-TOKEN', 'cart', '_shopify_cart', 'cart_sig',
    'lang', 'locale', 'currency', 'OptanonConsent', 'OptanonAlertBoxClosed', 'CookieConsent', 'euconsent-v2', 'didomi_token',
    'cookieyes-consent', 'cmplz_marketing', '_gac', 'ga', '_game', '__cf_bm', 'cf_clearance', 'wordpress_logged_in_abc']) {
    assert.ok(!TRACKERS.test(name), name);
  }
});

test('a TCF string with any purpose consent is a stored "yes"', () => {
  assert.equal(tcfConsents(tcString([1, 2, 3, 4, 7, 9, 10])), true);
  assert.equal(tcfConsents(tcString([1])), true);
  assert.equal(tcfConsents(`${tcString([1, 3])}.YAAAAAAAAAAA`), true);
});

test('a TCF string that refuses every purpose, or garbage, is not', () => {
  assert.equal(tcfConsents(tcString([])), false);
  assert.equal(tcfConsents(''), false);
  assert.equal(tcfConsents('not a consent string at all, really not'), false);
  assert.equal(tcfConsents(undefined), false);
});
