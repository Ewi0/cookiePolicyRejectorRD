// Every translation in extension/_locales: complete, well formed, and within store limits.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const dir = new URL('../../extension/_locales/', import.meta.url);
const read = (path) => readFileSync(new URL(path, dir), 'utf8');
const LOCALES = Object.fromEntries(readdirSync(dir).map((code) => [code, JSON.parse(read(`${code}/messages.json`))]));
const EN = LOCALES.en;

// Keys the popup builds at runtime (`headline${look}` and friends); literal ones are read from the code.
const DYNAMIC = ['Reject', 'Accept', 'Paused', 'NoAccess', 'Reload'].flatMap((s) => [`headline${s}`, `sub${s}`])
  .concat(['statusArmed', 'statusPaused', 'statusIdle', 'statusNoAccess', 'statusReload'])
  .concat(['verbReject', 'verbAccept', 'verbHide', 'verbOther', 'tallyOther', 'lang']);
const PLURALS = ['tallyZero', 'tallyOne', 'tallyTwo', 'tallyFew', 'tallyMany'];
const OPTIONAL = new Set(['extName', ...PLURALS]); // a brand name, and plural forms a language may not need

function usedKeys() {
  const popupJs = readFileSync(new URL('../../extension/popup/popup.js', import.meta.url), 'utf8');
  const popupHtml = readFileSync(new URL('../../extension/popup/popup.html', import.meta.url), 'utf8');
  const manifest = readFileSync(new URL('../../extension/manifest.json', import.meta.url), 'utf8');
  const found = [
    ...popupJs.matchAll(/\b(?:t|msg)\('(\w+)'\)/g),
    ...popupHtml.matchAll(/data-i18n(?:-label)?="(\w+)"/g),
    ...manifest.matchAll(/__MSG_(\w+)__/g),
  ].map((m) => m[1]);
  return new Set([...found, ...DYNAMIC]);
}

/** Lower case without accents, in the language's own rules (Turkish dotted İ and dotless ı). */
const fold = (s, lang) => s.toLocaleLowerCase(lang).normalize('NFD').replace(/\p{M}/gu, '');

test('English has every key the popup and manifest use', () => {
  for (const key of usedKeys()) assert.ok(EN[key]?.message, `en is missing ${key}`);
});

test('every locale is complete and well formed', () => {
  const required = Object.keys(EN).filter((k) => !OPTIONAL.has(k));
  for (const [code, messages] of Object.entries(LOCALES)) {
    for (const [key, entry] of Object.entries(messages)) {
      assert.ok(key in EN, `${code}: unknown key ${key}`);
      assert.equal(typeof entry.message, 'string', `${code}.${key}`);
      assert.ok(entry.message.trim(), `${code}.${key} is empty`);
      assert.ok(!entry.message.includes('$'), `${code}.${key}: "$" starts a placeholder in messages.json`);
    }
    for (const key of required) assert.ok(messages[key], `${code} is missing ${key}`);
  }
});

test('lang matches the folder and is a valid language tag', () => {
  for (const [code, { lang }] of Object.entries(LOCALES)) {
    const expected = code === 'no' ? 'nb' : code.replace('_', '-'); // Chrome calls Norwegian Bokmål "no"
    assert.equal(lang.message, expected, code);
    assert.deepEqual(Intl.getCanonicalLocales(lang.message), [expected], code);
  }
});

test('the counter has one {n} in every plural form', () => {
  for (const [code, messages] of Object.entries(LOCALES)) {
    for (const key of ['tallyOther', ...PLURALS].filter((k) => messages[k])) {
      assert.equal(messages[key].message.split('{n}').length, 2, `${code}.${key}`);
    }
  }
});

test('store description fits the Chrome Web Store limit of 132 characters', () => {
  for (const [code, { extDescription }] of Object.entries(LOCALES)) {
    assert.ok([...extDescription.message].length <= 132, `${code}: ${[...extDescription.message].length} characters`);
  }
});

test('screen reader labels contain the visible link text (WCAG 2.5.3)', () => {
  for (const [code, messages] of Object.entries(LOCALES)) {
    const lang = messages.lang.message;
    for (const [visible, label] of [['report', 'reportLabel'], ['donate', 'donateLabel']]) {
      assert.ok(fold(messages[label].message, lang).includes(fold(messages[visible].message, lang)),
        `${code}: "${messages[label].message}" should contain "${messages[visible].message}"`);
    }
  }
});
