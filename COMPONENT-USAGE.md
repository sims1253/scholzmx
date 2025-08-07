# Component Usage Rules

Scope: Home, Blog Index, Blog Post Detail. Non-destructive guidance aligned with design_guide.md. Keep global 21px sizes and existing line-heights.

## PaperTexture.astro
- Purpose: Subtle parchment/linen background texture per-surface.
- Home: pattern="botanical" intensity="light"
- Blog index + post detail: pattern="linen" intensity="light"
- Do not nest multiple PaperTexture per page. Use at top-level surface only.

Example:
[`PaperTexture.astro()`](src/components/PaperTexture.astro)
[`index.astro()`](src/pages/index.astro)
[`blog.astro()`](src/pages/blog.astro)
[`[...slug].astro()`](src/pages/blog/[...slug].astro)

## BotanicalBorder.astro (layout-level)
- Purpose: Decorative frame around the whole page.
- Applied via BaseLayout; keep intensity="light" to avoid distraction.
- Do not add additional borders inside content pages.

Example:
[`BaseLayout.astro()`](src/layouts/BaseLayout.astro)

## DropCap.astro
- Purpose: One decorative initial to begin long-form narrative content.
- Where: Only first paragraph in long essays (> ~600 words) on post detail. Avoid in titles, standfirst/description, lists, or short posts.
- Frequency: Exactly one per article.
- Mobile: Let CSS hide or reduce if needed (component/global styles handle behavior).
- Blog index: Do not use in cards/excerpts.

Example use in a post:
[`DropCap.astro()`](src/components/DropCap.astro)
[`[...slug].astro()`](src/pages/blog/[...slug].astro:61)

## MarginNote.astro
- Purpose: Side notes for playful/secondary commentary.
- Home: Allowed sparingly for personality (e.g., welcome note).
- Blog index: Avoid.
- Post detail: Optional for essays; keep short, avoid interrupting flow.
- Accessibility: Ensure notes aren’t required to understand the main text.

Example:
[`MarginNote.astro()`](src/components/MarginNote.astro)
[`index.astro()`](src/pages/index.astro:66)

## IllustratedFooter.astro
- Purpose: Page-ending illustration theme.
- Home: footerVariant="default"
- Blog index + post detail: footerVariant="writing"
- Keep consistent per section.

Example:
[`IllustratedFooter.astro()`](src/components/IllustratedFooter.astro)
[`BaseLayout.astro()`](src/layouts/BaseLayout.astro)

## HandDrawnDivider.astro
- Purpose: Section separators with hand-drawn/ink vibe.
- Post detail: One after header meta/title, one before footer/nav recommended.
- Home + Blog index: Use very sparingly; only if needed to separate distinct content blocks.

Example:
[`HandDrawnDivider.astro()`](src/components/HandDrawnDivider.astro)
[`[...slug].astro()`](src/pages/blog/[...slug].astro:59,68)

## PortraitFrame.astro
- Purpose: Framed portrait/hero image with gentle organic styling.
- Home only. Prefer a single portrait in the hero area. Avoid on blog index and post detail to keep reading focus.

Example:
[`PortraitFrame.astro()`](src/components/PortraitFrame.astro)
[`index.astro()`](src/pages/index.astro:48)

## VineFrame.astro / SmoothVineFrame.astro
- Purpose: Experimental/ornamental framing.
- Default: Not used on publish surfaces (Home, Blog Index, Post Detail). Reserve for experiments/lab routes.

Example:
[`VineFrame.astro()`](src/components/VineFrame.astro)
[`SmoothVineFrame.astro()`](src/components/SmoothVineFrame.astro)

## Slideshow.astro
- Purpose: Visual portfolio moments.
- Home: Optional sidebar/easel concept; keep commented or behind a toggle until curated. Avoid on blog index and post detail for performance and focus.

Example:
[`Slideshow.astro()`](src/components/Slideshow.astro)
[`index.astro()`](src/pages/index.astro:96)

## Typography usage notes
- .longform: Apply to true reading blocks only.
  - Home: Only around the biography paragraph; use .longform personal-content.
  - Blog index: Apply to posts list container so excerpts inherit rhythm.
  - Post detail: Apply to article body only (already present).
- Headings: Rely on global styles for families/weights; page CSS should only adjust layout/spacing.
- Avoid per-page font-family overrides unless there’s a clear, page-specific need.

Relevant files:
[`global.css`](src/styles/global.css)
[`index.astro`](src/pages/index.astro)
[`blog.astro`](src/pages/blog.astro)
[`[...slug].astro`](src/pages/blog/[...slug].astro)
[`BaseLayout.astro`](src/layouts/BaseLayout.astro)
