# Doodad System Quick Guide

## Adding New Doodads

### SVG Doodles

1. Add SVG to `/public/doodles/`
2. Add item to `svgDoodles` in `src/config/doodadConfig.ts`:

```js
{
  id: 'my-doodle',
  probability: 0.2, // weight for selection
  layerTypes: ['all'],
  kind: 'svg',
  src: '/doodles/my-doodle.svg',
  defaultSize: '2rem',
  positions: ['topLeft', 'topRight'],
  generate: ({ pick, map }) => ({
    position: pick(0.5) ? 'topLeft' : 'topRight',
    rotation: Math.round(map(-15, 15))
  })
}
```

### Element Doodles

1. Add item to appropriate category in `doodadConfig.ts` with `kind: 'element'`
2. Add CSS styling in `src/styles/stacked-card.css`
3. Add template block in `src/components/StackedCard.astro` if needed

### Background Effects

1. Add item to `backgroundEffects` with `kind: 'background'`
2. Add CSS using data attributes in `stacked-card.css`

## Technical Implementation

### SVG Rendering

SVG doodles use **CSS mask-based rendering** for perfect transparency:

- SVGs are loaded as CSS mask images via `--doodle-src` variable
- Colors controlled by `background-color` on the container
- No `<img>` elements - pure CSS masking approach

### Theming

Customize doodle colors per page/theme using CSS variables:

```css
.my-page {
  --doodle-color: var(--color-sage); /* Override default color */
}
```

### Browser Support

- **Modern browsers:** Full SVG mask experience with color-mix() theming
- **Older browsers:** Graceful degradation - simple colored rectangles or invisible
- **No feature detection needed** - CSS handles fallbacks naturally

## Key Files

- **Config:** `src/config/doodadConfig.ts` - All doodad definitions
- **Styles:** `src/styles/stacked-card.css` - Visual styling + mask rendering
- **Template:** `src/components/StackedCard.astro` - Sets `--doodle-src` variables

## Probability Notes

- **Exclusive categories:** Item probabilities are weights (relative selection odds)
- **Non-exclusive:** Item probabilities are independent 0-1 chances
- **Category probability:** Gate that enables the entire category
