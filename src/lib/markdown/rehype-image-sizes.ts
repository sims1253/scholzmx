/**
 * Constrains markdown images' `sizes` attribute to the reading column width and defaults
 * local raster markdown images to AVIF so Astro's image pipeline emits right-sized modern
 * variants instead of full-viewport WebP downloads.
 */
import type { Element, Root, RootContent } from 'hast';

export interface RehypeImageSizesOptions {
  /** Responsive `sizes` attribute applied to markdown `<img>` elements without one. */
  sizes?: string;
  /** Output format requested from Astro's image pipeline for local raster images. */
  format?: string;
}

interface AstroMarkdownFile {
  data?: {
    astro?: {
      localImagePaths?: string[];
    };
  };
}

const DEFAULT_SIZES = '(min-width: 48rem) 36rem, calc(100vw - 2rem)';
const DEFAULT_FORMAT = 'avif';
const RASTER_EXTENSION = /\.(?:jpe?g|png|webp|tiff?)(?:$|[?#])/i;
const EXTERNAL_OR_ROOT_PATH = /^(?:[a-z][a-z0-9+.-]*:|\/)/i;

export default function rehypeImageSizes(options: RehypeImageSizesOptions = {}) {
  const sizes = options.sizes ?? DEFAULT_SIZES;
  const format = options.format ?? DEFAULT_FORMAT;
  return (tree: Root, file?: AstroMarkdownFile) => {
    const localImagePaths = file?.data?.astro?.localImagePaths;
    walk(tree.children, sizes, format, localImagePaths);
  };
}

function walk(
  nodes: RootContent[],
  sizes: string,
  format: string,
  localImagePaths?: string[]
): void {
  for (const node of nodes) {
    if (node.type !== 'element') continue;
    if (node.tagName === 'img') applyImageOptions(node, sizes, format, localImagePaths);
    if (node.children.length > 0) walk(node.children, sizes, format, localImagePaths);
  }
}

function isLocalRasterImage(src: string, localImagePaths?: string[]): boolean {
  if (!RASTER_EXTENSION.test(src)) return false;
  if (localImagePaths) {
    try {
      return localImagePaths.includes(decodeURI(src));
    } catch {
      return localImagePaths.includes(src);
    }
  }
  return !EXTERNAL_OR_ROOT_PATH.test(src);
}

function applyImageOptions(
  img: Element,
  sizes: string,
  format: string,
  localImagePaths?: string[]
): void {
  img.properties ??= {};
  if (!img.properties.sizes) {
    img.properties.sizes = sizes;
  }
  const rawSrc = img.properties.src;
  const src = rawSrc && !Array.isArray(rawSrc) ? String(rawSrc) : '';
  if (!img.properties.format && isLocalRasterImage(src, localImagePaths)) {
    img.properties.format = format;
  }
}
