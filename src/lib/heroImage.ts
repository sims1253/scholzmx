/**
 * Hero-image normalization for card listings.
 *
 * Content entries store `heroImage` as either an optimized `ImageMetadata`
 * asset or a raw URL string, plus optional positioning/scale fields. Card
 * listings (NoteCardStack) consume a normalized {@link CardHero} shape, so the
 * same conversion is needed everywhere post lists are rendered. Centralizing
 * it here keeps the three call sites (blog list, blog related-posts, etc.) in
 * sync and gives the asset `src` a real type instead of `any`.
 */
import type { ImageMetadata } from 'astro';

export type CardHero =
  | { kind: 'url'; src: string; scale?: number; posX?: number; posY?: number }
  | {
      kind: 'asset';
      src: ImageMetadata;
      width?: number;
      height?: number;
      scale?: number;
      posX?: number;
      posY?: number;
    };

export interface CardHeroOptions {
  scale?: number;
  posX?: number;
  posY?: number;
  /** Only meaningful for asset heroes (ignored for URL heroes). */
  width?: number;
  height?: number;
}

/**
 * Convert a content entry's hero-image frontmatter into the {@link CardHero}
 * shape. Returns `undefined` when there is no image.
 *
 * `posX`/`posY` are the raw frontmatter values (typically -1..1); callers that
 * need the percentage form for `ImageFrame` should multiply by 100 themselves.
 */
export function toCardHero(
  heroImage: string | ImageMetadata | null | undefined,
  opts: CardHeroOptions = {}
): CardHero | undefined {
  const { scale = 1, posX = 0, posY = 0, width, height } = opts;
  if (typeof heroImage === 'string') {
    return { kind: 'url', src: heroImage, scale, posX, posY };
  }
  if (heroImage) {
    return { kind: 'asset', src: heroImage, width, height, scale, posX, posY };
  }
  return undefined;
}
