import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { PIPELINE_VERSION } from './constants.js';
import type { DependencyRecord, FingerprintResult, ToolchainInfo } from './types.js';
import { sha256File, sha256Text, workspaceRelative } from './utils.js';

function runCommand(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error || result.status !== 0) {
    return 'unknown';
  }

  const output = (result.stdout || '').trim();
  if (!output) {
    return 'unknown';
  }

  return output.split(/\r?\n/)[0].trim();
}

export function detectToolchain(): ToolchainInfo {
  return {
    pipelineVersion: PIPELINE_VERSION,
    quartoVersion: runCommand('quarto', ['--version']),
    pandocVersion: runCommand('quarto', ['pandoc', '--version']),
  };
}

function digestForPath(absolutePath: string): string {
  if (!existsSync(absolutePath)) {
    return 'missing';
  }

  try {
    return sha256File(absolutePath);
  } catch {
    return 'unreadable';
  }
}

export function computeFingerprint(
  workspaceRoot: string,
  dependencyRecords: DependencyRecord[],
  toolchain: ToolchainInfo
): FingerprintResult {
  const dependencyDigests: Record<string, string> = {};

  for (const dependency of dependencyRecords) {
    const relPath = workspaceRelative(workspaceRoot, dependency.path);
    dependencyDigests[relPath] = digestForPath(dependency.path);
  }

  const payload = {
    toolchain,
    dependencies: Object.keys(dependencyDigests)
      .sort((a, b) => a.localeCompare(b))
      .map((pathKey) => ({
        path: pathKey,
        digest: dependencyDigests[pathKey],
      })),
  };

  return {
    fingerprint: sha256Text(JSON.stringify(payload)),
    dependencyDigests,
  };
}
