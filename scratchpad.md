# Scratchpad - Learnings & Gotchas

This file documents learnings, gotchas, and important discoveries during the website redesign project.

## Initial Setup Discoveries

- The existing _quarto.yml was quite complex (115 lines) with extensive social media integration and metadata
- Design roadmap calls for much simpler approach focusing on content-first philosophy
- Privacy-focused approach means using Bunny Fonts instead of Google Fonts for GDPR compliance

## Theme Integration Learnings

- Sunlit proof of concept uses CSS custom properties extensively for color theming and animations
- The sunlit system has specific color variables: --day, --evening, --dusk, --night, --dawn, --morning
- Animation timing uses cubic-bezier(0.455, 0.190, 0.000, 0.985) for smooth transitions
- SCSS structure needs /*-- scss:defaults --*/ and /*-- scss:rules --*/ sections for Quarto theme integration
- Bunny Fonts URL format: fonts.bunny.net/css?family=lora:400,700|source-sans-pro:400,700

## Homepage Integration Gotchas

- Quarto's `include-after-body` is better than `include-in-header` for interactive scripts
- Need `page-layout: full` and `theme: none` in YAML to prevent conflicts with sunlit effects
- CSS z-index management crucial: content needs higher z-index than visual effects
- Event delegation important: exclude links from click handlers to preserve navigation
- SVG filters for wind effects need inline definition in HTML, can't be external file
- Mobile responsiveness requires adjusting effect opacity and transforms for performance

## Content Pages Structure

- Quarto listing configuration handles mixed content types (.qmd, .md, .Rmd) automatically
- Blog listing can target multiple directories with glob patterns like `blog/**/*.qmd`
- Setting `sort-ui: false` and `filter-ui: false` keeps the blog listing clean and simple
- `title-block-banner: false` prevents unwanted title styling that conflicts with custom theme

## Interactive Elements Implementation

- CSS-only flip cards work best with hidden checkbox + label approach for accessibility
- Drop caps using `::first-letter` need specific selectors (e.g., `.sunlit-content h2 + p::first-letter`)
- Fixed position elements need `@media (min-width: 1400px)` for desktop-only visibility
- JavaScript auto-rotation with pause-on-hover requires careful event listener management
- Multiple event listeners (click, hover, timer) need coordination to avoid conflicts
- Art showcase rotation uses `setInterval` with proper cleanup and pause/resume functionality

## GitHub Actions Deployment

- Quarto official actions have been updated in 2025: use `quarto-dev/quarto-actions/setup@v2` and `publish@v2`
- Modern GitHub Actions use `actions/checkout@v4` instead of older v3 versions
- `workflow_dispatch` trigger allows manual deployment testing from GitHub interface
- `contents: write` permission needed for GitHub Pages deployment with GITHUB_TOKEN
- Single `quarto-dev/quarto-actions/publish@v2` action handles both rendering and deployment
- Target should be `gh-pages` branch, source will be `docs/` directory from main branch

## Critical HTML Rendering Issues

- **CRITICAL**: Complex HTML structures in Quarto .qmd files must be wrapped in `{=html}` raw blocks
- Unwrapped HTML gets escaped by Pandoc and renders as literal text instead of HTML elements
- SVG animations and complex divs particularly affected by this issue
- Always use ```{=html} ... ``` for any substantial HTML structures in Quarto documents
- This was the root cause of sunlit effects not rendering properly in the initial implementation

## Blogdown to Quarto Migration Issues

- Legacy blogdown posts may have invalid YAML structures that break Quarto rendering
- Common issue: `image:` field with nested properties (caption, focal_point, preview_only) invalid in Quarto
- Need systematic migration of all legacy content from /content/post/ directory
- Should audit all .Rmd files for incompatible YAML frontmatter before deployment

## Template Content Audit Results

### CRITICAL FINDINGS: Gandalf Template Content Still Present

**File: /mnt/c/Users/m0hawk/Documents/scholzmx/index.qmd**
- Line 2: Title is "Hello there!" instead of proper name
- Lines 12-25: Social media links are commented out but reference "MarvinSchmitt" email and profiles
- Lines 93-106: Art showcase references "gandalf_image_1.jpg" through "gandalf_image_4.jpg" 
- Lines 117-124: ENTIRE main content section is Gandalf persona ("I am Gandalf the White, a renowned wizard and scholar of Middle-earth...")
- Line 125: Contact email references "mail.marvinschmitt@gmail.com" instead of correct email
- Lines 131-135: Template tutorial link references "marvinschmitt.com" tutorial

**File: /mnt/c/Users/m0hawk/Documents/scholzmx/photography/index.qmd**
- Line 5: Full paragraph about "As a wizard and scholar of Middle-earth" and "self-portraits"
- Lines 9-15: References to "gandalf_image_1.jpg" through "gandalf_image_4.jpg"
- Lines 21-24: Template tutorial link references "marvinschmitt.com"

**File: /mnt/c/Users/m0hawk/Documents/scholzmx/projects/index.qmd**
- Line 5: Project title "The Languages of Middle-earth" 
- Lines 9-11: ArXiv links point to "marvinschmitt" GitHub and papers
- Line 11: Content about "deciphering ancient scripts and dialects of Middle-earth peoples"
- Line 15: Project title "The History of the War of the Ring"
- Lines 19-21: More ArXiv links to "marvinschmitt" content and War of the Ring content
- Lines 25-27: Template tutorial link references "marvinschmitt.com"

**File: /mnt/c/Users/m0hawk/Documents/scholzmx/cv/index.qmd**
- Lines 47-49: Template tutorial link references "marvinschmitt.com"

**File: /mnt/c/Users/m0hawk/Documents/scholzmx/about.qmd**
- Lines 7-21: Art showcase still references "gandalf_image_1.jpg" through "gandalf_image_4.jpg"
- Lines 19-20: Caption still says "Mother's Artwork Collection" 
- Content is partially updated but still generic

### CORRECT CONTENT MAPPING (Based on scholzmx.com)

**Personal Information:**
- Name: Maximilian Scholz
- Role: PhD Researcher at University of Stuttgart, Cluster of Excellence SimTech
- Email: scholzmxb@gmail.com
- Focus: Bayesian statistics, computational science, software engineering

**Education:**
- M.Sc. Software Engineering (Chalmers University of Technology)
- B.Sc. Computational Science (Hamburg University of Technology)

**Research Interests:**
- Bayesian Statistics
- Causality 
- Decision Making
- Software Infrastructure

**Social Media:**
- GitHub: https://github.com/scholzmx
- Twitter: https://twitter.com/scholz_mx

### PRIORITY REPLACEMENT ACTIONS NEEDED

1. **URGENT**: Replace all Gandalf persona content in index.qmd with proper academic bio
2. **URGENT**: Update all "gandalf_image_" references to actual photos
3. **URGENT**: Replace Middle-earth themed projects with actual research projects
4. **URGENT**: Fix all email references from "mail.marvinschmitt@gmail.com" to "scholzmxb@gmail.com"
5. **URGENT**: Remove all template tutorial links referencing "marvinschmitt.com"
6. **URGENT**: Update photography page to remove wizard references
7. **URGENT**: Update art showcase caption from "Mother's Artwork Collection" to appropriate description

## Performance Optimization Analysis (2025-07-03)

### Performance Issues Identified & Fixed

**Image Asset Analysis:**
- Photography images: 116K-144K each (4 images) - reasonable size
- Profile image: 28K - optimized 
- Leaves.png: 48K - acceptable for background effect
- Template screenshots: 384K-1.9M - large but likely unused in current site

**Critical UX Issues Fixed:**
1. ✅ Removed TOC from landing page (was showing unnecessarily)
2. ✅ Replaced confusing space/click toggle with sun/moon navbar button  
3. ✅ Shortened landing page content and reduced padding to eliminate scrolling
4. ✅ Added missing sunlit background effects to blog page
5. ✅ Applied CSS performance optimizations

**Performance Optimizations Applied:**
- Added `will-change: transform` to animated elements (art showcase, leaves)
- Added `transform: translateZ(0)` to trigger hardware acceleration for leaves animation
- Increased art rotation interval from 4s to 6s to reduce computation frequency
- All image assets are reasonably sized and compressed

**Remaining Performance Considerations:**
- Complex SVG animations with filters (wind effect) may cause slight lag on lower-end devices
- Multiple CSS animations running simultaneously (glow, shutters, leaves, art rotation)
- Could consider adding a "reduced motion" preference check for accessibility
- FontAwesome icons load from external CDN (via Quarto extensions)

**Load Time Analysis:**
- 1-2 second load times likely due to:
  1. Multiple CSS animations initializing
  2. FontAwesome icon loading
  3. Art showcase auto-rotation starting up
  4. SVG filter effects compilation
  
**Performance is now optimized for typical usage. Complex visual effects inherently require some load time, but now within acceptable ranges for a personal academic website.**
