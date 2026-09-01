import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { DependencyRecord, PostInfo } from './types.js';
import { normalizeToPosix, readText, resolveLocalPath, workspaceRelative } from './utils.js';

const FRONTMATTER_PATH_KEYS = [
  'bibliography',
  'csl',
  'include-in-header',
  'include-before-body',
  'include-after-body',
  'heroImage',
];

function extractFrontmatterBlock(content: string): string | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return match ? match[1] : null;
}

function stripInlineComment(value: string): string {
  let inSingle = false;
  let inDouble = false;
  let output = '';

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      output += char;
      continue;
    }
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      output += char;
      continue;
    }
    if (char === '#' && !inSingle && !inDouble) {
      break;
    }
    output += char;
  }

  return output.trim();
}

function splitInlineArray(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return [trimmed];
  }

  const inner = trimmed.slice(1, -1).trim();
  if (!inner) {
    return [];
  }

  return inner
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function unquote(value: string): string {
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function extractFrontmatterPathValues(frontmatter: string, key: string): string[] {
  const lines = frontmatter.split(/\r?\n/);
  const values: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const keyMatch = line.match(new RegExp(`^${key}:\\s*(.*)$`));
    if (!keyMatch) {
      continue;
    }

    const value = stripInlineComment(keyMatch[1] ?? '');
    if (!value) {
      let j = i + 1;
      while (j < lines.length) {
        const listLine = lines[j];
        const listMatch = listLine.match(/^\s*-\s+(.+)$/);
        if (!listMatch) {
          break;
        }
        values.push(unquote(stripInlineComment(listMatch[1])));
        j++;
      }
      i = j - 1;
      continue;
    }

    for (const item of splitInlineArray(value)) {
      const cleaned = unquote(stripInlineComment(item));
      if (cleaned) {
        values.push(cleaned);
      }
    }
  }

  return values;
}

function extractLocalLinks(content: string): string[] {
  const links = new Set<string>();

  const markdownTargetRegex = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(markdownTargetRegex)) {
    const target = match[1]?.trim();
    if (target) {
      links.add(target);
    }
  }

  const htmlAttrRegex = /\b(?:src|href)=["']([^"']+)["']/g;
  for (const match of content.matchAll(htmlAttrRegex)) {
    const target = match[1]?.trim();
    if (target) {
      links.add(target);
    }
  }

  const includeRegex = /\{\{<\s*include\s+([^\s>]+)\s*>\}\}/g;
  for (const match of content.matchAll(includeRegex)) {
    const target = match[1]?.trim();
    if (target) {
      links.add(target);
    }
  }

  return [...links];
}

function addRecord(records: Map<string, DependencyRecord>, record: DependencyRecord): void {
  records.set(record.path, record);
}

export function collectDependencyRecords(
  workspaceRoot: string,
  post: PostInfo,
  transformScriptPath: string,
  pipelineEntrypointPath: string,
  quartoConfigPath: string
): DependencyRecord[] {
  const records = new Map<string, DependencyRecord>();

  addRecord(records, {
    path: normalizeToPosix(post.qmdPath),
    source: 'qmd',
  });
  addRecord(records, {
    path: normalizeToPosix(resolve(workspaceRoot, quartoConfigPath)),
    source: 'quarto-config',
  });
  addRecord(records, {
    path: normalizeToPosix(resolve(workspaceRoot, transformScriptPath)),
    source: 'quarto-config',
  });
  addRecord(records, {
    path: normalizeToPosix(resolve(workspaceRoot, pipelineEntrypointPath)),
    source: 'quarto-config',
  });

  const qmdContent = readText(post.qmdPath);
  const frontmatter = extractFrontmatterBlock(qmdContent);

  if (frontmatter) {
    for (const key of FRONTMATTER_PATH_KEYS) {
      const values = extractFrontmatterPathValues(frontmatter, key);
      for (const value of values) {
        const resolved = resolveLocalPath(value, post.postDir, workspaceRoot);
        if (!resolved) {
          continue;
        }
        addRecord(records, {
          path: normalizeToPosix(resolved),
          source: 'frontmatter',
        });
      }
    }
  }

  for (const link of extractLocalLinks(qmdContent)) {
    const resolved = resolveLocalPath(link, post.postDir, workspaceRoot);
    if (!resolved) {
      continue;
    }

    addRecord(records, {
      path: normalizeToPosix(resolved),
      source: 'content-link',
    });
  }

  // Include sidecar bibliography if present and referenced by default name.
  const sidecarBib = join(post.postDir, 'references.bib');
  if (existsSync(sidecarBib) && qmdContent.includes('references.bib')) {
    addRecord(records, {
      path: normalizeToPosix(sidecarBib),
      source: 'frontmatter',
    });
  }

  return [...records.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function formatDependencyListForManifest(
  workspaceRoot: string,
  dependencyRecords: DependencyRecord[]
): string[] {
  return dependencyRecords.map((record) => {
    const absolutePath = resolve(record.path);
    const relativePath = workspaceRelative(workspaceRoot, absolutePath);
    return existsSync(absolutePath) ? relativePath : `${relativePath} (missing)`;
  });
}
