import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { IMAGE_EXTENSIONS } from './constants.js';

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function workspaceRelative(workspaceRoot: string, absolutePath: string): string {
  const rel = relative(workspaceRoot, absolutePath);
  return normalizeToPosix(rel || '.');
}

export function normalizeToPosix(value: string): string {
  return value.split(sep).join('/');
}

export function readText(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

export function writeTextAtomic(filePath: string, content: string): void {
  ensureDir(dirname(filePath));
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tempPath, content, 'utf8');
    renameSync(tempPath, filePath);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
}

export function writeBytesAtomic(filePath: string, bytes: Uint8Array): void {
  ensureDir(dirname(filePath));
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tempPath, bytes);
    renameSync(tempPath, filePath);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
}

export function sha256Text(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function sha256File(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

export function listFilesRecursively(rootDir: string): string[] {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  };

  walk(rootDir);
  return files.sort();
}

export function listImageFilesRecursively(rootDir: string): string[] {
  return listFilesRecursively(rootDir).filter((filePath) =>
    IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase())
  );
}

export function fileExists(filePath: string): boolean {
  return existsSync(filePath) && statSync(filePath).isFile();
}

export function removePathIfExists(path: string): void {
  if (!existsSync(path)) {
    return;
  }
  rmSync(path, { recursive: true, force: true });
}

export function copyDir(sourceDir: string, targetDir: string): void {
  removePathIfExists(targetDir);
  ensureDir(dirname(targetDir));
  cpSync(sourceDir, targetDir, {
    recursive: true,
    force: true,
    errorOnExist: false,
    preserveTimestamps: false,
  });
}

export function removeEmptyDirectoryIfPossible(dirPath: string): void {
  if (!existsSync(dirPath)) {
    return;
  }
  try {
    if (readdirSync(dirPath).length > 0) {
      return;
    }
    rmSync(dirPath, { recursive: false, force: false });
  } catch {
    // Keep directory if there are non-generated files.
  }
}

export function resolveLocalPath(
  rawPath: string,
  baseDir: string,
  workspaceRoot: string
): string | null {
  const trimmed = rawPath.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed) {
    return null;
  }

  if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(trimmed) || trimmed.startsWith('#')) {
    return null;
  }

  const withoutQuery = trimmed.split('?')[0].split('#')[0];
  if (!withoutQuery) {
    return null;
  }

  if (withoutQuery.startsWith('//')) {
    return null;
  }

  let resolvedPath: string;
  if (isAbsolute(withoutQuery)) {
    resolvedPath = resolve(workspaceRoot, withoutQuery.slice(1));
  } else {
    resolvedPath = resolve(baseDir, withoutQuery);
  }

  if (
    !resolvedPath.startsWith(resolve(workspaceRoot) + sep) &&
    resolvedPath !== resolve(workspaceRoot)
  ) {
    return null;
  }

  return resolvedPath;
}

export function isInsideDirectory(candidatePath: string, directoryPath: string): boolean {
  const candidate = resolve(candidatePath);
  const directory = resolve(directoryPath);
  return candidate === directory || candidate.startsWith(`${directory}${sep}`);
}

export function deleteFileSafe(filePath: string): void {
  if (fileExists(filePath)) {
    unlinkSync(filePath);
  }
}
