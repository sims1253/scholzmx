# Quarto to Astro Blog Pipeline

The workflow for converting Quarto files with R code into optimized blog posts.

## How it works

Write posts in `.qmd` files with R code, math, and citations. The build script converts them to markdown with properly optimized images, and CI handles the rest.

### Quarto Config (`_quarto.yml`)
```yaml
format:
  gfm:
    preserve-yaml: true
    wrap: preserve
```

Don't add `project: type: website` - that makes Quarto render to `_site` instead of in-place.

### Image Pipeline
1. **Quarto generates**: Images in `{filename}_files/figure-*/` next to the `.qmd`
2. **Build script moves them**: To `src/assets/images/blog/YEAR/{post-name}/`
3. **Build script rewrites paths**: Markdown gets `../../../../assets/images/blog/YEAR/{post-name}/image.png`
4. **Astro optimizes**: Everything in `src/assets/` gets WebP conversion, responsive sizing, lazy loading

### Astro Config
The key parts in `astro.config.mjs`:
```js
image: {
  service: {
    entrypoint: 'astro/assets/services/sharp',
    config: { limitInputPixels: 268402689 }  // ~268MP limit for safety
  }
}
```

## Daily Usage

### Writing a new post:
1. Create `.qmd` file in `src/content/blog/YEAR/MM-DD-post-name/index.qmd`
2. Run `bun run build-blog` to convert to markdown
3. Restart dev server if the post doesn't show up (Astro caches content collections)

### Build script commands:
```bash
./build-blog.sh                                    # Build all changed files
./build-blog.sh src/content/blog/2022/my-post/index.qmd  # Build specific file
./build-blog.sh --force                            # Force rebuild everything
./build-blog.sh --force src/content/blog/2022/my-post/index.qmd  # Force specific file
```

### Caching behavior:
- Only rebuilds files that have changed
- Saves timestamps in `.blog-cache/` to track what's been built
- Delete the `.md` file to force a rebuild of that post
- Use `--force` to ignore cache completely

## CI/CD Process

The build happens in two stages in GitHub Actions:

### Content Render Workflow (`content-render.yml`)
Runs when `.qmd` files change:
1. Sets up R environment with packages (brms, ggdag, tidyverse, etc.)
2. Runs `./build-blog.sh` to convert Quarto → markdown
3. Uploads rendered content as artifact
4. Caches R packages and build timestamps

### Deploy Workflow (`deploy.yml`)
Runs on every push to main:
1. Downloads the rendered content artifact
2. Builds Astro site with optimized images
3. Deploys to GitHub Pages

This separation means expensive R computations only run when content changes, but the site gets rebuilt and deployed on every push.

## Troubleshooting

**Post doesn't appear**: Restart dev server (Astro caches content collections aggressively)

**Images broken**: Check `src/assets/images/blog/YEAR/post-name/` exists and has the right files

**"File not changed" but you want to rebuild**: Delete the `.md` file or use `--force`

**R packages missing in CI**: Add them to the `extra-packages` list in `content-render.yml`

**Build fails on large images**: The Sharp service has a 268MP limit for safety

## Image Path Magic

The script does some regex magic to fix paths:

1. Quarto generates images in `post-folder_files/figure-*/`
2. Script moves them to `src/assets/images/blog/YEAR/post-folder/`
3. Script rewrites markdown: `![](image.png)` → `![](../../../../assets/images/blog/YEAR/post-folder/image.png)`
4. Astro sees images in `src/assets/` and optimizes them automatically

The `../../../../` path looks ugly but it's correct for the nested blog structure.