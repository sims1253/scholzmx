# Card dressing

Every listing card is a sheet of paper lying on a desk, and no two sheets are the same.
`src/lib/cardDressing.ts` decides, from the card's seed, how a sheet lies and what has
happened to it. The same seed always gives the same card, so nothing flickers on load.

Every mark a card can draw is drawn on one page, `/bench/` (`src/pages/bench.astro`): a bench
for the test suite, which no menu leads to and the sitemap leaves out. `bun run test:browser`
visits it, so whatever the suite checks of a card's marks it checks on every mark, and not only
on those the listings happen to draw.

## What varies

- **Where it lies:** tilt, a shift off its grid cell, which neighbour it lies on. The
  desk's gaps (`--desk-row-gap`, `--desk-col-gap` in `src/styles/stacked-card.css`) are
  sized so an overlap only reaches a neighbour's padding.
- **The paper:** tint (plain, cream, sage, aged with foxing, grey), ruling (plain, margin
  line, ruled, squared, ring binder with punched holes), edge (cut, torn off a pad,
  deckled) and sometimes a dog-eared corner.
- **What holds it down:** one or two strips of tape (stock, angle, length and torn ends
  vary), a drawing pin, a paperclip, a staple, or nothing.
- **One mark, or none:** drawn in `src/components/CardMark.astro`, in the footer ledge's
  doodle hand.

Each shelf has its own weights: a cup ring turns up more on recipe cards, a library date
stamp only on catalogue cards, and tags hang from their strings instead of being taped.

## Marks never cover words

A mark has a home that the card keeps clear for it:

- **Corner marks** (`ring`, `blot`, `thumb`, `stamp`, `pencil`, `tansy`, `mouse`) sit in
  the bottom-right corner. The card sets `data-zone`, and the footer line makes room.
  A card whose corner holds a taped photo gets no corner mark.
- **Edge marks** (`ants`, `inchworm`, `ladybird`) walk along the top edge, in the strip
  above the title, clear of a pin or a centre strip of tape.

Every mark is `aria-hidden` and ignores the pointer.

## Adding a mark

1. Add its name to `CornerMark` or `EdgeMark` and give it a weight per material in
   `MARK_WEIGHTS` (`src/lib/cardDressing.ts`).
2. Draw it in `CardMark.astro` (a small inline SVG; `ink`, `thin` and `fill` take the
   current colour, so it follows the torch theme).
3. Size and colour it in the marks section of `stacked-card.css`. A corner mark must fit
   in 3.6rem by 2.4rem; an edge mark walks the top edge and must reach no more than 0.4rem onto the sheet.
