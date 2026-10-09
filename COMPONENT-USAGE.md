# Component Usage Guide

Quick reference for the shared pieces and where they belong.

## Page shells
`BaseLayout.astro` draws the canopy, navigation and footer. Pick a `tone` (`personal` sets text in Alegreya, `serious` in ET Book) and a `layout` (`prose`, `listing`, `wide`, `full`).

## Index pages
Blog, recipes, research and notes share `src/styles/index-list.css`:

```astro
<div class="index-page">
  <header class="page-header">
    <h1 class="page-title">Blog</h1>
    <p class="page-lede">One sentence about the section.</p>
  </header>
  <section class="index-group" data-index-group>
    <h2 class="index-label">2025</h2>
    <ol class="index-entries">
      <li class="index-entry nc-item" data-tags="R,brms">…</li>
    </ol>
  </section>
</div>
```

The label hangs in the left margin on wide screens. Add `IndexFinder.astro` for search and tag filters; it filters `.nc-item` entries by `data-tags`.

## Series.astro
Inline, comma-separated lists of words or links (tags, authors). Use it instead of mapping inside running text, which would add stray spaces before commas.

## DropCap.astro
Decorative first letter for long posts only.

```astro
<span class="dropcap dropcap--ornate dropcap--serious" data-first-letter="T" aria-hidden="true">T</span> ext continues...
```

Use exactly once per post, only for long essays (600+ words). Skip for short posts, lists, or titles.

## Photographs
Wrap photos that should look pasted into the notebook in `.pasted`; it adds two paper strips.

## Margin notes
```markdown
> margin: This appears in the margin
```

Notes sit in the right margin on wide screens and fall back to inline notes on narrow ones.

## Typography Guidelines
Stick to global font styles. Headings are Alegreya everywhere; avoid per-page font overrides unless there's a specific need.
