# Card dressing

Every listing card is a sheet of paper lying on a desk, and no two sheets are the same.
`src/lib/cardDressing.ts` decides, from the card's seed, how a sheet lies and what has
happened to it. The same seed always gives the same card, so nothing flickers on load.

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

## Words on the lines

A sheet with lines to write on (ruled, squared, torn from a ring binder) carries
`data-lined`, keeps one pitch (`--sc-pitch` in `src/styles/stacked-card.css`) and keeps
its writing to it:

- **Every line is one pitch tall.** The content sets the line height and its blocks
  inherit it. A block that sets its own takes the lines below it off the rules.
- **Each block starts where the last one ended.** The card zeroes the margins of the
  blocks in its content, and of the date line, wherever a page's styles give its
  paragraphs one. A page's own styles outrank the card's layer, so other text a page
  slots into a lined card is the page's to set: no margins between its blocks, and
  writing smaller than the title moved down to the title's baseline with
  `top: var(--sc-nudge)`. Text in another voice than the page's sets `--sc-slope` first
  (the research page shows both).
- **A sheet is a whole number of pitches tall.** The padding above the first line and
  below the last, with the face's border, come to one pitch, so a sheet's words add up to
  whole pitches. One stretched to its row is cut down to whole pitches by `round()` (a
  browser that does not know it stretches the sheet whole, as before), and never below
  its words. So the date line at its foot lands on a rule however tall the row is.
- **A rule lies a pixel under the baseline.** Where a voice lays its baseline is a share
  of its font size on top of half the line box (`--baseline-personal` and
  `--baseline-serious` in `src/styles/tokens.typography.css`), measured once for each.

The squared sheet keeps its squares, half a pitch: a line of writing takes two.

The smoke test measures all of it on every lined card the pages it visits draw, a post's
related cards included: each baseline within three quarters of a pixel of a rule, the
sheet a whole number of pitches tall, and nothing cut off at its foot.

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
