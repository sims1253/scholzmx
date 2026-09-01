# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal website built with Astro—blog, recipes, notes (digital garden). Botanical/manuscript aesthetic inspired by illuminated texts. Content written in Quarto (.qmd) with R code and math, converted to markdown via build pipeline.

## Commands

**Note:** Do NOT run `bun run dev` — a dev server is always running in the background. Just reload the browser to see changes.

```bash
bun run dev              # Dev server at localhost:4321 (user runs this; do not start a second instance)
bun run build            # Production build
bun run preview          # Preview production build
bun run build-blog       # Convert Quarto files to markdown (runs scripts/build-blog-cli.ts)
bun run quality:check    # TypeScript + linting + format check (CI runs this)
bun run quality:fix      # Auto-fix lint/format issues
bun run test:a11y        # Build + accessibility test with pa11y
```

Build script for Quarto:

```bash
bun run build-blog                                 # Build all changed files
bun run scripts/build-blog-cli.ts path/to/post/index.qmd  # Build specific file
bun run build-blog --force                         # Force rebuild everything
bun run scripts/build-blog-cli.ts --force path/to/post/index.qmd # Force rebuild specific
```

## Architecture

### Content Collections (`src/content/`)

- **blog/**: Long-form posts with Zod schema (`title, description, date, tags?, heroImage?, draft`)
- **recipes/**: Cooking posts requiring `servings` and `time` fields
- **notes/**: Digital garden with `type` enum (thought, observation, draft, idea, reference) and `connections` for bidirectional linking

### Quarto Pipeline

1. Write `.qmd` in `src/content/blog/YEAR/MM-DD-post-name/index.qmd`
2. `bun run build-blog` converts to markdown, writes `index.md`, and collocates generated images in the post directory
3. Astro optimizes images automatically (WebP, responsive)
4. CI handles R environment setup and caching

If a new post doesn't appear, restart dev server (Astro caches content collections).

### Layout System (`src/layouts/BaseLayout.astro`)

Key props:

- `tone`: 'personal' | 'serious' — controls fonts and styling
- `layout`: 'prose' | 'listing' | 'wide' | 'full'
- `footerVariant`: 'garden' | 'kitchen' | 'craft' | 'writing' | 'projects' | 'research'
- `addBorders`: boolean for botanical borders

### Component Patterns

- **StackedCard**: Cards with probabilistic doodle system (see `src/config/doodadConfig.ts`)
- **ImageFrame**: Multi-style image frames with positioning (`positionX/Y`, `scale`)
- **Margin notes**: Use `> margin: text` in markdown, rendered as sidenotes on wide screens

### Collection Page Sidebar Layout (Critical)

On `blog.astro` and `recipes.astro`, the sidebar floats **outside** the centered content column. The structure is:

```
[sidebar — absolute, left of container]  [cards — max-width centered]
```

The `.blog-container` / `.recipes-container` is `position: relative; max-width: ...; margin: 0 auto`. The sidebar uses `position: absolute; right: calc(100% + var(--space-lg))` — it bleeds outside the content column into the page margins.

**Do NOT switch the sidebar from `position: absolute` to an in-flow element** (flex/grid/sticky) without restructuring the whole layout. Moving it in-flow makes it a sibling of the cards inside the centered container, causing cards to shift right of center.

**Correct pattern for sticky sidebar while preserving layout:**

- Outer `<aside>`: `position: absolute; top: 0; bottom: 0` (same position, full content height)
- Inner `<div>`: `position: sticky; top: ...` (sticks to viewport, bounded by parent height)

### CSS Architecture (`src/styles/`)

Design tokens in `tokens.*.css` files. Key conventions:

- Tailwind uses `tw-` prefix
- CSS custom properties: `--color-*`, `--space-*`, `--font-*`
- PurgeCSS active in production (safelist in `astro.config.mjs`)

### Doodad System

Seeded randomization for card decorations. Key files:

- `src/config/doodadConfig.ts` — doodad definitions
- `src/lib/doodadProcessor.ts` — RNG selection logic
- SVGs go in `/public/doodles/`, use CSS masks for theming

## Special Features

- **KaTeX math**: Uses remark-math + rehype-katex. `$inline$` and `$$display$$`
- **Pagefind search**: Full-text indexing, used on blog and recipes pages
- **Theme toggle**: localStorage `theme-preference`, applies `data-theme="dark"`
- **Sunlit effect**: Toggle in nav, localStorage `sunlit`, CSS overlay

## Key Configuration Files

- `astro.config.mjs` — integrations, Shiki themes (kanagawa-lotus/dragon), redirects
- `tailwind.config.mjs` — `tw-` prefix, custom colors from CSS vars
- `content.config.ts` — Zod schemas for content collections
