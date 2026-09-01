/**
 * Markdown Transform Functions
 *
 * Pure functions for post-processing Quarto-generated markdown content.
 * These functions are extracted for independent testing.
 */

// ============================================
// Post-Processing Functions (Single-Pass)
// ============================================

/**
 * Convert HTML `<figure>` blocks containing `<img>` to markdown image syntax.
 *
 * Quarto generates `<figure>` blocks when code chunks use `fig-cap`. These
 * bypass Astro's Image component pipeline (which only handles markdown `![]()`),
 * resulting in broken images and no optimization.
 *
 * Figures without `<img>` (e.g. containing `<video>`) are left unchanged.
 *
 * @param content - The markdown content to transform
 * @returns Transformed content with figure blocks converted to markdown images
 */
export function convertFiguresToMarkdown(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inFigure = false;
  let figureLines: string[] = [];

  for (const line of lines) {
    if (line.trim() === '<figure>') {
      inFigure = true;
      figureLines = [];
      continue;
    }

    if (line.trim() === '</figure>' && inFigure) {
      const converted = processFigureBlock(figureLines.join('\n'));
      result.push(...converted);
      inFigure = false;
      figureLines = [];
      continue;
    }

    if (inFigure) {
      figureLines.push(line);
      continue;
    }

    result.push(line);
  }

  // Unclosed figure — emit raw lines
  if (inFigure) {
    result.push('<figure>');
    result.push(...figureLines);
  }

  return result.join('\n');
}

function processFigureBlock(content: string): string[] {
  // Match <img> tag (may span multiple lines)
  const imgMatch = content.match(/<img\b([^>]*?)\/?\s*>/s);
  if (!imgMatch) {
    // No <img> — emit figure unchanged
    return ['<figure>', content, '</figure>'];
  }

  const imgAttrs = imgMatch[1];
  const srcMatch = imgAttrs.match(/src=["']([^"']+)["']/);
  const altMatch = imgAttrs.match(/alt=["']([^"']+)["']/s);

  const src = srcMatch?.[1] ?? '';
  const alt = altMatch ? altMatch[1].replace(/\s+/g, ' ').trim() : '';

  if (!src) {
    return ['<figure>', content, '</figure>'];
  }

  // Extract figcaption text if present
  const captionMatch = content.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/);
  const captionText = captionMatch ? captionMatch[1].replace(/\s+/g, ' ').trim() : '';

  const output: string[] = [];
  output.push(`![${alt}](${src})`);
  if (captionText) {
    output.push(`*${captionText}*`);
  }

  return output;
}

/**
 * Convert standalone HTML `<img>` tags to markdown image syntax.
 *
 * Quarto outputs standalone `<img>` tags for plots without captions.
 * Astro's image optimization only works with markdown `![](url)` syntax,
 * not raw HTML. This function converts those tags.
 *
 * @param content - The markdown content to transform
 * @returns Transformed content with img tags converted to markdown
 */
export function convertStandaloneImagesToMarkdown(content: string): string {
  const imgRegex = /<img\b([^>]*?)\/?\s*>/gs;

  return content.replace(imgRegex, (match, attrs: string) => {
    const srcMatch = attrs.match(/src=["']([^"']+)["']/s);
    const altMatch = attrs.match(/(?:alt|data-fig-alt)=["']([^"']+)["']/s);

    if (!srcMatch) return match;

    const src = srcMatch[1];
    const alt = altMatch ? altMatch[1].replace(/\s+/g, ' ').trim() : '';

    return `![${alt}](${src})`;
  });
}

/**
 * Extract output from code-collapse details blocks.
 *
 * Quarto wraps R code and its output in `<details class="code-collapse">` blocks.
 * This function moves the output content outside of the details element so it
 * renders properly in the final markdown.
 *
 * @param content - The markdown content to transform
 * @returns Transformed content with output extracted from details blocks
 *
 * @example
 * ```typescript
 * const input = `<details class="code-collapse">
 * <summary>Code</summary>
 * \`\`\`r
 * print("hello")
 * \`\`\`
 * ## [1] "hello"
 * </details>`;
 *
 * const output = extractOutputFromDetails(input);
 * // Output now has "## [1] \"hello\"" outside the details block
 * ```
 */
export function extractOutputFromDetails(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inDetails = false;
  let detailsContent: string[] = [];
  let extractedOutput: string[] = [];
  let inCodeBlock = false;
  let foundCodeBlock = false;

  for (const line of lines) {
    // Start of code-collapse details block
    if (line.startsWith('<details class="code-collapse">')) {
      inDetails = true;
      detailsContent = [line];
      foundCodeBlock = false;
      extractedOutput = [];
      continue;
    }

    // End of details block
    if (line === '</details>' && inDetails) {
      // Print the details block without extracted output
      result.push(...detailsContent);
      result.push('</details>');

      // Print any extracted output after the details block
      if (extractedOutput.length > 0) {
        result.push('');
        result.push(...extractedOutput);
      }

      // Reset state
      inDetails = false;
      detailsContent = [];
      extractedOutput = [];
      inCodeBlock = false;
      foundCodeBlock = false;
      continue;
    }

    // Inside details block
    if (inDetails) {
      // Track code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Starting a code block
          inCodeBlock = true;
          foundCodeBlock = true;
          detailsContent.push(line);
        } else {
          // Ending a code block
          inCodeBlock = false;
          detailsContent.push(line);
        }
        continue;
      }

      // Inside a code block - keep in details
      if (inCodeBlock) {
        detailsContent.push(line);
        continue;
      }

      // After code block has been found and we are outside code block
      if (foundCodeBlock && !inCodeBlock) {
        // This is output after the code block - extract it
        extractedOutput.push(line);
        continue;
      }

      // Before any code block or other content - keep in details
      detailsContent.push(line);
      continue;
    }

    // Outside details block - print as-is
    result.push(line);
  }

  return result.join('\n');
}

/**
 * Fix image paths in markdown content to use relative paths.
 *
 * Converts various Quarto-generated image path formats to relative paths (./filename.png)
 * for compatibility with Astro's native image optimization for collocated assets.
 *
 * Handles these path patterns:
 * - `index_files/figure-markdown_str-1-1/image.png` → `./image.png`
 * - `src/assets/images/blog/2022/03-14-post/image.png` → `./image.png`
 * - `../../../../assets/images/blog/2022/03-14-post/image.png` → `./image.png`
 * - `/assets/images/blog/2022/03-14-post/image.png` → `./image.png`
 * - `image.png` (no path) → `./image.png`
 *
 * @param content - The markdown content to transform
 * @returns Transformed content with fixed image paths
 *
 * @example
 * ```typescript
 * const input = '![](index_files/figure-html/plot-1.png)';
 * const output = fixImagePaths(input);
 * // output: '![](./plot-1.png)'
 * ```
 */
export function fixImagePaths(content: string): string {
  const { frontmatter, body } = splitFrontmatter(content);

  let rewrittenFrontmatter = frontmatter;
  if (rewrittenFrontmatter) {
    rewrittenFrontmatter = rewrittenFrontmatter.replaceAll(
      /^\s*heroImage:\s*(.+)$/gm,
      (_match, rawValue: string) => {
        const normalized = normalizeImageUrl(rawValue.trim().replace(/^['"]|['"]$/g, ''));
        return normalized ? `heroImage: ${normalized}` : `heroImage: ${rawValue}`;
      }
    );
  }

  const rewrittenBody = rewriteImagePathsWithMarkdownParser(body);
  return `${rewrittenFrontmatter}${rewrittenBody}`;
}

interface Replacement {
  start: number;
  end: number;
  value: string;
}

interface PositionLike {
  start?: { offset?: number };
  end?: { offset?: number };
}

interface NodeLike {
  type?: string;
  url?: string;
  title?: string;
  value?: string;
  position?: PositionLike;
}

function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  const match = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)([\s\S]*)$/);
  if (!match) {
    return { frontmatter: '', body: content };
  }
  return {
    frontmatter: match[1],
    body: match[2],
  };
}

function getPathParts(url: string): { pathOnly: string; suffix: string } {
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');

  let splitIndex = -1;
  if (queryIndex >= 0 && hashIndex >= 0) {
    splitIndex = Math.min(queryIndex, hashIndex);
  } else if (queryIndex >= 0) {
    splitIndex = queryIndex;
  } else if (hashIndex >= 0) {
    splitIndex = hashIndex;
  }

  if (splitIndex === -1) {
    return { pathOnly: url, suffix: '' };
  }

  return {
    pathOnly: url.slice(0, splitIndex),
    suffix: url.slice(splitIndex),
  };
}

function normalizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(trimmed) || trimmed.startsWith('#')) {
    return trimmed;
  }

  const { pathOnly, suffix } = getPathParts(trimmed);
  if (!/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(pathOnly)) {
    return trimmed;
  }

  const basename = pathOnly.split('/').pop() ?? pathOnly;
  const normalizedBasename = `./${basename}${suffix}`;

  if (
    /^index(?:\.[^/]+)?_files\//i.test(pathOnly) ||
    /^src\/assets\/images\/blog\//i.test(pathOnly) ||
    /^\.\.\/\.\.\/\.\.\/\.\.\/assets\/images\/blog\//i.test(pathOnly) ||
    /^\/assets\/images\/blog\//i.test(pathOnly)
  ) {
    return normalizedBasename;
  }

  if (pathOnly.startsWith('./') || pathOnly.startsWith('../')) {
    return trimmed;
  }

  if (!pathOnly.includes('/')) {
    return normalizedBasename;
  }

  return trimmed;
}

function rewriteHtmlAttributes(rawHtml: string): string {
  return rawHtml.replaceAll(/\b(src|href)=(["'])([^"']+)\2/g, (match, attr, quote, value) => {
    const normalized = normalizeImageUrl(value);
    if (normalized === value) {
      return match;
    }
    return `${attr}=${quote}${normalized}${quote}`;
  });
}

function pushReplacement(
  replacements: Replacement[],
  start: number,
  end: number,
  value: string
): void {
  replacements.push({ start, end, value });
}

function applyReplacements(input: string, replacements: Replacement[]): string {
  if (replacements.length === 0) {
    return input;
  }

  let output = input;
  const sorted = [...replacements].sort((a, b) => b.start - a.start);
  for (const replacement of sorted) {
    output = `${output.slice(0, replacement.start)}${replacement.value}${output.slice(replacement.end)}`;
  }
  return output;
}

function rewriteImagePathsWithMarkdownParser(body: string): string {
  try {
    const tree = unified().use(remarkParse).parse(body);
    const replacements: Replacement[] = [];

    visit(tree, (node) => {
      const n = node as NodeLike;
      const start = n.position?.start?.offset;
      const end = n.position?.end?.offset;
      if (start === undefined || end === undefined || start >= end) {
        return;
      }

      if (n.type === 'image' && typeof n.url === 'string') {
        const normalized = normalizeImageUrl(n.url);
        const hasTitle = typeof n.title === 'string' && n.title.length > 0;
        const urlChanged = normalized !== n.url;

        if (!urlChanged && !hasTitle) {
          return;
        }

        const rawSlice = body.slice(start, end);
        const urlIndex = rawSlice.indexOf(n.url);
        if (urlIndex === -1) {
          return;
        }

        let rewrittenSlice = `${rawSlice.slice(0, urlIndex)}${normalized}${rawSlice.slice(
          urlIndex + n.url.length
        )}`;

        if (hasTitle) {
          const titlePattern = /\s+"[^"]*"\s*\)$/;
          rewrittenSlice = rewrittenSlice.replace(titlePattern, ')\n\n*' + n.title + '*');
        }

        pushReplacement(replacements, start, end, rewrittenSlice);
        return;
      }

      if (n.type === 'html' && typeof n.value === 'string') {
        const rewritten = rewriteHtmlAttributes(n.value);
        if (rewritten === n.value) {
          return;
        }
        pushReplacement(replacements, start, end, rewritten);
      }
    });

    return applyReplacements(body, replacements);
  } catch {
    return body;
  }
}

/**
 * Remove duplicate title and date from markdown body.
 *
 * Quarto sometimes generates the title and date as part of the document body,
 * but Astro already displays these from the frontmatter. This function removes
 * the duplicate heading and date lines that appear right after the frontmatter.
 *
 * Removes:
 * - `# Title` line that matches the frontmatter title
 * - Standalone date lines (YYYY-MM-DD format)
 * - Standalone author lines (Name Surname format)
 * - Leading blank lines before actual content
 *
 * @param content - The markdown content to transform
 * @returns Transformed content with duplicate title/date removed
 *
 * @example
 * ```typescript
 * const input = `---
 * title: "My Post"
 * date: 2024-01-15
 * ---
 *
 * # My Post
 *
 * 2024-01-15
 *
 * John Doe
 *
 * This is the actual content.`;
 *
 * const output = removeDuplicateTitleDate(input);
 * // output starts with "This is the actual content."
 * ```
 */
export function removeDuplicateTitleDate(content: string): string {
  // Extract title from frontmatter
  const titleMatch = content.match(/^title:\s*(.+)$/m);
  let title = '';
  if (titleMatch) {
    title = titleMatch[1].trim();
    // Remove surrounding quotes if present
    title = title.replace(/^["']|["']$/g, '');
  }

  const lines = content.split('\n');
  const result: string[] = [];
  let inBody = false;
  let foundFrontmatterEnd = false;
  let contentStarted = false;
  let skipBlanks = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track when we exit the frontmatter
    if (line === '---' && i > 0 && !foundFrontmatterEnd) {
      foundFrontmatterEnd = true;
      inBody = true;
      skipBlanks = true;
      result.push(line);
      continue;
    }

    // Skip everything before frontmatter ends
    if (!inBody) {
      result.push(line);
      continue;
    }

    // In body content after frontmatter
    // Skip duplicate title (exact match with # prefix)
    if (line === `# ${title}`) {
      skipBlanks = true;
      continue;
    }

    // Skip standalone date pattern (YYYY-MM-DD format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(line)) {
      skipBlanks = true;
      continue;
    }

    // Skip standalone author line
    if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(line) && skipBlanks) {
      continue;
    }

    // Skip blank lines when cleaning up
    if (line === '' && skipBlanks) {
      continue;
    }

    // Found real content - stop skipping blanks
    if (line !== '') {
      skipBlanks = false;
      contentStarted = true;
    }

    // Only print if we have started real content or this is not a blank line
    if (contentStarted || line !== '') {
      result.push(line);
    }
  }

  return result.join('\n');
}
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
