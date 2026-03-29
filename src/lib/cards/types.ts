import type { ImageMetadata } from 'astro';

export type CardLayout = 'stacked' | 'side';
export type CardStyleProfile = 'blog' | 'recipes' | 'research' | 'projects' | 'related';

export type CardHero = {
  src: string | ImageMetadata;
  alt: string;
  aspectRatio?: string;
  scale?: number;
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  fillMode?: 'cover' | 'contain' | 'fill';
  shell?: 'media' | 'plain';
  containerClass?: string;
};

export type CardMetaItem =
  | { kind: 'date'; label?: string; value: string; datetime?: string }
  | { kind: 'tag'; label: string; href?: string; external?: boolean }
  | { kind: 'text'; label?: string; value: string };

export type CardFilter = {
  year?: number;
  tags?: string[];
  [key: string]: string | number | string[] | undefined;
};

export interface ListCardItem {
  id: string;
  href?: string;
  title: string;
  description?: string;
  hero?: CardHero;
  meta?: CardMetaItem[];
  filter?: CardFilter;
}
