import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { BuildManifest, TrackedOutputs } from './types.js';
import { isInsideDirectory } from './utils.js';

interface PruneResult {
  removed: string[];
}

function outputsToPaths(outputs: TrackedOutputs): string[] {
  return [outputs.markdown, ...outputs.images];
}

function toAbsolutePaths(workspaceRoot: string, trackedPaths: string[]): string[] {
  return trackedPaths.map((pathValue) => resolve(workspaceRoot, pathValue));
}

function safeDelete(filePath: string, allowedRoot: string): boolean {
  const resolved = resolve(filePath);
  if (!isInsideDirectory(resolved, allowedRoot)) {
    return false;
  }
  if (!existsSync(resolved)) {
    return false;
  }

  rmSync(resolved, { force: true, recursive: false });
  return true;
}

export function pruneTrackedOutputs(
  workspaceRoot: string,
  previousManifest: BuildManifest,
  nextManifest: BuildManifest,
  deletedPostKeys: string[]
): PruneResult {
  const removed = new Set<string>();
  const allowedRoot = join(workspaceRoot, 'src', 'content', 'blog');

  for (const deletedPostKey of deletedPostKeys) {
    const oldEntry = previousManifest.posts[deletedPostKey];
    if (!oldEntry) {
      continue;
    }

    for (const absPath of toAbsolutePaths(workspaceRoot, outputsToPaths(oldEntry.outputs))) {
      if (safeDelete(absPath, allowedRoot)) {
        removed.add(absPath);
      }
    }
  }

  for (const [postKey, oldEntry] of Object.entries(previousManifest.posts)) {
    if (deletedPostKeys.includes(postKey)) {
      continue;
    }

    const newEntry = nextManifest.posts[postKey];
    if (!newEntry) {
      continue;
    }

    const oldOutputs = new Set(outputsToPaths(oldEntry.outputs));
    const newOutputs = new Set(outputsToPaths(newEntry.outputs));

    for (const oldOutput of oldOutputs) {
      if (newOutputs.has(oldOutput)) {
        continue;
      }

      const absPath = resolve(workspaceRoot, oldOutput);
      if (safeDelete(absPath, allowedRoot)) {
        removed.add(absPath);
      }
    }
  }

  return {
    removed: [...removed].sort((a, b) => a.localeCompare(b)),
  };
}
