import {
  convertFiguresToMarkdown,
  convertStandaloneImagesToMarkdown,
  extractOutputFromDetails,
  fixImagePaths,
  removeDuplicateTitleDate,
} from '../markdown-transforms.js';

const IMAGE_EXT_PATTERN = '(?:png|jpg|jpeg|gif|svg|webp)';

function normalizeImageRef(raw: string): string | null {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed) {
    return null;
  }
  if (/^(https?:|data:|mailto:|tel:|javascript:)/i.test(trimmed)) {
    return null;
  }

  const withoutQuery = trimmed.split('?')[0].split('#')[0];
  if (!withoutQuery) {
    return null;
  }

  const imageExtRegex = new RegExp(`\\.${IMAGE_EXT_PATTERN}$`, 'i');
  if (!imageExtRegex.test(withoutQuery)) {
    return null;
  }

  if (withoutQuery.startsWith('/')) {
    return null;
  }

  if (withoutQuery.startsWith('./')) {
    return withoutQuery;
  }

  if (withoutQuery.startsWith('../')) {
    return withoutQuery;
  }

  return `./${withoutQuery}`;
}

export function runMarkdownTransformPipeline(content: string): string {
  let result = content;
  result = convertFiguresToMarkdown(result);
  result = convertStandaloneImagesToMarkdown(result);
  result = fixImagePaths(result);
  result = extractOutputFromDetails(result);
  result = removeDuplicateTitleDate(result);
  return result;
}

export function collectReferencedLocalImages(content: string): string[] {
  const found = new Set<string>();

  const markdownLinkRegex = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(markdownLinkRegex)) {
    const normalized = normalizeImageRef(match[1] ?? '');
    if (normalized) {
      found.add(normalized);
    }
  }

  const heroImageRegex = /^\s*heroImage:\s*(.+)$/gm;
  for (const match of content.matchAll(heroImageRegex)) {
    const normalized = normalizeImageRef(match[1] ?? '');
    if (normalized) {
      found.add(normalized);
    }
  }

  const htmlSrcRegex = /\bsrc=["']([^"']+)["']/g;
  for (const match of content.matchAll(htmlSrcRegex)) {
    const normalized = normalizeImageRef(match[1] ?? '');
    if (normalized) {
      found.add(normalized);
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}
