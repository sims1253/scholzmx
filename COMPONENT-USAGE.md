# Component Usage Guide

Quick reference for the shared pieces and where they belong.

## Page shells
`BaseLayout.astro` draws the canopy, navigation and footer. Pick a `tone` (`personal` sets text in Alegreya, `serious` in ET Book) and a `layout` (`prose`, `listing`, `wide`, `full`).

## Index pages
Blog, recipes, research and notes share `src/styles/index-list.css`: a page header, then groups whose label (a year or an initial) hangs in the left margin on wide screens.

```astro
<div class="index-page">
  <header class="page-header">
    <h1 class="page-title">Blog</h1>
    <p class="page-lede">One sentence about the section.</p>
  </header>
  <section class="index-group" data-index-group>
    <h2 class="index-label">2025</h2>
    <NoteCardStack columns="auto" itemMinWidth="26rem" media="thumb" headingLevel={3} items={posts} />
  </section>
</div>
```

`NoteCardStack` renders the seeded note cards (see `DOODAD_GUIDE.md`); use `StackedCard` directly for custom card content. With `columns="auto"` and `itemMinWidth`, cards fill rows of equal width; `media="thumb"` tapes the hero image into the card's corner instead of running it across the top. Pages with card grids use `layout="cards"`, which widens to two columns of cards on wide screens. Add `IndexFinder.astro` for search and tag filters; it filters `.nc-item` cards by `data-tags`.

## Photographs and plots
Images that stand alone in a paragraph or figure in posts, recipes and notes are pasted in as prints automatically. Wrap other photos in `.pasted` for the same two paper strips.

## Recipes
Recipes describe their ingredients and steps in frontmatter. `RecipeCard.astro` turns that into Michael Chu's recipe table (ingredients down the left in the order they go in, each step spanning what it combines, with a clock row of start times underneath), a numbered step list with a list to gather from for phones and screen readers, and a cooking mode with timers. The table, the list and cooking mode number the steps the same way; "Get ready" is step 1 and the table's ingredient column. The prose below stays the long version: stories, tips and margin notes. The page header leaves yield and time to the card.

```yaml
makes: { amount: 15, unit: rolls } # what Half and Double scale
prepMinutes: 10 # chopping and weighing before step one
equipment:
  - parchment paper
  - { name: a 34 × 24 cm baking dish, doubled: two 34 × 24 cm baking dishes } # swapped in by Double
ingredients:
  - id: squash
    amount: 350
    unit: g
    name: Hokkaido squash
    prep: cut into small cubes # becomes part of the "Get ready" stage
    note: or butternut, up to {400 g} # latitude; amounts in braces scale with the recipe
  - id: salt
    name: a pinch of salt # no amount: never scaled
steps:
  - id: roast
    uses: [squash] # ingredient ids or earlier step ids
    do: Roast # the table cell
    detail: Roast at 160 °C until soft enough to mash. # cooking mode and step list
    minutes: 25 # or [8, 10] for a range
    wait: true # hands-off time, drawn hatched
    heat: 160 °C
    result: roasted squash # how later steps refer to it
meanwhile:
  - do: Preheat the oven to 220 °C
    during: proof # shown above that step's column
```

Rules the build checks, so the table can't mislead: every id is unique, steps come in cooking order, each ingredient and each intermediate result goes into exactly one later step (list an ingredient twice if it's split), and every `meanwhile` names a real step. Hands-on and total time are computed from `minutes`; untimed steps count as zero, so time what matters. The clock row only appears when every step but the last is timed.

## Series.astro
Inline, comma-separated lists of words or links (tags, authors). Use it instead of mapping inside running text, which would add stray spaces before commas.

## DropCap.astro
Decorative first letter for long posts only.

```astro
<span class="dropcap dropcap--ornate dropcap--serious" data-first-letter="T" aria-hidden="true">T</span> ext continues...
```

Use exactly once per post, only for long essays (600+ words). Skip for short posts, lists, or titles.

## Margin notes
```markdown
> margin: This appears in the margin
```

Notes sit in the right margin on wide screens and fall back to inline notes on narrow ones.

## Typography Guidelines
Stick to global font styles. Headings are Alegreya everywhere; avoid per-page font overrides unless there's a specific need.
