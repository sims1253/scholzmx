/**
 * Constrains markdown images' `sizes` attribute to the reading column width so responsive
 * `srcset` picks right-sized variants instead of downloading 3000-4000px full-viewport images
 * on 2x desktop screens.
 */
import type { Element, Root, RootContent } from 'hast';

export interface RehypeImageSizesOptions {
  /** Responsive `sizes` attribute applied to markdown `<img>` elements without one. */
  sizes?: string;
}

const DEFAULT_SIZES = '(min-width: 48rem) 36rem, calc(100vw - 2rem)';

export default function rehypeImageSizes(options: RehypeImageSizesOptions = {}) {
  const sizes = options.sizes ?? DEFAULT_SIZES;
  return (tree: Root) => {
    walk(tree.children, sizes);
  };
}

function walk(nodes: RootContent[], sizes: string): void {
  for (const node of nodes) {
    if (node.type !== 'element') continue;
    if (node.tagName === 'img') applySizes(node, sizes);
    if (node.children.length > 0) walk(node.children, sizes);
  }
}

function applySizes(img: Element, sizes: string): void {
  img.properties ??= {};
  if (!img.properties.sizes) {
    img.properties.sizes = sizes;
  }
}
