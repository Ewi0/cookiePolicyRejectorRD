// Packages extension/ for each store.
//   dist/chrome/   + cookie-policy-rejector-chrome-<v>.zip    Chrome, Edge, Brave, Opera, Arc, Vivaldi
//   dist/firefox/  + cookie-policy-rejector-firefox-<v>.zip   Firefox desktop + Firefox for Android (AMO)
// Safari (macOS + iOS) builds from safari/ in Xcode, which references extension/ directly.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = `${root}extension`;
const dist = `${root}dist`;
const manifest = JSON.parse(readFileSync(`${src}/manifest.json`, 'utf8'));
const version = manifest.version;

// Firefox wants an add-on id, event-page background scripts and (since 2025) a data-collection declaration.
const GECKO_ID = process.env.GECKO_ID || 'cookie-policy-rejector@cookiepolicyrejector';

execFileSync(process.execPath, [`${root}scripts/gen-prehide.mjs`], { stdio: 'inherit' });
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

function pack(target, transform) {
  const out = `${dist}/${target}`;
  cpSync(src, out, { recursive: true, filter: (p) => !/\.DS_Store$/.test(p) });
  writeFileSync(`${out}/manifest.json`, `${JSON.stringify(transform(structuredClone(manifest)), null, 2)}\n`);
  const zip = `cookie-policy-rejector-${target}-${version}.zip`;
  execFileSync('zip', ['-qrX', `../${zip}`, '.'], { cwd: out });
  console.log(`dist/${zip}`);
}

pack('chrome', (m) => m);

pack('firefox', (m) => {
  delete m.minimum_chrome_version;
  m.background = { scripts: ['background.js'] };
  m.browser_specific_settings = {
    gecko: { id: GECKO_ID, strict_min_version: '128.0', data_collection_permissions: { required: ['none'] } },
    gecko_android: { strict_min_version: '128.0' },
  };
  return m;
});
