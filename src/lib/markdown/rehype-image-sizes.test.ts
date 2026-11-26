import assert from 'node:assert/strict';
import test from 'node:test';
import type { Element, Root } from 'hast';
import rehypeImageSizes from './rehype-image-sizes.ts';

function img(properties: Record<string, string | number> = {}): Element {
  return { type: 'element', tagName: 'img', properties, children: [] };
}

void test('sets column-aware sizes on markdown images without one', () => {
  const image = img({ src: 'photo.jpg', alt: 'Rolls' });
  const tree: Root = {
    type: 'root',
    children: [{ type: 'element', tagName: 'figure', properties: {}, children: [image] }],
  };

  rehypeImageSizes()(tree);

  assert.equal(image.properties.sizes, '(min-width: 48rem) 36rem, calc(100vw - 2rem)');
});

void test('preserves an explicit sizes attribute', () => {
  const image = img({ src: 'wide.jpg', sizes: '100vw' });
  const tree: Root = { type: 'root', children: [image] };

  rehypeImageSizes()(tree);

  assert.equal(image.properties.sizes, '100vw');
});
