import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LEGACY_CACHE_DIR } from './constants.js';
import { collectDependencyRecords, formatDependencyListForManifest } from './dependencies.js';
import { computeFingerprint } from './fingerprint.js';
import { collectReferencedLocalImages } from './postprocess.js';
import { collectOutputsFromExistingMarkdown } from './publish.js';
import type {
  BuildManifest,
  BuildPlan,
  ManifestPostEntry,
  PlanDecision,
  PostInfo,
  ToolchainInfo,
} from './types.js';
import { readText, sha256File, workspaceRelative } from './utils.js';

interface PlannerOptions {
  workspaceRoot: string;
  posts: PostInfo[];
  previousManifest: BuildManifest;
  force: boolean;
  specificFileMode: boolean;
  toolchain: ToolchainInfo;
  transformScriptPath: string;
  pipelineEntrypointPath: string;
  quartoConfigPath: string;
}

function getLegacyCachePath(workspaceRoot: string, post: PostInfo): string {
  const rel = workspaceRelative(workspaceRoot, post.qmdPath);
  const safePath = rel.replace(/\//g, '_');
  return join(workspaceRoot, LEGACY_CACHE_DIR, `${safePath}.hash`);
}

function hasLegacyCacheHit(workspaceRoot: string, post: PostInfo): boolean {
  const legacyPath = getLegacyCachePath(workspaceRoot, post);
  if (!existsSync(legacyPath)) {
    return false;
  }
  if (!existsSync(post.mdPath)) {
    return false;
  }

  try {
    const cachedHash = readText(legacyPath).trim();
    const currentHash = sha256File(post.qmdPath);
    return cachedHash === currentHash;
  } catch {
    return false;
  }
}

function summarizeDependencyChanges(
  previousEntry: ManifestPostEntry,
  currentDigests: Record<string, string>,
  toolchainChanged: boolean
): string {
  const changed: string[] = [];
  const keys = new Set([
    ...Object.keys(previousEntry.dependencyDigests ?? {}),
    ...Object.keys(currentDigests),
  ]);

  for (const key of keys) {
    const before = previousEntry.dependencyDigests?.[key] ?? 'missing';
    const after = currentDigests[key] ?? 'missing';
    if (before !== after) {
      changed.push(key);
    }
  }

  const snippets: string[] = [];
  if (toolchainChanged) {
    snippets.push('toolchain changed');
  }
  if (changed.length > 0) {
    const preview = changed.slice(0, 3).join(', ');
    snippets.push(
      changed.length > 3
        ? `dependencies changed (${preview}, +${changed.length - 3} more)`
        : `dependencies changed (${preview})`
    );
  }

  if (snippets.length === 0) {
    return 'fingerprint changed';
  }

  return snippets.join('; ');
}

function findMissingOutputs(workspaceRoot: string, entry: ManifestPostEntry | undefined): string[] {
  if (!entry) {
    return [];
  }

  const outputs = [entry.outputs.markdown, ...entry.outputs.images];
  const missing: string[] = [];
  for (const output of outputs) {
    const outputPath = resolve(workspaceRoot, output);
    if (!existsSync(outputPath)) {
      missing.push(output);
    }
  }

  return missing;
}

function deriveOutputsHint(
  workspaceRoot: string,
  post: PostInfo,
  previousEntry: ManifestPostEntry | undefined
) {
  if (existsSync(post.mdPath)) {
    const markdown = readText(post.mdPath);
    const refs = collectReferencedLocalImages(markdown);
    return collectOutputsFromExistingMarkdown(workspaceRoot, post, refs);
  }

  if (previousEntry) {
    return previousEntry.outputs;
  }

  return {
    markdown: workspaceRelative(workspaceRoot, post.mdPath),
    images: [],
  };
}

export function buildPlan(options: PlannerOptions): BuildPlan {
  const decisions: PlanDecision[] = [];

  for (const post of options.posts) {
    const previousEntry = options.previousManifest.posts[post.postKey];
    const dependencyRecords = collectDependencyRecords(
      options.workspaceRoot,
      post,
      options.transformScriptPath,
      options.pipelineEntrypointPath,
      options.quartoConfigPath
    );
    const dependenciesForManifest = formatDependencyListForManifest(
      options.workspaceRoot,
      dependencyRecords
    );

    const fingerprintResult = computeFingerprint(
      options.workspaceRoot,
      dependencyRecords,
      options.toolchain
    );

    const missingOutputs = findMissingOutputs(options.workspaceRoot, previousEntry);
    const legacyCacheHit = hasLegacyCacheHit(options.workspaceRoot, post);
    const outputsHint = deriveOutputsHint(options.workspaceRoot, post, previousEntry);

    let action: PlanDecision['action'];
    let reason: string;

    if (options.force) {
      action = 'render';
      reason = 'force rebuild requested';
    } else if (!existsSync(post.mdPath)) {
      action = 'render';
      reason = 'missing markdown output';
    } else if (previousEntry && missingOutputs.length > 0) {
      action = 'render';
      reason = `missing tracked outputs (${missingOutputs.length})`;
    } else if (!previousEntry && legacyCacheHit) {
      action = 'skip';
      reason = 'legacy .blog-cache hit (bootstrap manifest)';
    } else if (!previousEntry) {
      action = 'render';
      reason = 'post not yet tracked in manifest';
    } else if (fingerprintResult.fingerprint !== previousEntry.fingerprint) {
      const toolchainChanged =
        options.previousManifest.toolchain.quartoVersion !== options.toolchain.quartoVersion ||
        options.previousManifest.toolchain.pandocVersion !== options.toolchain.pandocVersion ||
        options.previousManifest.toolchain.pipelineVersion !== options.toolchain.pipelineVersion;
      action = 'render';
      reason = summarizeDependencyChanges(
        previousEntry,
        fingerprintResult.dependencyDigests,
        toolchainChanged
      );
    } else {
      action = 'skip';
      reason = 'up to date';
    }

    decisions.push({
      post,
      action,
      reason,
      dependencies: dependenciesForManifest,
      fingerprint: fingerprintResult.fingerprint,
      dependencyDigests: fingerprintResult.dependencyDigests,
      outputsHint,
    });
  }

  const currentPostKeys = new Set(options.posts.map((post) => post.postKey));
  const deletedPostKeys = options.specificFileMode
    ? []
    : Object.keys(options.previousManifest.posts)
        .filter((postKey) => !currentPostKeys.has(postKey))
        .sort((a, b) => a.localeCompare(b));

  decisions.sort((a, b) => a.post.postKey.localeCompare(b.post.postKey));

  return {
    decisions,
    deletedPostKeys,
  };
}
