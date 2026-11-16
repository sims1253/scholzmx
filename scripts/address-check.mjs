// Checks the addresses the build hands to search engines, feed readers and link previews:
// every one must use the host from `site` in astro.config.mjs and name a file in dist/.
// Runs on import, against the last build; browser-smoke.mjs imports it.
import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The config imports TypeScript integrations Node cannot load, so read the line itself.
const config = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
const siteSetting = /^\s*site:\s*'([^']+)'/m.exec(config)?.[1];
assert.ok(siteSetting, 'astro.config.mjs must set site');
export const site = new URL(siteSetting).origin;

const dist = new URL('../dist/', import.meta.url).pathname;
const read = (path) => readFileSync(join(dist, path), 'utf8');
const all = (text, pattern) => [...text.matchAll(pattern)].map((match) => match[1]);

/** The file in dist/ that serves an absolute address on the site, or undefined. */
const fileFor = (address) => {
  const url = new URL(address);
  if (url.origin !== site) return undefined;
  const path = decodeURIComponent(url.pathname);
  return [path, join(path, 'index.html')].find(
    (candidate) => !candidate.endsWith('/') && existsSync(join(dist, candidate))
  );
};
const isRedirect = (file) => file.endsWith('.html') && /http-equiv="refresh"/.test(read(file));

// A plain local build leaves out Quarto posts until `bun run build-blog` renders them; CI
// renders every post. Addresses of such posts are skipped here, not reported.
const unrendered = new Set();
const isUnrendered = (address) => {
  const id = /^\/blog\/(.+)\/$/.exec(new URL(address).pathname)?.[1];
  const source = new URL(`../src/content/blog/${id}/`, import.meta.url).pathname;
  return (
    Boolean(id) && existsSync(join(source, 'index.qmd')) && !existsSync(join(source, 'index.md'))
  );
};

const problems = [];
const expectServed = (address, from) => {
  if (fileFor(address)) return;
  if (isUnrendered(address)) unrendered.add(address);
  else problems.push(`${from}: ${address} is not a page on ${site}`);
};

const feed = read('rss.xml');
const feedLinks = all(feed, /<link>([^<]+)<\/link>/g);
assert.ok(feedLinks.length > 1, 'The feed must list posts');
for (const link of feedLinks) expectServed(link, 'rss.xml');

const sitemaps = all(read('sitemap-index.xml'), /<loc>([^<]+)<\/loc>/g);
assert.ok(sitemaps.length > 0, 'The sitemap index must list sitemaps');
let pages = 0;
for (const sitemap of sitemaps) {
  expectServed(sitemap, 'sitemap-index.xml');
  const file = fileFor(sitemap);
  if (!file) continue;
  for (const loc of all(read(file), /<loc>([^<]+)<\/loc>/g)) {
    pages += 1;
    expectServed(loc, file);
    const page = fileFor(loc);
    if (page && isRedirect(page)) problems.push(`${file}: ${loc} is a redirect`);
  }
}

for (const sitemap of all(read('robots.txt'), /^Sitemap:\s*(\S+)/gm)) {
  expectServed(sitemap, 'robots.txt');
}

let canonicals = 0;
for (const file of globSync('**/*.html', { cwd: dist })) {
  const html = read(file);
  const image = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
  if (image) expectServed(image, `${file} og:image`);
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  // The 404 page answers at whatever address was missing, so it names none.
  if (file === '404.html') {
    if (canonical) problems.push(`404.html: canonical ${canonical}`);
    continue;
  }
  if (!canonical) {
    problems.push(`${file}: no canonical`);
    continue;
  }
  canonicals += 1;
  expectServed(canonical, `${file} canonical`);
  const ogURL = /<meta property="og:url" content="([^"]+)"/.exec(html)?.[1];
  if (ogURL && ogURL !== canonical) problems.push(`${file}: og:url ${ogURL} ≠ ${canonical}`);
}

assert.deepEqual(problems, [], 'Addresses that do not resolve on the site');
console.log(
  `Address checks passed on ${site}: ${feedLinks.length} feed links, ` +
    `${pages} sitemap pages, ${canonicals} canonicals.`
);
if (unrendered.size > 0) {
  console.log(`Skipped ${unrendered.size} addresses of Quarto posts this build did not render.`);
}
