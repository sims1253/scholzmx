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
bun run lint:js      # ESLint for JS/TS/Astro files
bun run lint:css     # Stylelint for CSS
bun run format:check # Prettier formatting check
bun run quality:check # All of the above

# Performance monitoring
bun run lighthouse   # Local Lighthouse audit
bun run a11y         # Accessibility testing with pa11y
bun run test:a11y    # Full build + a11y test
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
- No CSS frameworks - just thoughtful, semantic styling

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
