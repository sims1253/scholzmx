import type { Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import path from 'node:path';

/**
 * rehype-image-astro
 *
 * Transforms Markdown <img> and image nodes into Astro's <Image /> component usage
 * for local assets under src (e.g., src/assets/images/**).
 *
 * Rules:
 * - Local relative or absolute paths that resolve under project src/ will be converted to:
 *   <Image src={await import('...resolved...')} alt="..." loading="lazy" decoding="async" sizes="(min-width: 768px) 680px, 100vw" />
 * - The first image encountered within the document will be marked as LCP-ish:
 *   loading="eager" fetchpriority="high" decoding="async"
 * - Remote (http/https) images are left as-is.
 * - Width/height are optional; Astro Image will infer from source where possible.
 *
 * Notes:
 * - Runs in Node during build; we resolve absolute filesystem paths safely.
 */
export interface Options {
  sizes?: string;
  eagerFirst?: boolean;
}

const DEFAULT_SIZES = '(min-width: 768px) 640px, 100vw'; // Optimized for prose content

export const rehypeImageAstro: Plugin<[Options?], Root> = (options = {}) => {
  const sizes = options.sizes ?? DEFAULT_SIZES;
  const eagerFirst = options.eagerFirst ?? true;

  return async (tree, file) => {
    let firstLocalHandled = false;

    visit(tree, 'element', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      if (node.tagName === 'img') {
        const props = node.properties ?? {};
        const src = String(props.src || '');
        const alt = String(props.alt || '');

        if (!src) return;

        // Skip remote images
        if (/^https?:\/\//i.test(src)) {
          // Ensure lazy defaults for remote, but do not rewrite to Astro Image
          if (!props.loading) props.loading = 'lazy';
          if (!props.decoding) props.decoding = 'async';
          node.properties = props;
          return;
        }

        // Resolve source location relative to current md file
        const currentFilePath = file.history?.[0];
        if (!currentFilePath) return;

        // Determine project root using the MD file path (three dirs up from src/content/.../file.md)
        // Fallback to process.cwd() if heuristic fails.
        let projectRoot = process.cwd();
        // Try to locate '/src/' segment and back out to the project root
        const srcIndex = currentFilePath.lastIndexOf(`${path.sep}src${path.sep}`);
        if (srcIndex !== -1) {
          projectRoot = currentFilePath.slice(0, srcIndex);
        }

        // Compute a filesystem path for the src. Handle both relative and /src/... forms
        let fsPath: string;
        if (src.startsWith('/src/')) {
          fsPath = path.join(projectRoot, src.replace(/^\//, ''));
        } else if (src.startsWith('/')) {
          // Absolute from site root but not in /src - treat as public; leave as-is
          return;
        } else {
          // Relative to markdown file
          fsPath = path.resolve(path.dirname(currentFilePath), src);
        }

        // Ensure the image lives under src/
        const normalizedRootSrc = path.join(projectRoot, 'src') + path.sep;
        const isUnderSrc = fsPath.startsWith(normalizedRootSrc);
        if (!isUnderSrc) {
          // Likely a public/ image; keep as standard img but enforce lazy defaults
          if (!props.loading) props.loading = 'lazy';
          if (!props.decoding) props.decoding = 'async';
          node.properties = props;
          return;
        }

        // Convert to /src/... for consistent import path in Astro
        const relFromRoot = path.relative(projectRoot, fsPath);
        const astroImportPath = '/' + relFromRoot.replaceAll(path.sep, '/');

        // Replace node with Astro <Image /> node
        const eager = eagerFirst && !firstLocalHandled;
        firstLocalHandled = true;

        // Build new element representing <Image ... />
        // We emit as raw HTML via hast element with tagName 'Image' and keep attributes;
        // Astro will resolve <Image /> if the page/component imports { Image } from 'astro:assets'.
        const newNode = {
          type: 'element',
          tagName: 'Image',
          properties: {
            src: `{await import('${astroImportPath}')}`,
            alt: alt || '',
            sizes,
            formats: '{["avif", "webp"]}',
            widths: '{[320, 480, 640, 800, 1024]}', // Mobile-first responsive widths
            loading: eager ? 'eager' : 'lazy',
            decoding: 'async',
            ...(eager ? { fetchpriority: 'high' } : {}),
            // Width/height optional; allow intrinsic sizing via CSS
          },
          children: [],
        } as any;

        parent.children[index] = newNode;
      }
    });
  };
};

export default rehypeImageAstro;
