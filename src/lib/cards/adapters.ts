import type { CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import type { CardHero, CardMetaItem, ListCardItem } from './types';

interface HeroOptions {
  alt?: string;
  scale?: number;
  posX?: number;
  posY?: number;
  aspectRatio?: string;
  fillMode?: 'cover' | 'contain' | 'fill';
  shell?: 'media' | 'plain';
  containerClass?: string;
  width?: number;
  height?: number;
}

export interface BlogCardAdapterOptions {
  basePath?: string;
  idPrefix?: string;
  tagHref?: (tag: string) => string;
}

export interface RecipeCardAdapterOptions {
  basePath?: string;
  idPrefix?: string;
  tagHref?: (tag: string) => string;
}

export interface ProjectCardRecord {
  id?: string;
  title: string;
  description?: string;
  year?: number;
  status?: string;
  banner?: {
    src: string | ImageMetadata;
    alt?: string;
    width?: number;
    height?: number;
    scale?: number;
    posX?: number;
    posY?: number;
  };
  links?: Array<{
    type: string;
    url: string;
    external?: boolean;
  }>;
}

export interface ResearchCardRecord {
  id?: string;
  title: string;
  venue?: string;
  type?: string;
  year?: number;
  authors?: string[];
  links?: Record<string, string | undefined>;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizePath(basePath: string): string {
  if (!basePath) return '';
  return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
}

function buildHref(basePath: string, slug: string): string {
  const normalizedBasePath = normalizePath(basePath);
  return `${normalizedBasePath}/${slug}`;
}

function toCardId(prefix: string | undefined, id: string): string {
  return prefix ? `${prefix}/${id}` : id;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isImageMetadata(value: unknown): value is ImageMetadata {
  return typeof value === 'object' && value !== null && 'src' in value;
}

function toHeroImage(heroImage: unknown, options: HeroOptions = {}): CardHero | undefined {
  if (typeof heroImage !== 'string' && !isImageMetadata(heroImage)) {
    return undefined;
  }

  return {
    src: heroImage,
    alt: options.alt ?? '',
    aspectRatio: options.aspectRatio,
    scale: options.scale,
    posX: options.posX,
    posY: options.posY,
    fillMode: options.fillMode,
    shell: options.shell,
    containerClass: options.containerClass,
    width: options.width,
    height: options.height,
  };
}

export function fromBlogEntry(
  entry: CollectionEntry<'blog'>,
  options: BlogCardAdapterOptions = {}
): ListCardItem {
  const tagHref = options.tagHref ?? ((tag: string) => `/blog?tag=${encodeURIComponent(tag)}`);
  const tags = entry.data.tags ?? [];
  const meta: CardMetaItem[] = [
    {
      kind: 'date',
      label: 'Written',
      value: formatDate(entry.data.date),
      datetime: entry.data.date.toISOString(),
    },
  ];

  if (entry.data.lastUpdated) {
    meta.push({
      kind: 'date',
      label: 'Updated',
      value: formatDate(entry.data.lastUpdated),
      datetime: entry.data.lastUpdated.toISOString(),
    });
  }

  for (const tag of tags) {
    meta.push({ kind: 'tag', label: `#${tag}`, href: tagHref(tag) });
  }

  return {
    id: toCardId(options.idPrefix ?? 'blog', entry.id),
    href: buildHref(options.basePath ?? '/blog', entry.id),
    title: entry.data.title,
    description: entry.data.description,
    hero: toHeroImage(entry.data.heroImage, {
      alt: '',
      scale: entry.data.heroImageScale,
      posX: entry.data.heroImagePositionX,
      posY: entry.data.heroImagePositionY,
      width: 1200,
      height: 450,
      aspectRatio: '8/3',
    }),
    meta,
    filter: {
      year: entry.data.date.getFullYear(),
      tags,
    },
  };
}

export function fromRecipeEntry(
  entry: CollectionEntry<'recipes'>,
  options: RecipeCardAdapterOptions = {}
): ListCardItem {
  const tagHref = options.tagHref ?? ((tag: string) => `/recipes?tag=${encodeURIComponent(tag)}`);
  const tags = entry.data.tags ?? [];
  const meta: CardMetaItem[] = [
    { kind: 'text', label: 'Serves', value: entry.data.servings },
    { kind: 'text', label: 'Time', value: entry.data.time },
  ];

  if (entry.data.date) {
    meta.push({
      kind: 'date',
      label: 'Date',
      value: formatDate(entry.data.date),
      datetime: entry.data.date.toISOString(),
    });
  }

  for (const tag of tags) {
    meta.push({ kind: 'tag', label: `#${tag}`, href: tagHref(tag) });
  }

  return {
    id: toCardId(options.idPrefix ?? 'recipes', entry.id),
    href: buildHref(options.basePath ?? '/recipes', entry.id),
    title: entry.data.title,
    description: entry.data.description,
    hero: toHeroImage(entry.data.heroImage, {
      alt: '',
      scale: entry.data.heroImageScale,
      posX: entry.data.heroImagePositionX,
      posY: entry.data.heroImagePositionY,
      width: 1200,
      height: 800,
      aspectRatio: '3/2',
    }),
    meta,
    filter: {
      year: entry.data.date?.getFullYear(),
      tags,
    },
  };
}

export function fromProjectRecord(record: ProjectCardRecord): ListCardItem {
  const meta: CardMetaItem[] = [];
  if (record.year) meta.push({ kind: 'text', label: 'Year', value: String(record.year) });
  if (record.status) meta.push({ kind: 'text', label: 'Status', value: record.status });

  for (const link of record.links ?? []) {
    meta.push({
      kind: 'tag',
      label: link.type,
      href: link.url,
      external: link.external ?? true,
    });
  }

  return {
    id: record.id ?? `project/${slugify(record.title)}`,
    href: record.links?.[0]?.url,
    title: record.title,
    description: record.description,
    hero: record.banner
      ? {
          src: record.banner.src,
          alt: record.banner.alt ?? record.title,
          scale: record.banner.scale,
          posX: record.banner.posX,
          posY: record.banner.posY,
          width: record.banner.width,
          height: record.banner.height,
          fillMode: 'contain',
          shell: 'plain',
          containerClass: 'project-logo',
        }
      : undefined,
    meta,
    filter: {
      year: record.year,
    },
  };
}

export function fromResearchRecord(record: ResearchCardRecord): ListCardItem {
  const meta: CardMetaItem[] = [];
  const links = Object.entries(record.links ?? {}).flatMap(([label, href]) => {
    return typeof href === 'string' ? ([[label, href]] as const) : [];
  });

  if (record.type) {
    meta.push({ kind: 'text', label: 'Type', value: record.type });
  }

  if (record.authors?.length) {
    meta.push({ kind: 'text', label: 'Authors', value: record.authors.join(', ') });
  }

  for (const [label, href] of links) {
    meta.push({ kind: 'tag', label, href, external: true });
  }

  const primaryLink =
    links.find(([label]) => label === 'pdf')?.[1] ??
    links.find(([label]) => label === 'doi')?.[1] ??
    links[0]?.[1];

  return {
    id: record.id ?? `research/${record.year ?? 'unknown'}/${slugify(record.title)}`,
    href: primaryLink,
    title: record.title,
    description: record.venue,
    meta,
    filter: {
      year: record.year,
    },
  };
}
