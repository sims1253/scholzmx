# Component Usage Guide

Quick reference for how to use the main components without making the site look messy.

## Layout & Page Framing (applied in BaseLayout)

- **BotanicalBorder.astro** — Vine-like page borders (`position` top/bottom/left/right/corner, `intensity`). Applied in `BaseLayout`; don't add extra borders inside pages.
- **ReadingProgress.astro** — Scroll progress bar at the top of long pages. Applied in `BaseLayout`.
- **BackToTop.astro** — Fixed back-to-top button. Applied in `BaseLayout`.
- **FontSizeControl.astro** — Font-size scale dropdown (persisted as `--font-scale`). Applied in `BaseLayout`'s nav.
- **IllustratedFooter.astro** — Footer with section-specific botanical illustration (`footerVariant` garden/kitchen/writing/craft/default). Applied in `BaseLayout`; keep consistent per section.
- **SmoothVineFrame.astro** — Ornamental vine border used around the footer quote. Rendered inside `IllustratedFooter`.
- **QuoteOfTheDay.astro** — Click-to-refresh daily quote, used in the footer quote section (via `IllustratedFooter`).

## Content Components

- **ImageFrame.astro** — The single image component for the whole site. Handles Astro-optimized assets (`ImageMetadata`) and plain remote URLs, plus styles: `botanical`, `polaroid`, `gentle-oval`, `watercolor`, `hero`, `simple`. Accepts `positionX/Y` (percent, -50..50), `scale`, `fillMode`, `aspectRatio`, `alternateSrc` (click-to-toggle), `caption`.

```astro
<ImageFrame src={heroImage} style="hero" aspectRatio="8/3" positionX={10} loading="eager" />
```

- **DropCap.astro** — Decorative first letter for long posts only. Color variants gold/walnut/moss/ochre/sage; style variants ornate/botanical.

```astro
<DropCap letter="T" color="walnut" style="ornate" />
```

Use exactly once per post, only for long essays (600+ words). Skip for short posts, lists, or titles.

- **Margin notes** — Sidenotes in the right margin. There is **no MarginNote component**; write a blockquote that starts with `margin:` in a blog post or recipe body and it becomes a margin note automatically (`margin-notes.ts`):

```markdown
> margin: This appears in the margin
```

On narrow screens the note text is rendered inline below the anchor (content is never hidden). Use sparingly - okay on long posts, avoid on listing pages.

- **TableOfContents.astro** — Auto-generated heading outline (h2-h4) with active-section highlighting. Used on blog/note/recipe detail pages. Set `maxDepth` to control heading depth.

- **HandDrawnDivider.astro** — Sketchy/ink style section separators. Variants: `vine`, `simple`, `botanical`, `ornate`, `sketch`. Good for blog posts: one after the header, one before footer. Use sparingly elsewhere.

- **FaintLineDivider.astro** — A quiet 1px horizontal rule (`narrow`/`medium`/`wide`).

- **Breadcrumb.astro** — Breadcrumb navigation with home link. Used on detail pages.

## Cards & the Doodad System

- **StackedCard.astro** — The layered card with the seeded doodad system (SVG doodles, tape, bookmarks, wash/ring effects). Props: `seed`, `title`, `subtitle`, `href`, `layers` 1-4, `tilt`, `ornament`, `layout` `stacked`/`side`, `headingLevel`. See `DOODAD_GUIDE.md` for the technical details.
- **GridLayout.astro** — Grid wrapper (`columns` 1/2/3/'auto', `gap`, `itemMinWidth`).
- **NoteCardStack.astro** — Renders an array of `StackedCard`s with hero images, dates, and tag chips. Props: `items`, `columns`, `aspectRatio`, `tagBasePath` (defaults to `/blog`; pass `tagBasePath="/recipes"` on recipe listings so chips link to the right filter).

```astro
<NoteCardStack columns={1} aspectRatio="3/2" tagBasePath="/recipes" items={cards} />
```

## Typography Guidelines

Reading content uses the `.prose` class (personal/serious body presets come from the page `tone`). Stick to global font styles and tokens - avoid per-page font overrides unless there's a specific need.
