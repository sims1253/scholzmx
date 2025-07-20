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

## Aesthetic Vision: Game UI Embedded in World

User wants to move away from "generic Unity UI" sterile modern look toward:
- **Game world integration**: UI elements feel part of the world (like Settlers 4 stone wall framing)
- **Hidden discoveries**: Peterson & Findus style where cute elements can be discovered
- **Handcrafted feel**: Century botanical illustrations, manuscript illuminations
- **Organic materials**: Ferns, moss, forest textures vs clean geometric shapes
- **Cozy adventure**: Point-and-click game warmth vs corporate website sterility

Reference aesthetic elements:
- Simon Sarris: Landscape scribbles, small illustrations, organic elements
- Turntrout: Fish with vine leaves, large illustrated initials, pixel art animations
- Botanical illustrations: Detailed, handcrafted, aged paper feel
- Peterson & Findus games: Hidden interactive elements, cozy discovery

## Blogdown to Quarto Migration Issues

- Legacy blogdown posts may have invalid YAML structures that break Quarto rendering
- Common issue: `image:` field with nested properties (caption, focal_point, preview_only) invalid in Quarto
- Need systematic migration of all legacy content from /content/post/ directory
- Should audit all .Rmd files for incompatible YAML frontmatter before deployment

## Performance Optimization Analysis (2025-07-03)

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