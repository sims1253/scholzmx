// Makes the relief each project sticker is lit by (src/components/GlossPrint.astro): a
// normal map in the colour channels and the sticker's own outline in the alpha channel.
//
//   node scripts/make-print-reliefs.mjs
//
// Nothing here is random, so rerunning it reproduces the committed files. Run it again
// when a logo in src/assets/images/projects/ is added or redrawn.
//
// A sticker has no real relief, so one is read out of the picture. Two heights are summed:
//   - the dome: the sticker is a little cushioned, highest in the middle and rolling off
//     at its cut edge, so a highlight slides over the whole of it and bends at the rim;
//   - the print: light paint stands a little proud of dark ink, which makes the highlight
//     catch on brush strokes and on the edges of flat colour instead of lying on top
//     like a white disc.
import { readdirSync, mkdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const SOURCE = 'src/assets/images/projects';
const TARGET = join(SOURCE, 'relief');
// The stickers are shown 120 CSS px wide; one map serves 1x and 2x screens.
const WIDTH = 256;
const DOME = 6;
const PRINT = 2.4;

mkdirSync(TARGET, { recursive: true });

for (const file of readdirSync(SOURCE).filter((name) => /\.(png|webp)$/.test(name))) {
  const sized = sharp(join(SOURCE, file)).resize({ width: WIDTH }).ensureAlpha();
  const { data: alpha, info } = await sized
    .clone()
    .extractChannel('alpha')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const grey = (image) => image.toColourspace('b-w').raw().toBuffer();
  // The outline is padded before it is blurred, so the dome falls away at the cut edge
  // of a sticker that fills its file to the border.
  const pad = Math.round(WIDTH / 8);
  const padded = await sharp(alpha, { raw: { width, height, channels: 1 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#000' })
    .blur(WIDTH / 14)
    .png()
    .toBuffer();
  const dome = await grey(sharp(padded).extract({ left: pad, top: pad, width, height }));
  const print = await grey(sized.clone().flatten({ background: '#808080' }).greyscale().blur(1.3));

  const heightAt = (x, y) => {
    const i = Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x));
    return (dome[i] * DOME + print[i] * PRINT) / 255;
  };

  const map = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // The surface leans away from where it rises.
      const nx = (heightAt(x - 1, y) - heightAt(x + 1, y)) / 2;
      const ny = (heightAt(x, y - 1) - heightAt(x, y + 1)) / 2;
      const length = Math.hypot(nx, ny, 1);
      const i = (y * width + x) * 4;
      map[i] = Math.round((nx / length / 2 + 0.5) * 255);
      map[i + 1] = Math.round((ny / length / 2 + 0.5) * 255);
      map[i + 2] = Math.round((1 / length) * 255);
      map[i + 3] = alpha[y * width + x];
    }
  }

  const out = join(TARGET, `${basename(file, extname(file)).replace(/-logo$/, '')}.webp`);
  // Colour is kept where the sticker is clear (`exact`), or its rim would be lit by
  // whatever the encoder left there.
  await sharp(map, { raw: { width, height, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100, exact: true, effort: 6 })
    .toFile(out);
  console.log(out);
}
