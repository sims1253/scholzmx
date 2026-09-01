#!/usr/bin/env node

import { runBlogBuild } from './blog-build/index.js';

interface ParsedArgs {
  force: boolean;
  clean: boolean;
  planOnly: boolean;
  help: boolean;
  specificFile?: string;
}

function printUsage(): void {
  console.log('Usage: bun run build-blog [--force] [--clean] [--plan] [path/to/post/index.qmd]');
  console.log('Options:');
  console.log('  --force       Force rebuild even if manifest says up to date');
  console.log('  --clean       Delete all generated outputs and cache, then rebuild from scratch');
  console.log('  --plan        Print render/skip/prune plan without writing files');
  console.log('  -h, --help    Show this help message');
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    force: false,
    clean: false,
    planOnly: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--force') {
      parsed.force = true;
      continue;
    }

    if (arg === '--clean') {
      parsed.clean = true;
      continue;
    }

    if (arg === '--plan') {
      parsed.planOnly = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    if (arg.endsWith('/index.qmd')) {
      if (parsed.specificFile) {
        throw new Error('Only one specific post path can be provided');
      }
      parsed.specificFile = arg;
      continue;
    }

    if (arg.endsWith('.qmd')) {
      throw new Error(
        'QMD file must be named index.qmd and follow src/content/blog/YYYY/MM-DD-post-name/index.qmd'
      );
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

async function main(): Promise<number> {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printUsage();
      return 0;
    }

    const stats = await runBlogBuild(options);
    return stats.failed > 0 ? 1 : 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printUsage();
    return 1;
  }
}

if (import.meta.main) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
