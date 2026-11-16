// Draws the film grain that photographs are printed with (src/styles/film.css): one
// small tile of luminance noise, mid-grey on average, that the stylesheet lays over a
// photograph with an overlay blend. Mid-grey leaves the picture as it is; lighter and
// darker specks lift and press it, most in the midtones, as grain shows on a print.
//
//   node scripts/draw-film-grain.mjs
//
// Grain is not pixel noise: silver clumps. Each speck mixes a pixel's own noise with a
// little of its neighbours', so the specks run one to two pixels wide. The tile wraps,
// so it repeats without a seam, and the drawing is seeded, so rerunning it reproduces
// the committed file. Sixteen greys keep it under 10 KB.
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SIZE = 128;
const OUT = 'public/film/grain.png';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(1984);
// Roughly normal noise: the mean of three uniform draws, centred on zero.
const white = Float32Array.from({ length: SIZE * SIZE }, () => rand() + rand() + rand() - 1.5);
const at = (x, y) => white[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];

const grey = Buffer.alloc(SIZE * SIZE);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const near = (at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1)) / 4;
    const speck = 0.7 * at(x, y) + 0.5 * near;
    grey[y * SIZE + x] = Math.round(Math.max(0, Math.min(255, 128 + speck * 150)));
  }
}

mkdirSync('public/film', { recursive: true });
const png = await sharp(grey, { raw: { width: SIZE, height: SIZE, channels: 1 } })
  .png({ palette: true, colours: 16, dither: 0, compressionLevel: 9, effort: 10 })
  .toBuffer();
writeFileSync(OUT, png);
console.log(`${OUT}: ${png.length} bytes`);
