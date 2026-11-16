// Warns before a build when Quarto posts have not been rendered to Markdown.
// The blog collection reads only index.md, so an unrendered index.qmd would
// silently drop the post from the site. This warns and never fails the build.
import { existsSync, globSync } from 'node:fs';
import { dirname, join } from 'node:path';

const missing = globSync('src/content/blog/**/index.qmd')
  .filter((source) => !existsSync(join(dirname(source), 'index.md')))
  .sort();

if (missing.length > 0) {
  const list = missing.map((source) => `  - ${source}`).join('\n');
  console.warn(
    `\n⚠ ${missing.length} Quarto post(s) are not rendered and will be MISSING from this build:\n` +
      `${list}\n` +
      `  Run \`bun run build-blog\` to render them (needs quarto and R).\n`
  );
}
