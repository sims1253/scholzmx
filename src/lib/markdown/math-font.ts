/**
 * Ships STIX Two Math cut down to the glyphs the site's formulas use.
 *
 * After a build it reads every page's MathML, keeps only those characters (with the
 * OpenType MATH table and the size variants it points to) and writes one small WOFF2
 * to `/fonts/math.woff2`, which `src/styles/math.css` names first for `math`. The dev
 * server serves the whole font at the same address.
 */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import subsetFont from 'subset-font';

const source = fileURLToPath(new URL('./stix-two-math/STIXTwoMath-Regular.woff2', import.meta.url));
const address = '/fonts/math.woff2';

export default function mathFont(): AstroIntegration {
  return {
    name: 'math-font',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(address, (_request, response) => {
          response.setHeader('content-type', 'font/woff2');
          void readFile(source).then((font) => response.end(font));
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const pages = (await readdir(out, { recursive: true })).filter((file) =>
          file.endsWith('.html')
        );
        const characters = new Set<string>();
        for (const page of pages) {
          for (const character of mathCharacters(await readFile(join(out, page), 'utf8'))) {
            characters.add(character);
          }
        }
        if (characters.size === 0) return;
        const font = await subsetFont(await readFile(source), [...characters].join(''), {
          targetFormat: 'woff2',
        });
        await mkdir(join(out, 'fonts'), { recursive: true });
        await writeFile(join(out, address), font);
        logger.info(`${characters.size} characters, ${Math.round(font.length / 1024)} KiB`);
      },
    },
  };
}

/** The characters a browser draws for the MathML in a page, LaTeX annotations left out. */
export function mathCharacters(html: string): Set<string> {
  const characters = new Set<string>();
  for (const [math] of html.matchAll(/<math[\s>][\s\S]*?<\/math>/g)) {
    const shown = math.replace(/<annotation[\s\S]*?<\/annotation>/g, '');
    // A single-letter <mi> without mathvariant is drawn from the italic block (MathML Core).
    for (const [, letter] of shown.matchAll(/<mi(?:\s(?![^>]*mathvariant)[^>]*)?>([^<]*)<\/mi>/g)) {
      const text = decode(letter ?? '');
      if (Array.from(text).length === 1) characters.add(italic(text));
    }
    for (const character of decode(shown.replace(/<[^>]*>/g, ''))) characters.add(character);
  }
  return characters;
}

function decode(text: string): string {
  const named = new Map([
    ['lt', '<'],
    ['gt', '>'],
    ['amp', '&'],
    ['quot', '"'],
    ['nbsp', '\u00a0'],
  ]);
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, body: string) => {
    if (body[0] !== '#') return named.get(body) ?? entity;
    return String.fromCodePoint(
      Number.parseInt(body.slice(body[1] === 'x' ? 2 : 1), body[1] === 'x' ? 16 : 10)
    );
  });
}

/** The math-auto italic of a Latin or Greek letter, after the table in MathML Core. */
function italic(letter: string): string {
  const code = letter.codePointAt(0) ?? 0;
  const special = new Map([
    [0x68, 0x210e],
    [0x131, 0x1d6a4],
    [0x237, 0x1d6a5],
    [0x3f4, 0x1d6f3],
    [0x2207, 0x1d6fb],
    [0x2202, 0x1d715],
    [0x3f5, 0x1d716],
    [0x3d1, 0x1d717],
    [0x3f0, 0x1d718],
    [0x3d5, 0x1d719],
    [0x3f1, 0x1d71a],
    [0x3d6, 0x1d71b],
  ]);
  const ranges: [number, number, number][] = [
    [0x41, 0x5a, 0x1d434],
    [0x61, 0x7a, 0x1d44e],
    [0x391, 0x3a9, 0x1d6e2],
    [0x3b1, 0x3c9, 0x1d6fc],
  ];
  const range = ranges.find(([first, last]) => code >= first && code <= last);
  const mapped = special.get(code) ?? (range ? code - range[0] + range[2] : code);
  return String.fromCodePoint(mapped);
}
