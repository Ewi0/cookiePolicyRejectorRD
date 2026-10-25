// Renders the toolbar/store/app icons (white X or check on matte black) as PNGs.
// No dependencies: shapes are rasterised with supersampling and encoded with zlib.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [11, 11, 11];
const FG = [255, 255, 255];

const CRC = Int32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, tail]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A straight bar from a to b, `t` thick, with square (butt) ends. */
function bar([ax, ay], [bx, by], t) {
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  return (x, y) => {
    const along = (x - ax) * ux + (y - ay) * uy;
    const across = -(x - ax) * uy + (y - ay) * ux;
    return along >= 0 && along <= len && Math.abs(across) <= t / 2;
  };
}

// Same geometry as the popup mark (popup.css), in a 0..1 box.
function shapes(kind, t) {
  if (kind === 'x') return [bar([0.14, 0.14], [0.86, 0.86], t), bar([0.86, 0.14], [0.14, 0.86], t)];
  const v = [0.4, 0.76];
  const h = t / 2 / Math.SQRT2; // extend both legs past the vertex for a square outer corner
  return [bar([0.12, 0.48], [v[0] + h, v[1] + h], t), bar([v[0] - h, v[1] + h], [0.9, 0.26], t)];
}

/** Inside a rounded square inset by `margin`, with corner radius `radius` (unit coords). */
function roundedTile(x, y, margin, radius) {
  const lo = margin + radius;
  const hi = 1 - margin - radius;
  const dx = x < lo ? lo - x : x > hi ? x - hi : 0;
  const dy = y < lo ? lo - y : y > hi ? y - hi : 0;
  return x >= margin && x <= 1 - margin && y >= margin && y <= 1 - margin && dx * dx + dy * dy <= radius * radius;
}

/** Full-bleed black square, or with `tile` a macOS-style rounded tile on transparency. */
function render(size, kind, { pad, t, tile }) {
  const parts = shapes(kind, t);
  const ss = size <= 32 ? 8 : size <= 256 ? 4 : 3;
  const m = tile ? tile.margin : 0;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cover = 0;
      let mark = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const cx = (x + (sx + 0.5) / ss) / size;
          const cy = (y + (sy + 0.5) / ss) / size;
          if (tile && !roundedTile(cx, cy, tile.margin, tile.radius)) continue;
          cover++;
          // Mark coordinates are relative to the tile, then padded inside it.
          const u = ((cx - m) / (1 - 2 * m) - pad) / (1 - 2 * pad);
          const v = ((cy - m) / (1 - 2 * m) - pad) / (1 - 2 * pad);
          if (parts.some((inside) => inside(u, v))) mark++;
        }
      }
      const i = (y * size + x) * 4;
      const a = mark / Math.max(cover, 1);
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(FG[c] * a + BG[c] * (1 - a));
      px[i + 3] = Math.round((255 * cover) / (ss * ss));
    }
  }
  return encodePng(size, px);
}

const out = new URL('../extension/icons/', import.meta.url);
mkdirSync(out, { recursive: true });
// Small sizes get a fatter stroke and less padding so the mark survives 16 px.
const style = (size) => (size <= 16 ? { pad: 0.16, t: 0.19 } : size <= 48 ? { pad: 0.2, t: 0.16 } : { pad: 0.22, t: 0.14 });
for (const size of [16, 32, 48, 128]) writeFileSync(new URL(`x-${size}.png`, out), render(size, 'x', style(size)));
for (const size of [16, 32]) writeFileSync(new URL(`ok-${size}.png`, out), render(size, 'check', style(size)));

const art = new URL('../assets/', import.meta.url);
mkdirSync(art, { recursive: true });
const appIcon = render(1024, 'x', { pad: 0.26, t: 0.13 });
writeFileSync(new URL('app-icon-1024.png', art), appIcon);

// Safari app (Xcode project from safari-web-extension-converter): iOS gets the full-bleed
// square (the system rounds it), macOS the standard rounded tile on the 1024 grid.
const xc = new URL('../safari/Cookie%20Policy%20Rejector/Shared%20(App)/', import.meta.url);
const macTile = { pad: 0.24, t: 0.13, tile: { margin: 100 / 1024, radius: 185 / 1024 } };
try {
  writeFileSync(new URL('Assets.xcassets/AppIcon.appiconset/universal-icon-1024@1x.png', xc), appIcon);
  for (const s of [16, 32, 128, 256, 512]) {
    writeFileSync(new URL(`Assets.xcassets/AppIcon.appiconset/mac-icon-${s}@1x.png`, xc), render(s, 'x', s <= 32 ? { ...macTile, pad: 0.2, t: 0.16 } : macTile));
    writeFileSync(new URL(`Assets.xcassets/AppIcon.appiconset/mac-icon-${s}@2x.png`, xc), render(s * 2, 'x', macTile));
  }
  writeFileSync(new URL('Assets.xcassets/LargeIcon.imageset/x-128.png', xc), render(128, 'x', macTile));
  writeFileSync(new URL('Resources/Icon.png', xc), render(256, 'x', macTile));
  console.log('icons written (extension, assets/, Safari app)');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
  console.log('icons written (extension, assets/); no Safari project yet');
}
