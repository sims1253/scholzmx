import assert from 'node:assert/strict';
import test from 'node:test';
import type { Element, Root } from 'hast';
import rehypeImageSizes from './rehype-image-sizes.ts';

function img(properties: Record<string, string | number> = {}): Element {
  return { type: 'element', tagName: 'img', properties, children: [] };
}

void test('sets column-aware sizes and avif format on local raster markdown images', () => {
  const image = img({ src: './photo.jpg', alt: 'Rolls' });
  const tree: Root = {
    type: 'root',
    children: [{ type: 'element', tagName: 'figure', properties: {}, children: [image] }],
  };

  rehypeImageSizes()(tree, { data: { astro: { localImagePaths: ['./photo.jpg'] } } });

  assert.equal(image.properties.sizes, '(min-width: 48rem) 36rem, calc(100vw - 2rem)');
  assert.equal(image.properties.format, 'avif');
});

void test('preserves explicit sizes and format attributes', () => {
  const image = img({ src: 'wide.jpg', sizes: '100vw', format: 'webp' });
  const tree: Root = { type: 'root', children: [image] };

  rehypeImageSizes()(tree);

  assert.equal(image.properties.sizes, '100vw');
  assert.equal(image.properties.format, 'webp');
});

void test('skips avif format for svg, gif, remote, and public root images', () => {
  const svg = img({ src: './diagram.svg' });
  const gif = img({ src: './loop.gif' });
  const remote = img({ src: 'https://example.com/photo.jpg' });
  const pub = img({ src: '/images/photo.png' });
  const tree: Root = { type: 'root', children: [svg, gif, remote, pub] };

  rehypeImageSizes()(tree, {
    data: { astro: { localImagePaths: ['./diagram.svg', './loop.gif'] } },
  });

  assert.equal(svg.properties.format, undefined);
  assert.equal(gif.properties.format, undefined);
  assert.equal(remote.properties.format, undefined);
  assert.equal(pub.properties.format, undefined);
});
