// Renders the Chrome Web Store images from store/assets.html, around the real popup: screenshots
// (1280×800), the small promo tile (440×280), the marquee (1400×560), plus the 128 px store icon.
// Also refreshes the README images in assets/screenshots/ (the popup, and the full mockups board).
//   node scripts/store-assets.mjs          → dist/store/        CHROME_PATH to override
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './chrome.mjs';
import { serve } from './serve.mjs';

const OUT = fileURLToPath(new URL('../dist/store/', import.meta.url));
const SHOTS = new URL('../assets/screenshots/', import.meta.url);
const PORT = 4176;
const ASSETS = [
  ['screenshot-1-refuse', 1280, 800],
  ['screenshot-2-approve', 1280, 800],
  ['screenshot-3-private', 1280, 800],
  ['screenshot-4-languages', 1280, 800],
  ['promo-small-440x280', 440, 280],
  ['promo-marquee-1400x560', 1400, 560],
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await serve(PORT);
  const browser = await launch({ extension: false });
  try {
    for (const [name, width, height] of ASSETS) {
      const page = await browser.open(`http://127.0.0.1:${PORT}/store/assets.html?asset=${name}`, { width, height });
      await sleep(1500); // the popups load their translations
      writeFileSync(`${OUT}${name}.png`, await page.screenshot());
      await page.close();
      console.log(`dist/store/${name}.png`);
    }
    copyFileSync(new URL('../extension/icons/x-128.png', import.meta.url), `${OUT}icon-128.png`);
    console.log('dist/store/icon-128.png');

    const popup = await browser.open(`http://127.0.0.1:${PORT}/extension/popup/popup.html?host=lemonde.fr&cmp=Didomi&total=2481`, { width: 360, height: 560 });
    await sleep(800);
    writeFileSync(new URL('chrome-popup.png', SHOTS), await popup.screenshot());
    await popup.close();
    console.log('assets/screenshots/chrome-popup.png');

    // The whole board: measure it at full width, then grow the viewport to its height.
    const board = await browser.open(`http://127.0.0.1:${PORT}/mockups/`, { width: 1440, height: 900 });
    await sleep(2500);
    const height = Math.ceil(await board.eval('document.documentElement.scrollHeight'));
    await browser.cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height, deviceScaleFactor: 1, mobile: false }, board.sessionId);
    await sleep(800);
    writeFileSync(new URL('mockups.png', SHOTS), await board.screenshot());
    await board.close();
    console.log(`assets/screenshots/mockups.png (1440×${height})`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
