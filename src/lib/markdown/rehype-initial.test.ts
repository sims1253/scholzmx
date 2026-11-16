import assert from 'node:assert/strict';
import { test } from 'node:test';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { VFile } from 'vfile';
import { initialAttributes } from './initial.ts';
import rehypeInitial from './rehype-initial.ts';

const options = { collections: { blog: 'serious', recipes: 'personal' } } as const;
const ornament = (letter: string, variant = 'serious', extra = '') =>
  `<span class="dropcap dropcap--ornate dropcap--${variant}${extra}" data-first-letter="${letter}" aria-hidden="true"></span>`;
const word = (letter: string) => ornament(letter, 'serious', ' dropcap--word');

async function render(
  markdown: string,
  { path = '/site/src/content/blog/2017/post.md', frontmatter = {} } = {}
): Promise<string> {
  const file = new VFile({ value: markdown, path, data: { astro: { frontmatter } } });
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeInitial, options)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(file);
  return String(result);
}

void test('keeps the first letter in the text and adds the ornament before it', async () => {
  assert.equal(await render('This is it.'), `<p>${ornament('T')}This is it.</p>`);
});

void test('decorates only the first paragraph', async () => {
  const html = await render('First one.\n\nSecond one.');
  assert.equal(html, `<p>${ornament('F')}First one.</p>\n<p>Second one.</p>`);
});

void test('skips headings and image-only paragraphs before the first paragraph', async () => {
  const html = await render('## Heading\n\n![alt](a.png)\n\nText.');
  assert.match(html, new RegExp(`<p>${ornament('T')}Text\\.</p>$`));
  assert.equal(html.match(/aria-hidden/g)?.length, 1);
});

void test('finds the letter inside a link or emphasis', async () => {
  assert.equal(
    await render('[Bayesim](https://example.org) is *new*.'),
    `<p>${ornament('B')}<a href="https://example.org">Bayesim</a> is <em>new</em>.</p>`
  );
  assert.equal(await render('*Once* upon'), `<p>${ornament('O')}<em>Once</em> upon</p>`);
});

void test('hangs an opening quotation mark so the initial is the letter', async () => {
  assert.equal(
    await render('“Hello,” she said.'),
    `<p>${ornament('H')}<span class="dropcap-quote">“</span>Hello,” she said.</p>`
  );
});

void test('keeps a one-letter first word as it is and marks the ornament', async () => {
  assert.equal(await render('A story told.'), `<p>${word('A')}A story told.</p>`);
  assert.equal(await render('I  am.'), `<p>${word('I')}I  am.</p>`);
});

void test('passes over an editorial note such as *Update:* to the text that follows', async () => {
  const html = await render('*Update:* We published it.\n\nI am working on it.');
  assert.equal(
    html,
    `<p><em>Update:</em> We published it.</p>\n<p>${word('I')}I am working on it.</p>`
  );
  assert.match(await render('**Note:** a label.'), /^<p><strong>/);
  assert.match(await render('*Emphasis* opens.'), /dropcap/);
});

void test('keeps punctuation after the letter out of the initial', async () => {
  assert.equal(await render("I'm here."), `<p>${ornament('I')}I\u2060'm here.</p>`);
});

void test('gives no initial to a paragraph that opens with a non-letter', async () => {
  for (const markdown of ['2017 was a year.', '`code` first', '(Aside) text', '— dash']) {
    assert.doesNotMatch(await render(markdown), /dropcap/, markdown);
  }
});

void test('leaves a paragraph that already opens with raw HTML alone', async () => {
  const html = await render('<span class="dropcap">T</span>his');
  assert.doesNotMatch(html, /aria-hidden/);
});

void test('picks the variant by collection and leaves other collections alone', async () => {
  const recipe = await render('Making coffee.', { path: '/site/src/content/recipes/coffee.md' });
  assert.equal(recipe, `<p>${ornament('M', 'personal')}Making coffee.</p>`);
  const note = await render('Gardens grow.', { path: '/site/src/content/notes/garden.md' });
  assert.equal(note, '<p>Gardens grow.</p>');
});

void test('front matter `dropcap: false` opts a page out', async () => {
  assert.equal(
    await render('This is it.', { frontmatter: { dropcap: false } }),
    '<p>This is it.</p>'
  );
});

void test('DropCap.astro and the plugin share one definition of the ornament', () => {
  assert.deepEqual(initialAttributes('i', { color: 'moss', variant: 'personal' }), {
    class: 'dropcap dropcap--ornate dropcap--personal dropcap--moss',
    'data-first-letter': 'I',
    'aria-hidden': 'true',
  });
});
