# Component Usage Guide

Quick reference for the shared pieces and where they belong.

## Page shells
`BaseLayout.astro` draws the canopy, navigation and footer. Pick a `tone` (`personal` sets text in Alegreya, `serious` in ET Book) and a `layout` (`prose`, `listing`, `cards`, `wide`, `full`).

## Index pages
Blog, recipes, research and projects are desks of cards, each shelf in one material: writing paper (blog), recipe cards, library catalogue cards (research) and manila workshop tags (projects). Cards lie at their natural heights, a little off their cells, and overlap at their margins. Every card's tilt, paper, fastener and mark comes from its seed (see `DOODAD_GUIDE.md`).

```astro
<div class="index-page" data-tabbed>
  <header class="page-header">
    <h1 class="page-title">Blog</h1>
    <p class="page-lede">One sentence about the section.</p>
  </header>
  <IndexFinder type="blog" noun="posts" count={posts.length} tags={tags} jumps={yearJumps} />
  <NoteCardStack media="thumb" headingLevel={3} items={posts} />
</div>
```

`NoteCardStack` renders one desk of cards. An item's `tab` (a year, an initial) becomes a divider tab standing up behind the first card of its run, and the year jumps link to it. `media="thumb"` tapes the hero image into the card's bottom corner, so the title keeps the sheet's full width; `material="recipe"` makes recipe cards. Use `StackedCard` directly for custom card content, with `material` and `class="sc-desk"` on the grid around it (research, projects). `IndexFinder` filters `.nc-item` cards by `data-tags`; past 12 entries it opens with search and the tag browser, below that it is one quiet line.

## Photographs and plots
Images that stand alone in a paragraph or figure in posts, recipes and notes are pasted in as prints automatically. Wrap other photos in `.pasted` for the same two paper strips.

## Recipes
Recipes describe their ingredients and steps in frontmatter, and the card is the whole recipe: the method is told once. `RecipeCard.astro` shows it as Michael Chu's recipe table (ingredients down the left in the order they go in, each step spanning what it combines, with a clock row of start times underneath), as a numbered step list with a list to gather from, and as a cooking mode with timers. Table and steps are two views of the same thing, one at a time, switched with "Show as". In windows of 48rem (768px) and wider, a recipe opens with the table if the table fits the window's width, and with the steps if it would scroll sideways. Narrower windows have the steps only. Without JavaScript the steps show. The table opens with its first step shown under it, as the list has it, with its notes and its picture; picking another step in the table shows that one and moves focus to it, and "Back to the table" leads back. While cooking, a reload brings back the step, its timers, the amount, the view and what was ticked off; stopping asks a second time while a timer runs. The table, the list and cooking mode number the steps the same way; "Get ready" is step 1 and the table's ingredient column.

What a step's instruction leaves out goes into the step, not into prose under the card: `notes` for the why, the tips and the latitude, and `photo` for what the step looks like when it is right. The Markdown body is a short introduction; it stands at the top of the page beside the hero picture, with the time. The card says what the recipe makes, beside the control that scales it. `heroAlt` says what the hero picture shows, and `date` when the recipe was added.

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
    wait: true # hands-off time, drawn in leaf shade
    heat: 160 °C
    result: roasted squash # how later steps refer to it
    notes: # asides under the step; amounts in braces scale with the recipe. An account of what you tried stays as it happened: write those amounts without braces
      - You can't really over-roast the squash, as you can blend it with more water, up to {180 ml}.
    photo: # a print kept with the step
      src: '../../assets/images/recipes/rolls/roasted.jpg'
      alt: Orange squash cubes on a baking sheet, browned at the edges # what the picture shows
      caption: The cubes when they are soft enough
  - id: bake
    uses: [roast]
    do: Bake
    minutes: 23
    timers: # stages of a timed step; they add up to `minutes`
      - { minutes: 8, cue: 'Turn the oven down to 200 °C, or to 180 °C with convection' } # said and shown when the stage ends; it must be right for every oven the step allows
      - { minutes: 15 }
    detail: Line the dish and set 15 balls in it.
    halved: Line the dish and set 7 or 8 balls in it. # the instruction for Half, where `detail` would be wrong
    doubled: Line both dishes and set 15 balls in each. # the same for Double
meanwhile:
  - do: Preheat the oven to 220 °C
    during: proof # shown above that step's column
```

Rules the build checks, so the table can't mislead: every id is unique, steps come in cooking order, each ingredient and each intermediate result goes into exactly one later step (list an ingredient twice if it's split), every `meanwhile` names a real step, and a step's `timers` add up to its `minutes`. A scaled yield is given in whole things (half of 15 rolls is "7 or 8"). Hands-on and total time are computed from `minutes`; untimed steps count as zero, so time what matters. The clock row only appears when every step but the last is timed.

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
