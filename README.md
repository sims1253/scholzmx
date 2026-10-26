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
- `Canopy.astro` - The vine canopy over every page: leaf shadows that sway and follow the sun by day, a flickering torch after dark
- `StackedCard.astro` / `NoteCardStack.astro` - The note cards on the listing pages, with the doodad system (more on that below)
- `DropCap.astro` - Those decorative first letters you see in posts
- `IndexFinder.astro` - Search and tag filtering for the blog and recipe indexes
- `QuoteOfTheDay.astro` - The homepage quote; every new quote opens another tansy flower
- `RecipeCard.astro` - Recipes as data: Michael Chu's recipe table, a step list, and a cooking mode with timers (format in `COMPONENT-USAGE.md`)

Margin notes come from `> margin:` blockquotes in Markdown and are placed by `src/scripts/margin-notes.ts`.

### The Doodad System
Random decorative elements that make cards feel more organic. Seeded tilts and offsets, paper stacks, tape, doodles and coffee rings make every card a little different. See `DOODAD_GUIDE.md` for the technical details.

### The Canopy
The leaf shadows are SVG masks drawn by `scripts/draw-canopy.mjs`: a soft, high layer and a crisp, low one whose grape and kiwi leaves show their real outlines. The script is seeded, so `node scripts/draw-canopy.mjs` reproduces `public/grotto/canopy-high.svg` and `canopy-low.svg`. CSS supplies the colour, so the same leaves cast green shade by day and stand in front of the torch at night. The motion is transform-only and stops under `prefers-reduced-motion`.

The light follows the visitor's clock. A small script in the page head sets the sun before first paint: by day the shadows lean away from it, long and cool in the morning, short and sharp at noon, long and gold towards evening. From 21:00 to 6:00 the torch lights itself. The torch button overrides the clock until the next dawn or dusk; people whose system prefers dark get torchlight all day.

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
bun run test:site    # Build + browser smoke tests + accessibility checks (isolated server)
```

### CI/CD Pipeline

Every PR and main/master push runs workflow linting and a zizmor security audit
(`.github/zizmor.yml`), renderer regression tests, code quality checks, and a build
with all Quarto posts included. Rendering uses an exact-input cache of generated
files. CI tests the complete site, checks every link and anchor between its own
pages, then deploys that same build on main/master after the `CI passed` check
succeeds.

Lighthouse and Pa11y monitor production after deployment. A weekly job checks every
link on the published pages, external ones included, and keeps a "Broken links on
the published site" issue up to date. Dependabot opens weekly updates for Bun
packages and GitHub Actions, after a cooldown (7 days, 14 for Bun major updates) so a
bad release is usually caught before it gets here. See [the pipeline guide](QUARTO-TO-ASTRO-PIPELINE.md)
for cache behavior, pinned R/Quarto versions, and manual rebuilds.

#### PR previews

Each PR's tested build is published as a Cloudflare Worker Preview named `pr-<number>`
(`wrangler.jsonc`, `.github/workflows/preview.yml`), with the link and a Lighthouse
run against it in a PR comment. The preview is deleted when the PR closes
(`preview-cleanup.yml`). Production stays on GitHub Pages, and the Worker itself is
never deployed to production. Previews send `X-Robots-Tag: noindex`. PRs from forks
get no preview, because they cannot read the secrets. Worker Previews are in open
beta (since September 2026); one known beta bug is that a deleted preview's URL can
keep serving its last build
([cloudflare/developer-platform#73](https://github.com/cloudflare/developer-platform/issues/73)).

One-time setup:

1. In the Cloudflare dashboard, open Workers & Pages once so the account has a
   `workers.dev` subdomain.
2. Create an API token for your account. Cloudflare documents two models, so use
   what your token editor offers:
   - **Workers roles** (the editor marks Workers Scripts as legacy): grant the
     **Admin** role on only the `scholzmx` Worker, so the token cannot touch any
     other Worker ([Workers roles](https://developers.cloudflare.com/workers/authorization/workers/)).
     A Worker must exist before it can be selected, and creating one needs
     account-wide Admin, so create it once from your own login first. A preview
     does that without deploying anything to production:

     ```bash
     bun run build
     bunx wrangler login
     bunx wrangler@4.152.0 preview --name setup
     bunx wrangler@4.152.0 preview delete --name setup -y
     ```

   - **Permission groups only**: grant **Account → Workers Scripts → Edit**. This
     token can edit every Worker in the account, and the first preview creates
     the `scholzmx` Worker by itself.

   No zone permissions are needed either way, since previews live on `workers.dev`.

3. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as Actions secrets. To get
   previews on Dependabot PRs too, add them as Dependabot secrets as well.

Without the secrets the preview job skips with a notice and CI stays green.

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
The October 13 dependency review also patched eight transitive packages within
their supported ranges. Six audit findings remain in five packages; see
[the pipeline guide](QUARTO-TO-ASTRO-PIPELINE.md#dependency-updates-and-checks)
for the affected dependencies and upstream blockers.

The October updates add a few useful options for future work:

- Oxlint's [`typescript/no-generated-empty-object-type`](https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-generated-empty-object-type.html)
  can catch utility types that accidentally accept any non-nullish value. Consider
  enabling it alongside the existing type-aware checks; it passes on this codebase.
- Puppeteer 25.13's [`ConsoleMessage.page()`](https://pptr.dev/api/puppeteer.consolemessage.page),
  `frame()`, and `worker()` can identify where browser console errors originate.
  Use them when extending smoke-test diagnostics. Its
  [`asFetchRequest()`](https://pptr.dev/api/puppeteer.httprequest.asfetchrequest)
  and [`asFetchResponse()`](https://pptr.dev/api/puppeteer.httpresponse.asfetchresponse)
  helpers also simplify future request and response assertions.
- [Markdown Remark 7.3.2](https://github.com/withastro/astro/releases/tag/@astrojs%2Fmarkdown-remark@7.3.2)
  supports YAML timestamps and merge keys and fixes highlighting for `c++`, `c#`,
  and `f#` fences. Existing content benefits automatically.
- [Setup Node 7.1](https://github.com/actions/setup-node/releases/tag/v7.1.0)
  supports `mise.toml` and absolute version-file paths. Keep `.node-version` for
  now; the new input support is useful if tool versions move to mise later.

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
