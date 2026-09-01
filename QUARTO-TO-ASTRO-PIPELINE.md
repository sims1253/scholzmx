# Quarto to Astro Blog Pipeline

Workflow for converting Quarto posts with R code into markdown consumed by Astro.

## Build contract

- Input: `src/content/blog/YYYY/MM-DD-post-name/index.qmd`
- Output markdown: `src/content/blog/YYYY/MM-DD-post-name/index.md`
- Output images: collocated in the same post directory

This keeps Astro content collection behavior unchanged while enabling deterministic incremental rebuilds.

## Quarto config (`_quarto.yml`)

```yaml
format:
  gfm:
    preserve-yaml: true
    wrap: preserve
```

Do not add a `project` key with `type: website`, e.g.:

```yaml
project:
  type: website
```

That `project`/`type` configuration routes Quarto output to `_site` instead of in-place post output.

## Commands

```bash
bun run build-blog
bun run build-blog --plan
bun run build-blog --force
bun run build-blog path/to/post/index.qmd
bun run build-blog --plan path/to/post/index.qmd
bun run build-blog --force path/to/post/index.qmd

bun run scripts/build-blog-cli.ts path/to/post/index.qmd
bun run scripts/build-blog-cli.ts --force
bun run scripts/build-blog-cli.ts --force path/to/post/index.qmd
bun run scripts/build-blog-cli.ts --plan
bun run scripts/build-blog-cli.ts --plan path/to/post/index.qmd
```

`bun run build-blog` is a package script alias for `bun run scripts/build-blog-cli.ts`; both forms accept `--plan` and `--force`.

## Build state and caching

- Primary cache root: `.cache/blog-build/`
- Manifest: `.cache/blog-build/manifest.json`
- Legacy hash cache read compatibility: `.blog-cache/`
- Render artifacts/temp: `.cache/blog-build/artifacts/`
- Per-post errors: `.cache/blog-build/errors/<post>.log`

Planner fingerprints include:

- `index.qmd`
- `_quarto.yml`
- pipeline scripts (`build-blog-cli.ts`, `blog-build/*`, `markdown-transforms.ts`)
- detected local dependencies (bibliography, csl/includes, local links/images)
- toolchain versions (Quarto/Pandoc)

## Post-processing

After Quarto render, pipeline:

1. Moves generated `index_files` images into the post directory
2. Handles nested Quarto image output paths
3. Rewrites image references to local relative paths (for Astro optimization)
4. Applies markdown transforms (code-collapse output extraction, duplicate title/date cleanup)
5. Publishes with atomic file replacement to avoid partial writes

Margin note source syntax is preserved (`> margin: ...`).

## Prune behavior

Manifest tracks generated outputs per post.

- Deleting a post source prunes tracked generated outputs on next run
- Removing image references prunes stale tracked generated image outputs
- Deletions are restricted to tracked files under `src/content/blog`

## CI/CD process

### Content Render workflow (`content-render.yml`)

Triggered on content and build-pipeline changes (Quarto content, build scripts, workflow file, selected Astro/style files).

1. Restores previous rendered artifact and build cache
2. Runs planner (`--plan`) for visibility
3. Runs builder (`bun run scripts/build-blog-cli.ts`)
4. Uploads rendered content + build cache artifacts

### Deploy workflow (`deploy.yml`)

1. Downloads `rendered-content` artifact
2. Merges rendered blog content into the checkout
3. Builds Astro site
4. Deploys to GitHub Pages

## Troubleshooting

- Post missing locally: run `bun run build-blog`, then restart dev server
- Want rebuild regardless of cache: add `--force`
- Need debug of rebuild decisions: use `--plan`
- Building a single post does not run global deleted-post prune
- CI force rebuild: include `[force-rebuild]` in commit message
