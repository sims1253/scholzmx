import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'src');
const ALLOWED_UNDEFINED_PREFIXES = ['--shiki-'];

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      if (entry.isFile() && (fullPath.endsWith('.css') || fullPath.endsWith('.astro'))) {
        return [fullPath];
      }
      return [];
    })
  );
  return files.flat();
}

function collectDefinedTokens(source: string): Set<string> {
  const result = new Set<string>();
  const definitionPattern = /(--[a-z0-9-]+)\s*:/gi;
  for (const match of source.matchAll(definitionPattern)) {
    result.add(match[1]);
  }
  return result;
}

function collectTokenUsesWithoutFallback(source: string): string[] {
  const result: string[] = [];
  const usagePattern = /var\(\s*(--[a-z0-9-]+)\s*(,\s*[^)]+)?\)/gi;
  for (const match of source.matchAll(usagePattern)) {
    const token = match[1];
    const hasFallback = Boolean(match[2]);
    if (!hasFallback) result.push(token);
  }
  return result;
}

async function main() {
  const files = await walk(SRC_DIR);

  const defined = new Set<string>();
  const usedByFile = new Map<string, string[]>();

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const token of collectDefinedTokens(content)) {
      defined.add(token);
    }
    usedByFile.set(file, collectTokenUsesWithoutFallback(content));
  }

  const violations: Array<{ file: string; token: string }> = [];

  for (const [file, tokens] of usedByFile) {
    const seen = new Set<string>();
    for (const token of tokens) {
      if (seen.has(token)) continue;
      seen.add(token);
      if (!defined.has(token)) {
        if (ALLOWED_UNDEFINED_PREFIXES.some((prefix) => token.startsWith(prefix))) {
          continue;
        }
        violations.push({ file, token });
      }
    }
  }

  if (violations.length > 0) {
    console.error('Undefined CSS custom properties detected:');
    for (const violation of violations) {
      const rel = violation.file.replace(`${ROOT}/`, '');
      console.error(`- ${rel}: ${violation.token}`);
    }
    process.exit(1);
  }

  console.log(`Token check passed (${defined.size} defined tokens scanned).`);
}

await main();
