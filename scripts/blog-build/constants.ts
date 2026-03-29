import { join } from 'node:path';

export const BLOG_DIR = 'src/content/blog';
export const LEGACY_CACHE_DIR = '.blog-cache';
export const CACHE_ROOT = '.cache/blog-build';
export const MANIFEST_PATH = join(CACHE_ROOT, 'manifest.json');
export const ARTIFACTS_ROOT = join(CACHE_ROOT, 'artifacts');
export const ERRORS_ROOT = join(CACHE_ROOT, 'errors');
export const PIPELINE_VERSION = 'blog-build-v1';
export const MANIFEST_VERSION = 1;
export const QUARTO_TIMEOUT_MS = (() => {
  const timeoutFromEnv = Number(process.env.QUARTO_TIMEOUT_MS);
  if (Number.isFinite(timeoutFromEnv) && timeoutFromEnv > 0) {
    return timeoutFromEnv;
  }
  return 10 * 60 * 1000;
})();

export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);
