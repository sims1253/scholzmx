# scholzmx.com

My personal digital space built with Astro—part blog, part experiment, part digital garden. A place for thinking out loud about stats, coding, and whatever else catches my attention.

## What this is

I wanted a site that felt warm and personal instead of another sterile tech blog. So this has:
- **No tracking whatsoever** - your privacy is respected completely
- **Botanical/manuscript vibes** - inspired by illuminated texts and botanical illustrations
- **Quality over quantity** - I write when I have something worth saying
- **Accessibility first** - works for everyone, period
- **Performance obsessed** - aggressive optimization because I hate slow sites

The whole thing runs on modern web standards but feels handcrafted. Think medieval herbalist's notebook meets contemporary web development.

## How it works

Built with [Astro](https://astro.build) because it lets me write content in Quarto (for R code and math) while getting all the performance benefits of a modern static site generator.

### Content Collections
- **Blog** (`/blog`): Long-form posts, mostly about statistics and programming
- **Recipes** (`/recipes`): Seasonal cooking experiments
- **Notes** (`/notes`): Shorter thoughts and observations

### Key Components
- `DropCap.astro` - Those decorative first letters you see in posts
- `PaperTexture.astro` - Subtle background textures for that manuscript feel
- `StackedCard.astro` - Cards with the doodad system (more on that below)
- `MarginNote.astro` - Sidenotes that appear in the right margin

### The Doodad System
Random decorative elements that make cards feel more organic. SVG doodles, background effects, and visual variety that makes the site feel alive. See `DOODAD_GUIDE.md` for the technical details.

### Blog Pipeline
I write posts in Quarto (`.qmd` files) with R code, math, and citations. A build script converts them to markdown with properly optimized images. The whole process is automated in CI. See `QUARTO-TO-ASTRO-PIPELINE.md` for details.

## Development

### Quick Start

Use Node 24 or newer and Bun 1.4.0 (also declared in `.node-version` and
`package.json`). CI installs the declared versions and uses the frozen lockfile.
For local browser audits, install Chrome with `bunx puppeteer browsers install chrome`
and set `PUPPETEER_EXECUTABLE_PATH` to its printed executable path. This lets both
Puppeteer versions used by the audit tools use the same browser.

```bash
bun install          # Install dependencies
bun run dev          # Start dev server (localhost:4321)
```

### Available Commands
```bash
# Core development
bun run dev          # Development server with hot reload
bun run build        # Production build
bun run preview      # Preview production build locally

# Content workflow
bun run build-blog   # Convert Quarto files to markdown (runs ./build-blog.sh)

# Quality assurance (what CI runs)
bun run typecheck    # TypeScript checking
bun run lint:js      # Oxlint with type-aware checks and anti-slop for JS/TS/Astro
bun run lint:css     # Stylelint for CSS
bun run format:check # Prettier formatting check
bun run test:lint-rules # Vendored anti-slop rule tests
bun run quality:check # All of the above

# Performance monitoring
bun run lighthouse   # Local Lighthouse audit
bun run a11y         # Accessibility testing with pa11y
bun run test:a11y    # Build + accessibility checks on local pages
bun run test:site    # Build + browser smoke tests + accessibility checks
```

### CI/CD Pipeline
The site has a sophisticated build process:

1. **Content Render** (`content-render.yml`) - Runs when Quarto files change:
   - Sets up R environment with all necessary packages (brms, ggdag, tidyverse, etc.)
   - Runs `./build-blog.sh` to convert `.qmd` → `.md` + optimized images
   - Caches expensive R computations
   - Uploads rendered content as artifact

2. **Quality Gates** (`ci.yml`) - Runs on every commit:
   - TypeScript checking, linting, formatting
   - Full build test
   - Accessibility validation

3. **Performance Monitoring** (`performance.yml`):
   - Lighthouse CI audits on multiple pages
   - Performance budgets that fail builds if exceeded
   - Deep accessibility testing with PA11y

4. **Deploy** (`deploy.yml`) - Production deployment:
   - Downloads rendered content from step 1
   - Builds Astro site with optimized assets
   - Deploys to GitHub Pages

This means I can push Quarto files and they automatically get rendered with R, optimized, and deployed. The performance monitoring ensures the site stays fast and accessible.

## Architecture Notes

### Image Optimization
Images in `src/assets/` get automatic Astro optimization (WebP conversion, responsive sizing, lazy loading). The Quarto build script handles moving generated images to the right location.

### CSS Strategy
- Vanilla CSS with modern features (custom properties, container queries, etc.)
- PurgeCSS removes unused styles in production
- LightningCSS for optimal minification and modern browser targeting
- Tailwind 4 utilities compile through the official Vite plugin; Preflight is disabled

### Tooling compatibility

Astro 7.3.1 uses the unified Markdown processor to preserve remark-math and
rehype-katex rendering. HTML whitespace compression also retains the previous mode.
Pagefind 2 builds the index; `Search.astro` uses the maintained default UI to keep
existing search labels, styling, and collection filters.

TypeScript is pinned to 6.0.3 because TypeScript 7 does not expose the programmatic
API required by `astro check`. Upgrade this pin when the Astro language server
supports TypeScript 7. Oxlint's type-aware checks use `oxlint-tsgolint` separately.
Anti-slop's 15 generic rules are vendored under `tools/oxlint/anti-slop`, with the
upstream commit and license recorded there. Three local `no-runtime-typeof`
exceptions cover already-typed image unions; unnecessary casts were removed.

The `qs`, `tmp`, and `uuid` overrides address advisories in audit-tool dependencies.
`bun audit` still reports an unpatched `extract-zip@2.0.1` advisory in Puppeteer's
Chrome downloader. This tooling is not shipped in the static site.

### Performance Philosophy
- Inline styles are disabled (separate CSS files for better caching)
- Aggressive image optimization with Sharp
- CSS code splitting for faster initial loads
- Everything optimized for Core Web Vitals

## License

**Content**: [Creative Commons CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) - Share and adapt freely with attribution

**Code**: MIT License - Use, modify, and distribute freely

---

Built with Astro. Inspired by digital gardens, slow web principles, and the belief that personal websites should feel personal.
