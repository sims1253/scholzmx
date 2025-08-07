# Quarto to Astro Blog Pipeline Documentation

## Overview
Complete, production-ready pipeline for converting Quarto (.qmd) files to optimized blog posts in Astro with fully optimized images. This setup enables you to write blog posts in Quarto with R/Python code, figures, and math, while getting the full performance benefits of Astro's image optimization.

## Key Components

### 1. Quarto Configuration (`_quarto.yml`)
```yaml
format:
  gfm:
    preserve-yaml: true
    wrap: preserve
```
**🚨 Critical:** Do NOT include `project: type: website` - this causes files to render to `_site` instead of in-place.

### 2. Astro Configuration (`astro.config.mjs`)
```js
export default defineConfig({
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: { limitInputPixels: false }
    }
  },
  markdown: {
    // Use native Astro image processing - no custom rehype plugins needed
  }
});
```

### 3. Image Organization
- **Source**: Quarto generates images in `{filename}_files/figure-*/`
- **Target**: `src/assets/images/blog/YEAR/{filename}-{image}.png`
- **References**: `![alt](../../../assets/images/blog/YEAR/{filename}-{image}.png)`
- **Result**: Astro automatically optimizes all images in `src/assets/`

## Complete Workflow

### For New Blog Posts:
1. Create `.qmd` file in `src/content/blog/YEAR/`
2. Run `./build-blog.sh` (processes all Quarto files with caching)
3. Images automatically moved to `src/assets/images/blog/YEAR/` with post prefix
4. Astro automatically optimizes images during build/dev

### Build Script Usage:
```bash
# Build all files with caching
./build-blog.sh

# Build specific file only
./build-blog.sh src/content/blog/2022/my-post.qmd

# Force rebuild all files (ignore cache)
./build-blog.sh --force

# Force rebuild specific file
./build-blog.sh --force src/content/blog/2022/my-post.qmd

# Alternative: delete .md file to force rebuild
rm src/content/blog/2022/my-post.md
./build-blog.sh  # will rebuild the file automatically
```

### Build Script Features:
- ✅ Intelligent caching (only renders changed files)
- ✅ Single-file building capability
- ✅ Force rebuild option
- ✅ Automatic image organization 
- ✅ Path optimization for Astro (fixed `../../../assets/images/` paths)
- ✅ Cleanup of temporary files

## Key Insights & Troubleshooting

### ✅ What Works
1. **Native Astro image processing**: Built-in markdown image optimization beats custom rehype plugins
2. **Relative paths**: `../../../assets/images/` correctly resolves from blog markdown files  
3. **Smart caching**: Only re-renders changed files, saves time on expensive R/Python computations
4. **Automatic optimization**: All images in `src/assets/` get full Astro optimization

### 🚨 Common Issues & Solutions

**Issue**: Blog post doesn't appear after running script
- **Solution**: Restart dev server to clear Astro's content cache

**Issue**: Images show as broken links  
- **Solution**: Check that images exist in `src/assets/images/blog/YEAR/` with correct naming

**Issue**: Script says "optimized" but paths are wrong
- **Solution**: Delete the `.md` file and re-run script to force fresh processing

**Issue**: Quarto files render to `_site` instead of in-place
- **Solution**: Remove `project: type: website` from `_quarto.yml`

### 📊 Performance Benefits
```markdown
<!-- Before: Unoptimized -->
![Chart](chart.png)          → <img src="chart.png">

<!-- After: Astro Optimized -->  
![Chart](../../../assets/images/blog/2022/post-chart.png)
→ <img src="/_astro/post-chart.ABC123.webp" width="800" height="400" 
     loading="lazy" decoding="async" alt="Chart">
```

## Production Results
This pipeline provides:
- 📝 **Full Quarto features**: R, Python, Julia, math, citations, cross-references
- 🖼️ **Automatic image optimization**: WebP conversion, responsive sizing, lazy loading
- ⚡ **Fast incremental builds**: Smart caching prevents re-running expensive computations  
- 🎯 **Perfect Astro integration**: Native content collections, SEO, performance
- 🔧 **Developer experience**: Single command deploys from `.qmd` to optimized blog post