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
- **One mark, or none:** drawn in `src/components/CardMark.astro`. The stains and the
  scribbles are in the footer ledge's doodle hand; the flowers and the critters are noted
  down as a naturalist would, with a fine pen line, a wash of colour beneath it and a
  stipple where the fur or the wing is, which reads as texture at the size they sit.

Each shelf has its own weights: critters are the likeliest mark on writing paper, a cup
ring turns up more on recipe cards, a library date stamp only on catalogue cards, and tags
hang from their strings instead of being taped.

## Which card gets which

A card's seed draws whether it carries a mark, and of what kind, from its shelf's weights
(`MARK_WEIGHTS` in `src/lib/cardDressing.ts`).

Which critter is not the card's own to draw. A shelf deals its critters along itself
(`dealCritter`): each card that draws one takes the critter three places along the shelf's
list from the card that drew one before it, from a start the shelf's first card's seed
sets. So a shelf shows as many kinds as it has cards that draw a critter, up to the number
of kinds, and two such cards share none until the deal has come round to every kind. (A
card's own seed could not: shifted or not, two independent draws agree as often as ever.)
Each shelf finds its cards' places with `critterPlaces` and passes each, with its first
card's seed, to its card (`deal`); dressed without them, a card draws its critter from its
seed.

## Marks never cover words

A mark has a home that the card keeps clear for it:

- **Corner marks** (`ring`, `blot`, `thumb`, `stamp`, `pencil`, `tansy`, `mouse`) sit in
  the bottom-right corner. The card sets `data-zone`, and the footer line makes room.
  A card whose corner holds a taped photo gets no corner mark.
- **Edge marks** (`ants`, `inchworm`, `ladybird`, `bee`, `butterfly`, `dragonfly`,
  `spider`, `snail`, `beetle`, `cricket`) walk or rest along the top edge, in the strip
  above the title, clear of a pin or a centre strip of tape.

Every mark is `aria-hidden` and ignores the pointer.

## Critters move

Each critter moves a little, in character: the ants march, the inchworm inches, the bee
hovers with its wings a blur, the butterfly opens and shuts, the spider swings on its
thread, the snail glides, the mouse nibbles. The body moves on the mark itself with
`translate` and `rotate`, which the compositor does alone; a leg or a wing moves inside
the drawing, which has to be painted again on every frame it moves. So a critter moves
only while its card is on screen or near the edge of the window
(`src/scripts/card-critters.ts` marks the others `data-still`), and nothing moves under
`prefers-reduced-motion`.

## Adding a mark

1. Add its name to `CornerMark` or `EdgeMark` and give it a weight per material in
   `MARK_WEIGHTS` (`src/lib/cardDressing.ts`).
2. Draw it in `CardMark.astro` (a small inline SVG; `ink`, `thin` and `fill` take the
   current colour, so it follows the torch theme).
3. Size and colour it in the marks section of `stacked-card.css`. A corner mark must fit
   in 3.6rem by 2.4rem; an edge mark walks the top edge and must reach no more than 0.4rem
   onto the sheet, at either end of its turn and at sampled moments of its motion. Measure
   it rather than judge it by eye: `bun run test:browser` measures the marks the listing
   pages draw.
4. If it moves, give each part that moves its own group in the drawing and animate that
   group (`transform-box: fill-box`, so it turns about its own middle or edge). The "What
   the critters do" section of `stacked-card.css` has the loops; keep them small and slow.
   `bun run test:browser` steps every loop of every critter the pages draw through itself
   and fails on one that changes nothing, and on a part that should move and does not. It
   holds which parts those are, in a table of its own (`MOVES`): a new critter goes there.
   Mind that `scale()` inside `transform` takes a comma between its two values, where the
   `scale` property takes a space.
