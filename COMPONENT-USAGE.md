# Component Usage Guide

Quick reference for how to use the main components without making the site look messy.

## PaperTexture.astro
Adds subtle background texture. Use once per page at the top level.

```astro
<!-- Homepage -->
<PaperTexture pattern="botanical" intensity="light" />

<!-- Blog pages -->
<PaperTexture pattern="linen" intensity="light" />
```

Don't nest multiple PaperTexture components.

## DropCap.astro
Decorative first letter for long posts only.

```astro
<!-- In blog post content -->
<span class="dropcap dropcap--ornate dropcap--serious" data-first-letter="T" aria-hidden="true">T</span> ext continues...
```

Use exactly once per post, only for long essays (600+ words). Skip for short posts, lists, or titles.

## BotanicalBorder.astro
Page border applied in BaseLayout. Don't add extra borders inside pages.

## MarginNote.astro
Side notes in the right margin.

```astro
<MarginNote>This appears in the margin</MarginNote>
```

Or in markdown:
```markdown
> margin: This appears in the margin
```

Use sparingly - homepage okay for personality, avoid on blog index, optional for long posts.

## IllustratedFooter.astro
Different footer illustrations for different sections.

```astro
<!-- Homepage -->
<IllustratedFooter footerVariant="default" />

<!-- Blog pages -->
<IllustratedFooter footerVariant="writing" />
```

Applied in BaseLayout - keep consistent per section.

## HandDrawnDivider.astro
Section separators with sketchy/ink style.

Good for blog posts: one after the header, one before footer. Use sparingly elsewhere.

## PortraitFrame.astro
Framed portrait with organic styling. Homepage only - avoid on blog pages to keep focus on content.

## Experimental Components
- `VineFrame.astro` / `SmoothVineFrame.astro` - Ornamental framing, not used on main pages
- `Slideshow.astro` - Image carousel, currently experimental

## Typography Guidelines

Use `.longform` class for reading content:
- Homepage: Only around the main bio paragraph
- Blog index: On the posts container so excerpts inherit proper rhythm
- Blog posts: Already applied to article body

Stick to global font styles - avoid per-page font overrides unless there's a specific need.
