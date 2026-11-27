// Pre-rasterizes the repeating paper, card stock, tape and mottle grain tiles used by
// src/styles/paper.css and src/styles/stacked-card.css into lossless WebP files under
// public/grotto/.
//
//   node scripts/draw-paper-grains.mjs
//
// Doing the SVG <feTurbulence> evaluation once here keeps the exact fractal-noise tooth
// and seamless stitch edges while sparing the browser from re-running SVG noise filters
// during paint and scroll rasterization. Everything is seeded and lossless, so rerunning
// this script reproduces the committed files byte-for-byte.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const TARGET = 'public/grotto';
mkdirSync(TARGET, { recursive: true });

// SVG <filter> defaults to color-interpolation-filters="linearRGB", so convert each
// feColorMatrix linear tint channel to 8-bit sRGB once without premultiplied-alpha
// rounding noise on faint pixels.
const linearToSrgbByte = (c) =>
  Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);

/**
 * Each tile matches its original SVG <feTurbulence> + <feColorMatrix> definition.
 * Every visible pixel carries the exact constant sRGB tint and varies only in alpha, so
 * lossless WebP preserves the exact 2:1 dark-desk vs. dark-card alpha ratio and seamless
 * stitch edges in a few kilobytes.
 */
const TILES = [
  {
    name: 'paper-tooth-day.webp',
    width: 128,
    height: 128,
    baseFrequency: '.7',
    seed: 0,
    tintLinear: [0.5, 0.5, 0.5],
    alphaSlope: 0.4,
    alphaOffset: -0.14,
  },
  {
    name: 'paper-tooth-dark.webp',
    width: 128,
    height: 128,
    baseFrequency: '.7',
    seed: 0,
    tintLinear: [0.78, 0.63, 0.44],
    alphaSlope: 0.2,
    alphaOffset: -0.07,
  },
  {
    name: 'paper-tooth-faint.webp',
    width: 128,
    height: 128,
    baseFrequency: '.7',
    seed: 0,
    tintLinear: [0.78, 0.63, 0.44],
    alphaSlope: 0.1,
    alphaOffset: -0.035,
  },
  {
    name: 'stock-grain.webp',
    width: 128,
    height: 128,
    baseFrequency: '.5',
    seed: 7,
    tintLinear: [0.25, 0.18, 0.08],
    alphaSlope: 0.1,
    alphaOffset: -0.035,
  },
  {
    name: 'tape-crease.webp',
    width: 128,
    height: 32,
    baseFrequency: '.28 .02',
    seed: 5,
    tintLinear: [0, 0, 0],
    alphaSlope: 0.13,
    alphaOffset: -0.045,
  },
  {
    // Rendered at 160x160 with doubled frequency (.024) and tiled at 320px 320px in CSS:
    // soft low-frequency mottle patches read identically at a quarter of the pixel count.
    name: 'paper-mottle-day.webp',
    width: 160,
    height: 160,
    baseFrequency: '.024',
    seed: 7,
    tintLinear: [0.23, 0.1, 0],
    alphaSlope: 0.48,
    alphaOffset: -0.26,
  },
  {
    name: 'paper-mottle-dark.webp',
    width: 160,
    height: 160,
    baseFrequency: '.024',
    seed: 7,
    tintLinear: [0.48, 0.3, 0.12],
    alphaSlope: 0.24,
    alphaOffset: -0.13,
  },
];

for (const tile of TILES) {
  // Render pure fractalNoise alpha through librsvg so stitchTiles="stitch" and seed match
  // the original SVG filter exactly, then pair with exact un-quantized sRGB tint channels.
  const matrix = `0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${tile.alphaSlope} 0 0 0 ${tile.alphaOffset}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tile.width}" height="${tile.height}">` +
    `<filter id="n" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${tile.baseFrequency}" numOctaves="2" seed="${tile.seed}" stitchTiles="stitch"/>` +
    `<feColorMatrix values="${matrix}"/>` +
    `</filter>` +
    `<rect width="${tile.width}" height="${tile.height}" filter="url(#n)"/>` +
    `</svg>`;

  const alpha = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .extractChannel('alpha')
    .raw()
    .toBuffer();

  const [r, g, b] = tile.tintLinear.map(linearToSrgbByte);
  const rgba = Buffer.alloc(tile.width * tile.height * 4);
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i];
    if (a === 0) continue;
    const offset = i * 4;
    rgba[offset] = r;
    rgba[offset + 1] = g;
    rgba[offset + 2] = b;
    rgba[offset + 3] = a;
  }

  const out = join(TARGET, tile.name);
  const info = await sharp(rgba, {
    raw: { width: tile.width, height: tile.height, channels: 4 },
  })
    .webp({ lossless: true, effort: 6 })
    .toFile(out);
  console.log(`${out} ${info.size} B (${tile.width}x${tile.height}, rgb=${r},${g},${b})`);
}
