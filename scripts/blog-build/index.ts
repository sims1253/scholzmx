import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  BLOG_DIR,
  CACHE_ROOT,
  ERRORS_ROOT,
  LEGACY_CACHE_DIR,
  MANIFEST_VERSION,
} from './constants.js';
import { discoverPosts } from './discover.js';
import { detectToolchain } from './fingerprint.js';
import { createEmptyManifest, loadManifest, saveManifest } from './manifest.js';
import { buildPlan } from './plan.js';
import { publishRenderedPost } from './publish.js';
import { pruneTrackedOutputs } from './prune.js';
import { renderPostToTemp } from './render.js';
import type { BuildManifest, BuildOptions, BuildStats, ManifestPostEntry } from './types.js';
import { ensureDir, removePathIfExists, sha256File, workspaceRelative } from './utils.js';

class PromiseQueue {
  private readonly concurrency: number;
  private running = 0;
  private readonly queue: Array<() => Promise<void>> = [];
  private readonly idleResolvers: Array<() => void> = [];

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  add(task: () => Promise<void>): void {
    this.queue.push(task);
    this.runNext();
  }

  private runNext(): void {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) {
      return;
    }

    this.running += 1;
    task()
      .catch(() => {
        // Errors are handled inside task.
      })
      .finally(() => {
        this.running -= 1;
        this.runNext();
        this.resolveIfIdle();
      });
  }

  private resolveIfIdle(): void {
    if (this.running !== 0 || this.queue.length !== 0) {
      return;
    }

    while (this.idleResolvers.length > 0) {
      const resolveIdle = this.idleResolvers.shift();
      resolveIdle?.();
    }
  }

  onIdle(): Promise<void> {
    if (this.running === 0 && this.queue.length === 0) {
      return Promise.resolve();
    }
    return new Promise((resolvePromise) => {
      this.idleResolvers.push(resolvePromise);
    });
  }
}

function getNowIsoString(): string {
  return new Date().toISOString();
}

function writeErrorLog(workspaceRoot: string, postKey: string, content: string): string {
  const safeName = postKey.replace(/\//g, '__');
  const logPath = join(workspaceRoot, ERRORS_ROOT, `${safeName}.log`);
  ensureDir(dirname(logPath));
  writeFileSync(logPath, content, 'utf8');
  return logPath;
}

function writeLegacyCacheHash(workspaceRoot: string, qmdPath: string): void {
  const rel = workspaceRelative(workspaceRoot, qmdPath);
  const safe = rel.replace(/\//g, '__');
  const targetPath = join(workspaceRoot, LEGACY_CACHE_DIR, `${safe}.hash`);
  ensureDir(dirname(targetPath));
  writeFileSync(targetPath, `${sha256File(qmdPath)}\n`, 'utf8');
}

function createNextManifest(previousManifest: BuildManifest): BuildManifest {
  return {
    version: MANIFEST_VERSION,
    toolchain: previousManifest.toolchain,
    posts: { ...previousManifest.posts },
  };
}

function formatDecisionLine(action: string, postPath: string, reason: string): string {
  return `[${action}] ${postPath} -> ${reason}`;
}

function cleanQuartoCaches(workspaceRoot: string): number {
  const blogDir = join(workspaceRoot, BLOG_DIR);
  const cacheDirNames = new Set(['_cache', '_freeze', '.quarto']);
  let deleted = 0;

  function walk(dir: string): void {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const fullPath = join(dir, entry.name);
      if (cacheDirNames.has(entry.name)) {
        rmSync(fullPath, { recursive: true, force: true });
        deleted += 1;
      } else {
        walk(fullPath);
      }
    }
  }

  walk(blogDir);
  return deleted;
}

function printPlan(
  workspaceRoot: string,
  decisions: ReturnType<typeof buildPlan>['decisions'],
  deletedPostKeys: string[]
): void {
  console.log('Build plan:');
  for (const decision of decisions) {
    const qmdPath = workspaceRelative(workspaceRoot, decision.post.qmdPath);
    console.log(formatDecisionLine(decision.action, qmdPath, decision.reason));
  }

  for (const deletedPostKey of deletedPostKeys) {
    console.log(`[prune] ${deletedPostKey} -> source post removed`);
  }
}

function upsertManifestEntry(
  manifest: BuildManifest,
  postKey: string,
  entry: Omit<ManifestPostEntry, 'builtAt'> & { builtAt?: string }
): void {
  manifest.posts[postKey] = {
    ...entry,
    builtAt: entry.builtAt ?? getNowIsoString(),
  };
}

export async function runBlogBuild(options: BuildOptions): Promise<BuildStats> {
  const workspaceRoot = process.cwd();

  if (options.clean) {
    const manifest = loadManifest();
    const outputsDeleted: string[] = [];

    for (const [postKey, entry] of Object.entries(manifest.posts)) {
      const postDir = join(workspaceRoot, 'src/content/blog', postKey);

      const mdPath = join(postDir, entry.outputs.markdown);
      if (existsSync(mdPath)) {
        rmSync(mdPath, { force: true });
        outputsDeleted.push(mdPath);
      }

      for (const imageRef of entry.outputs.images) {
        const imagePath = join(postDir, imageRef);
        if (existsSync(imagePath)) {
          rmSync(imagePath, { force: true });
          outputsDeleted.push(imagePath);
        }
      }
    }

    const cachePath = join(workspaceRoot, CACHE_ROOT);
    if (existsSync(cachePath)) {
      rmSync(cachePath, { recursive: true, force: true });
    }

    const legacyCachePath = join(workspaceRoot, LEGACY_CACHE_DIR);
    if (existsSync(legacyCachePath)) {
      rmSync(legacyCachePath, { recursive: true, force: true });
    }

    const quartoCacheCount = cleanQuartoCaches(workspaceRoot);

    console.log(
      `Cleaned ${outputsDeleted.length} generated files, ${quartoCacheCount} Quarto cache dirs`
    );
  }

  const previousManifest = loadManifest();
  const toolchain = detectToolchain();

  previousManifest.toolchain = previousManifest.toolchain ?? createEmptyManifest().toolchain;

  const posts = discoverPosts(workspaceRoot, options.specificFile);

  const plan = buildPlan({
    workspaceRoot,
    posts,
    previousManifest,
    force: options.force,
    specificFileMode: Boolean(options.specificFile),
    toolchain,
    transformScriptPath: 'scripts/markdown-transforms.ts',
    pipelineEntrypointPath: 'scripts/build-blog-cli.ts',
    quartoConfigPath: '_quarto.yml',
  });

  printPlan(workspaceRoot, plan.decisions, plan.deletedPostKeys);

  if (options.planOnly) {
    return {
      rendered: 0,
      cached: plan.decisions.filter((decision) => decision.action === 'skip').length,
      failed: 0,
      pruned: 0,
    };
  }

  mkdirSync(resolve(workspaceRoot, CACHE_ROOT), { recursive: true });

  const nextManifest = createNextManifest(previousManifest);
  nextManifest.toolchain = toolchain;

  const stats: BuildStats = {
    rendered: 0,
    cached: 0,
    failed: 0,
    pruned: 0,
  };

  for (const decision of plan.decisions) {
    if (decision.action === 'skip') {
      stats.cached += 1;
      const previousEntry = previousManifest.posts[decision.post.postKey];
      upsertManifestEntry(nextManifest, decision.post.postKey, {
        fingerprint: decision.fingerprint,
        dependencies: decision.dependencies,
        dependencyDigests: decision.dependencyDigests,
        outputs: decision.outputsHint,
        builtAt: previousEntry?.builtAt,
      });
    }
  }

  const queue = new PromiseQueue(4);
  for (const decision of plan.decisions) {
    if (decision.action !== 'render') {
      continue;
    }

    queue.add(async () => {
      const previousEntry = previousManifest.posts[decision.post.postKey];
      const renderResult = await renderPostToTemp(decision.post, { workspaceRoot });

      try {
        if (!renderResult.ok) {
          stats.failed += 1;
          const errorPath = writeErrorLog(workspaceRoot, decision.post.postKey, renderResult.error);
          console.error(
            `Render failed for ${decision.post.postKey}. See ${workspaceRelative(workspaceRoot, errorPath)}`
          );

          if (previousEntry) {
            nextManifest.posts[decision.post.postKey] = previousEntry;
          } else {
            delete nextManifest.posts[decision.post.postKey];
          }
          return;
        }

        try {
          const publishResult = publishRenderedPost(decision.post, renderResult, previousEntry, {
            workspaceRoot,
          });

          upsertManifestEntry(nextManifest, decision.post.postKey, {
            fingerprint: decision.fingerprint,
            dependencies: decision.dependencies,
            dependencyDigests: decision.dependencyDigests,
            outputs: publishResult.outputs,
          });
          writeLegacyCacheHash(workspaceRoot, decision.post.qmdPath);
          stats.rendered += 1;
        } catch (error) {
          stats.failed += 1;
          const errorPath = writeErrorLog(
            workspaceRoot,
            decision.post.postKey,
            error instanceof Error ? (error.stack ?? error.message) : String(error)
          );
          console.error(
            `Publish failed for ${decision.post.postKey}. See ${workspaceRelative(workspaceRoot, errorPath)}`
          );

          if (previousEntry) {
            nextManifest.posts[decision.post.postKey] = previousEntry;
          } else {
            delete nextManifest.posts[decision.post.postKey];
          }
        }
      } finally {
        removePathIfExists(renderResult.tempPostDir);
      }
    });
  }

  await queue.onIdle();

  for (const deletedPostKey of plan.deletedPostKeys) {
    delete nextManifest.posts[deletedPostKey];
  }

  const pruneResult = pruneTrackedOutputs(
    workspaceRoot,
    previousManifest,
    nextManifest,
    plan.deletedPostKeys
  );
  stats.pruned = pruneResult.removed.length;
  if (pruneResult.removed.length > 0) {
    console.log('Pruned outputs:');
    for (const removedPath of pruneResult.removed) {
      console.log(`  - ${workspaceRelative(workspaceRoot, removedPath)}`);
    }
  }

  saveManifest(nextManifest);

  console.log(
    `\nRendered: ${stats.rendered}, Cached: ${stats.cached}, Failed: ${stats.failed}, Pruned: ${stats.pruned}`
  );

  return stats;
}
