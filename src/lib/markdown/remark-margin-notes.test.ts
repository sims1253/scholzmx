import assert from 'node:assert/strict';
import { test } from 'node:test';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import remarkMarginNotes from './remark-margin-notes.ts';

async function render(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkMarginNotes)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
}

void test('turns a `> margin:` blockquote into an aside in its place', async () => {
  assert.equal(
    await render('Before.\n\n> margin: An aside.\n\nAfter.'),
    '<p>Before.</p>\n<aside class="margin-note">\n<p>An aside.</p>\n</aside>\n<p>After.</p>'
  );
});

void test('keeps markup inside the note', async () => {
  assert.equal(
    await render('> margin: Options go after `#|`, see [docs](https://quarto.org).'),
    '<aside class="margin-note">\n<p>Options go after <code>#|</code>, see <a href="https://quarto.org">docs</a>.</p>\n</aside>'
  );
});

void test('accepts any case and a prefix on a line of its own', async () => {
  assert.equal(
    await render('> Margin:\n> *Two* lines.'),
    '<aside class="margin-note">\n<p><em>Two</em> lines.</p>\n</aside>'
  );
});

void test('leaves ordinary blockquotes alone', async () => {
  for (const markdown of ['> A quote.', '> The margin: of error', '> *margin:* styled']) {
    assert.match(await render(markdown), /^<blockquote>/, markdown);
  }
});

void test('converts notes nested in lists', async () => {
  assert.match(await render('- item\n\n  > margin: nested'), /<aside class="margin-note">/);
});
