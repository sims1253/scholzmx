import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import type { ManifestPostEntry, PostInfo, RenderSuccessResult, TrackedOutputs } from './types.js';
import {
  ensureDir,
  isInsideDirectory,
  sha256File,
  workspaceRelative,
  writeBytesAtomic,
} from './utils.js';

interface PublishContext {
  workspaceRoot: string;
}

interface PublishResult {
  outputs: TrackedOutputs;
}

function normalizeImageRef(imageRef: string): string {
  const normalizedRef = imageRef.trim();
  if (!normalizedRef) {
    throw new Error('Encountered empty image reference');
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalizedRef) || normalizedRef.startsWith('//')) {
    throw new Error(`Unexpected URL in image reference: ${imageRef}`);
  }

  if (normalizedRef.startsWith('/')) {
    throw new Error(`Unexpected absolute path in image reference: ${imageRef}`);
  }

  if (!normalizedRef.startsWith('./') && !normalizedRef.startsWith('../')) {
    return `./${normalizedRef}`;
  }
  return normalizedRef;
}

function resolveImageRef(baseDir: string, imageRef: string): string {
  return resolve(baseDir, normalize(imageRef));
}

function isAllowedGeneratedImagePath(absPath: string, postDir: string): boolean {
  return isInsideDirectory(absPath, postDir);
}

function removeGeneratedQuartoFilesDirs(postDir: string): void {
  if (!existsSync(postDir)) {
    return;
  }

  for (const entry of readdirSync(postDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!/^index(?:\.[a-z0-9_-]+)?_files$/i.test(entry.name)) {
      continue;
    }

    rmSync(join(postDir, entry.name), { recursive: true, force: true });
  }
}

export function collectOutputsFromExistingMarkdown(
  workspaceRoot: string,
  post: PostInfo,
  imageRefs: string[]
): TrackedOutputs {
  const outputs: TrackedOutputs = {
    markdown: workspaceRelative(workspaceRoot, post.mdPath),
    images: [],
  };

  const unique = new Set<string>();
  for (const imageRef of imageRefs) {
    const absPath = resolveImageRef(post.postDir, imageRef);
    if (!existsSync(absPath)) {
      continue;
    }
    if (!isAllowedGeneratedImagePath(absPath, post.postDir)) {
      continue;
    }
    unique.add(workspaceRelative(workspaceRoot, absPath));
  }

  outputs.images = [...unique].sort((a, b) => a.localeCompare(b));
  return outputs;
}

export function publishRenderedPost(
  post: PostInfo,
  renderResult: RenderSuccessResult,
  previousEntry: ManifestPostEntry | undefined,
  context: PublishContext
): PublishResult {
  const workspaceRoot = context.workspaceRoot;
  const mdSourcePath = join(renderResult.tempPostDir, 'index.md');
  const mdTargetPath = post.mdPath;

  if (!existsSync(mdSourcePath)) {
    throw new Error(`Rendered markdown missing for ${post.postKey}`);
  }

  const mdBytes = readFileSync(mdSourcePath);
  writeBytesAtomic(mdTargetPath, mdBytes);

  const previouslyTracked = new Set(previousEntry?.outputs.images ?? []);
  const producedImages = new Set(renderResult.producedImages.map((ref) => normalizeImageRef(ref)));

  const trackedImages = new Set<string>();
  for (const imageRefRaw of renderResult.referencedImages) {
    const imageRef = normalizeImageRef(imageRefRaw);
    const tempImagePath = resolveImageRef(renderResult.tempPostDir, imageRef);
    if (!existsSync(tempImagePath)) {
      continue;
    }

    const targetImagePath = resolveImageRef(post.postDir, imageRef);
    if (!isAllowedGeneratedImagePath(targetImagePath, post.postDir)) {
      continue;
    }

    ensureDir(dirname(targetImagePath));
    const imageBytes = readFileSync(tempImagePath);
    writeBytesAtomic(targetImagePath, imageBytes);

    const imageRefKey = normalizeImageRef(imageRef);
    const targetRelPath = workspaceRelative(workspaceRoot, targetImagePath);
    const wasTrackedBefore = previouslyTracked.has(targetRelPath);
    const existedBeforeHash = renderResult.sourceImageHashesBefore[imageRefKey];
    const nowHash = sha256File(tempImagePath);

    const shouldTrack =
      producedImages.has(imageRefKey) ||
      wasTrackedBefore ||
      existedBeforeHash === undefined ||
      existedBeforeHash !== nowHash;

    if (shouldTrack) {
      trackedImages.add(targetRelPath);
    }
  }

  const allowedExternalAssetsRoot = join(workspaceRoot, 'src', 'assets', 'images', 'blog');
  for (const externalDir of renderResult.consumedExternalAssetDirs) {
    const resolvedDir = resolve(externalDir);
    if (!isInsideDirectory(resolvedDir, allowedExternalAssetsRoot)) {
      continue;
    }
    if (existsSync(resolvedDir)) {
      rmSync(resolvedDir, { recursive: true, force: true });
    }
  }

  removeGeneratedQuartoFilesDirs(post.postDir);

  return {
    outputs: {
      markdown: workspaceRelative(workspaceRoot, mdTargetPath),
      images: [...trackedImages].sort((a, b) => a.localeCompare(b)),
    },
  };
}
