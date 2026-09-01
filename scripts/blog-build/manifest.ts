import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { MANIFEST_PATH, MANIFEST_VERSION, PIPELINE_VERSION } from './constants.js';
import type { BuildManifest, ToolchainInfo } from './types.js';
import { ensureDir, readText, writeTextAtomic } from './utils.js';

function defaultToolchain(): ToolchainInfo {
  return {
    pipelineVersion: PIPELINE_VERSION,
    quartoVersion: 'unknown',
    pandocVersion: 'unknown',
  };
}

export function createEmptyManifest(): BuildManifest {
  return {
    version: MANIFEST_VERSION,
    toolchain: defaultToolchain(),
    posts: {},
  };
}

function isValidManifest(input: unknown): input is BuildManifest {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<BuildManifest>;
  if (candidate.version !== MANIFEST_VERSION) {
    return false;
  }

  if (!candidate.toolchain || typeof candidate.toolchain !== 'object') {
    return false;
  }

  if (!candidate.posts || typeof candidate.posts !== 'object') {
    return false;
  }

  return true;
}

export function loadManifest(): BuildManifest {
  if (!existsSync(MANIFEST_PATH)) {
    return createEmptyManifest();
  }

  try {
    const raw = readText(MANIFEST_PATH);
    const parsed = JSON.parse(raw);
    if (!isValidManifest(parsed)) {
      console.warn(`Invalid manifest at ${MANIFEST_PATH}; starting with empty manifest.`);
      return createEmptyManifest();
    }
    return parsed;
  } catch (error) {
    console.warn(
      `Failed to load manifest at ${MANIFEST_PATH}; starting with empty manifest.`,
      error
    );
    return createEmptyManifest();
  }
}

export function saveManifest(manifest: BuildManifest): void {
  ensureDir(dirname(MANIFEST_PATH));
  writeTextAtomic(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}
