import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { BLOG_DIR } from './constants.js';
import type { PostInfo } from './types.js';
import { normalizeToPosix } from './utils.js';

const POST_PATTERN = /^\d{4}\/\d{2}-\d{2}-[\w-]+\/index\.qmd$/;

function toPostInfo(workspaceRoot: string, qmdPath: string): PostInfo {
  const absoluteQmdPath = resolve(workspaceRoot, qmdPath);
  const absoluteBlogDir = resolve(workspaceRoot, BLOG_DIR);
  const relativePath = normalizeToPosix(relative(absoluteBlogDir, absoluteQmdPath));
  const segments = relativePath.split('/');
  const year = segments[0];
  const slug = segments[1];
  const postKey = `${year}/${slug}`;

  return {
    postKey,
    qmdPath: absoluteQmdPath,
    mdPath: absoluteQmdPath.replace(/\.qmd$/, '.md'),
    postDir: dirname(absoluteQmdPath),
    year,
    slug,
  };
}

function discoverAllQmdFiles(workspaceRoot: string): string[] {
  const absoluteBlogDir = resolve(workspaceRoot, BLOG_DIR);
  if (!existsSync(absoluteBlogDir)) {
    return [];
  }

  const qmdFiles: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === 'index.qmd') {
        const rel = normalizeToPosix(relative(absoluteBlogDir, fullPath));
        if (POST_PATTERN.test(rel)) {
          qmdFiles.push(fullPath);
        }
      }
    }
  };

  walk(absoluteBlogDir);
  return qmdFiles.sort();
}

export function discoverPosts(workspaceRoot: string, specificFile?: string): PostInfo[] {
  if (specificFile) {
    const absoluteSpecificFile = resolve(workspaceRoot, specificFile);
    const absoluteBlogDir = resolve(workspaceRoot, BLOG_DIR);
    const rel = normalizeToPosix(relative(absoluteBlogDir, absoluteSpecificFile));

    if (!POST_PATTERN.test(rel)) {
      throw new Error(
        'QMD file must follow src/content/blog/YYYY/MM-DD-post-name/index.qmd structure'
      );
    }

    if (!existsSync(absoluteSpecificFile)) {
      throw new Error(`File not found: ${specificFile}`);
    }

    return [toPostInfo(workspaceRoot, absoluteSpecificFile)];
  }

  return discoverAllQmdFiles(workspaceRoot).map((filePath) => toPostInfo(workspaceRoot, filePath));
}
