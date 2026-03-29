import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { ARTIFACTS_ROOT, IMAGE_EXTENSIONS, QUARTO_TIMEOUT_MS } from './constants.js';
import { collectReferencedLocalImages, runMarkdownTransformPipeline } from './postprocess.js';
import type { PostInfo, RenderResult } from './types.js';
import {
  copyDir,
  ensureDir,
  listImageFilesRecursively,
  normalizeToPosix,
  readText,
  removePathIfExists,
  sha256File,
  writeTextAtomic,
} from './utils.js';

interface RenderContext {
  workspaceRoot: string;
}

function toImageRef(postDir: string, absoluteImagePath: string): string {
  const rel = normalizeToPosix(relative(postDir, absoluteImagePath));
  if (rel.startsWith('./')) {
    return rel;
  }
  return `./${rel}`;
}

function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function collectImageHashes(postDir: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const imagePath of listImageFilesRecursively(postDir)) {
    const key = toImageRef(postDir, imagePath);
    result[key] = sha256File(imagePath);
  }
  return result;
}

function copyImageToPostDir(
  srcPath: string,
  postDir: string,
  producedImages: Set<string>,
  sourceByDestination: Map<string, string>
): void {
  const destPath = join(postDir, basename(srcPath));

  const previousSource = sourceByDestination.get(destPath);
  if (previousSource && previousSource !== srcPath) {
    throw new Error(
      `Image filename collision: ${basename(srcPath)} maps from both ${previousSource} and ${srcPath}`
    );
  }

  const bytes = readFileSync(srcPath);
  writeFileSync(destPath, bytes);
  sourceByDestination.set(destPath, srcPath);
  producedImages.add(toImageRef(postDir, destPath));
}

function copyImagesRecursivelyFlattened(
  sourceDir: string,
  postDir: string,
  producedImages: Set<string>,
  sourceByDestination: Map<string, string>
): void {
  if (!existsSync(sourceDir)) {
    return;
  }

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && isImageFile(entry.name)) {
        copyImageToPostDir(fullPath, postDir, producedImages, sourceByDestination);
      }
    }
  };

  walk(sourceDir);
}

function moveQuartoGeneratedFilesImages(
  tempPostDir: string,
  producedImages: Set<string>,
  sourceByDestination: Map<string, string>
): void {
  for (const entry of readdirSync(tempPostDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!/^index(?:\.[a-z0-9_-]+)?_files$/i.test(entry.name)) {
      continue;
    }

    const filesDir = join(tempPostDir, entry.name);
    copyImagesRecursivelyFlattened(filesDir, tempPostDir, producedImages, sourceByDestination);
    rmSync(filesDir, { recursive: true, force: true });
  }
}

function moveNestedAssetsImages(
  tempPostDir: string,
  producedImages: Set<string>,
  sourceByDestination: Map<string, string>
): void {
  const nestedAssetsDir = join(tempPostDir, 'src', 'assets', 'images', 'blog');
  if (!existsSync(nestedAssetsDir)) {
    return;
  }

  copyImagesRecursivelyFlattened(nestedAssetsDir, tempPostDir, producedImages, sourceByDestination);
  rmSync(join(tempPostDir, 'src'), { recursive: true, force: true });
}

function copyExternalAssetsImages(
  workspaceRoot: string,
  post: PostInfo,
  tempPostDir: string,
  producedImages: Set<string>,
  sourceByDestination: Map<string, string>
): string[] {
  const sourceDir = join(workspaceRoot, 'src', 'assets', 'images', 'blog', post.year, post.slug);
  if (!existsSync(sourceDir)) {
    return [];
  }

  copyImagesRecursivelyFlattened(sourceDir, tempPostDir, producedImages, sourceByDestination);
  return [sourceDir];
}

function runQuarto(postDir: string): Promise<{ success: boolean; stderr: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort();
    }, QUARTO_TIMEOUT_MS);

    let settled = false;
    let timedOut = false;
    let killTimer: NodeJS.Timeout | undefined;

    const finalize = (result: { success: boolean; stderr: string }): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (killTimer) {
        clearTimeout(killTimer);
      }
      resolvePromise(result);
    };

    const processHandle = spawn('quarto', ['render', 'index.qmd', '--execute-daemon=false'], {
      cwd: postDir,
      stdio: ['ignore', 'inherit', 'pipe'],
      signal: abortController.signal,
    });

    let stderr = '';
    processHandle.stderr?.setEncoding('utf8');
    processHandle.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });

    abortController.signal.addEventListener(
      'abort',
      () => {
        timedOut = true;
        if (!processHandle.killed) {
          processHandle.kill('SIGTERM');
        }

        killTimer = setTimeout(() => {
          if (!processHandle.killed) {
            processHandle.kill('SIGKILL');
          }
        }, 1000);
      },
      { once: true }
    );

    processHandle.on('close', (code) => {
      const timeoutMessage = timedOut
        ? `\nQuarto render timed out after ${Math.round(QUARTO_TIMEOUT_MS / 1000)}s`
        : '';
      finalize({ success: code === 0 && !timedOut, stderr: `${stderr}${timeoutMessage}`.trim() });
    });

    processHandle.on('error', (error) => {
      clearTimeout(timeout);
      if ((error as NodeJS.ErrnoException).name === 'AbortError' || timedOut) {
        finalize({
          success: false,
          stderr: `Quarto render timed out after ${Math.round(QUARTO_TIMEOUT_MS / 1000)}s`,
        });
        return;
      }
      rejectPromise(error);
    });
  });
}

function buildTempPostDir(workspaceRoot: string, post: PostInfo): string {
  const safePostKey = post.postKey.replace(/\//g, '__');
  return join(workspaceRoot, ARTIFACTS_ROOT, safePostKey, 'work');
}

function copyWorkspaceQuartoConfig(workspaceRoot: string, tempPostDir: string): void {
  const quartoConfigPath = join(workspaceRoot, '_quarto.yml');
  if (!existsSync(quartoConfigPath)) {
    return;
  }

  const targetPath = join(tempPostDir, '_quarto.yml');
  const configBytes = readFileSync(quartoConfigPath);
  writeFileSync(targetPath, configBytes);
}

export async function renderPostToTemp(
  post: PostInfo,
  context: RenderContext
): Promise<RenderResult> {
  const tempPostDir = buildTempPostDir(context.workspaceRoot, post);
  ensureDir(dirname(tempPostDir));
  removePathIfExists(tempPostDir);
  copyDir(post.postDir, tempPostDir);
  copyWorkspaceQuartoConfig(context.workspaceRoot, tempPostDir);

  const sourceImageHashesBefore = collectImageHashes(post.postDir);
  const producedImages = new Set<string>();
  const sourceByDestination = new Map<string, string>();
  const consumedExternalAssetDirs: string[] = [];

  try {
    const quartoResult = await runQuarto(tempPostDir);
    if (!quartoResult.success) {
      return {
        ok: false,
        error: quartoResult.stderr || 'Quarto render failed',
        tempPostDir,
        sourceImageHashesBefore,
      };
    }

    const tempMdPath = join(tempPostDir, 'index.md');
    if (!existsSync(tempMdPath)) {
      return {
        ok: false,
        error: 'Quarto render did not produce index.md',
        tempPostDir,
        sourceImageHashesBefore,
      };
    }

    moveQuartoGeneratedFilesImages(tempPostDir, producedImages, sourceByDestination);
    moveNestedAssetsImages(tempPostDir, producedImages, sourceByDestination);
    consumedExternalAssetDirs.push(
      ...copyExternalAssetsImages(
        context.workspaceRoot,
        post,
        tempPostDir,
        producedImages,
        sourceByDestination
      )
    );

    const markdownInput = readText(tempMdPath);
    const transformedMarkdown = runMarkdownTransformPipeline(markdownInput);
    writeTextAtomic(tempMdPath, transformedMarkdown);

    return {
      ok: true,
      tempPostDir,
      transformedMarkdown,
      referencedImages: collectReferencedLocalImages(transformedMarkdown),
      producedImages: [...producedImages].sort((a, b) => a.localeCompare(b)),
      consumedExternalAssetDirs,
      sourceImageHashesBefore,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? (error.stack ?? error.message) : String(error),
      tempPostDir,
      sourceImageHashesBefore,
    };
  }
}
