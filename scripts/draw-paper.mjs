// Draws the two static textures behind "plates and film": the rag paper's fibres that
// tile under every page, and the film grain laid over photographs.
//
//   node scripts/draw-paper.mjs
//
// Both are small palette PNGs so a phone decodes them once and tiles them for free.
// The drawing is seeded, so rerunning it reproduces the committed files.
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

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

// Tiling value noise: a lattice of random values, smoothly interpolated, that wraps.
function valueNoise(size, cells, rand) {
  const lattice = Float32Array.from({ length: cells * cells }, () => rand());
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = (x / size) * cells;
    const fy = (y / size) * cells;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = smooth(fx - x0);
    const ty = smooth(fy - y0);
    const at = (i, j) => lattice[(j % cells) * cells + (i % cells)];
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
    const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}

async function write(file, size, pixel) {
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [grey, alpha] = pixel(x, y);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = grey;
      data[i + 3] = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }
  const png = await sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .png({ palette: true, colours: 16, compressionLevel: 9, effort: 10 })
    .toBuffer();
  writeFileSync(file, png);
  console.log(`${file}: ${png.length} bytes`);
}

mkdirSync('public/grotto', { recursive: true });

// Rag paper: a fine tooth with a few stray fibres. Neutral grey, so it darkens the
// day's paper and lightens the torchlit paper by the same faint amount.
{
  const size = 256;
  const rand = rng(7);
  const mottle = valueNoise(size, 24, rand);
  const fibres = valueNoise(size, 128, rand);
  await write('public/grotto/paper.png', size, (x, y) => {
    const tooth = 0.035 * rand() + 0.02 * mottle(x, y);
    const fibre = Math.max(0, fibres(x, y) - 0.78) * 0.3;
    return [128, tooth + fibre];
  });
}

// Film grain: clumps of one to three pixels, half light and half dark, laid over the
// lifted shadows with a screen blend so it shows in the shadows and fades in highlights.
{
  const size = 192;
  const rand = rng(11);
  const clumps = valueNoise(size, 96, rand);
  await write('public/grotto/grain.png', size, (x, y) => {
    const signed = 0.6 * (rand() - 0.5) + 0.4 * (clumps(x, y) - 0.5);
    const strength = Math.min(1, Math.abs(signed) * 2.2) ** 1.6;
    return [signed > 0 ? 220 : 0, strength * 0.4];
  });
}
