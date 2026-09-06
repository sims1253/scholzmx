# Visual Refinements Implementation Plan

**Goal**: Enhance the handcrafted/organic feel matching Peterson & Findus illustration vibe - warm, cozy, with organic shapes and warmer textures.

## 1. Organic Shapes & Typography

### 1.1 Add Organic Border Radius Utilities

Create CSS custom properties for hand-crafted edge shapes:

```css
:root {
  /* Irregular border-radius for organic feel */
  --organic-sm: 255px 15px 225px 15px / 15px 225px 15px 255px;
  --organic-md: 60% 40% 30% 70% / 60% 30% 70% 40%;
  --organic-lg: 30% 70% 70% 30% / 30% 30% 70% 70%;
  --organic-paper: 2px 4px 8px 2px / 4px 2px 8px 4px;
}
```

**File to modify**: `src/styles/base.css`

### 1.2 Organic Link Underlines

Replace standard underlines with hand-drawn wavy style:

```css
.organic-link {
  text-decoration: underline;
  text-decoration-color: var(--color-tansy);
  text-decoration-style: wavy;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
}
```

**Files to modify**: `src/styles/base.css`, apply to content links

---

## 2. Enhanced Paper Textures

### 2.1 Warm Vignette Overlay

Add subtle darkening at page edges for that cozy "grotto" lighting:

```css
/* Add to base.css body or page-wrapper */
.grotto-vignette::after {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 50%,
    rgba(42, 35, 24, 0.03) 80%,
    rgba(42, 35, 24, 0.08) 100%
  );
  pointer-events: none;
  z-index: 9998;
}
```

**File to modify**: `src/layouts/BaseLayout.astro` (add class to body)

### 2.2 Enhanced Watercolor Texture Pattern

Upgrade the existing parchment pattern with warmer tones:

```css
/* Enhanced botanical texture */
.paper-texture--watercolor::before {
  background-image:
    /* Warm fiber texture */
    linear-gradient(
      45deg,
      transparent 40%,
      rgba(180, 130, 90, 0.08) 41%,
      rgba(180, 130, 90, 0.08) 43%,
      transparent 44%
    ),
    /* Subtle grain */
      radial-gradient(circle at 30% 80%, rgba(160, 120, 80, 0.06) 1px, transparent 2px),
    /* Occasional pigment spots */
      radial-gradient(circle at 70% 20%, rgba(139, 90, 60, 0.04) 2px, transparent 4px);
  background-size:
    16px 16px,
    6px 6px,
    40px 40px;
}
```

**File to modify**: `src/components/PaperTexture.astro`

---

## 3. Enhanced Image Frames

### 3.1 New "Watercolor" Frame Style

Add organic, irregular frame option to ImageFrame component:

```css
.image-frame-watercolor {
  border-radius: var(--organic-md);
  padding: 8px;
  background: linear-gradient(
    135deg,
    rgba(255, 248, 240, 0.9) 0%,
    rgba(250, 245, 235, 0.7) 50%,
    rgba(240, 235, 220, 0.9) 100%
  );
  box-shadow:
    0 2px 8px rgba(139, 90, 60, 0.1),
    0 8px 24px rgba(90, 70, 50, 0.12),
    inset 0 0 20px rgba(255, 248, 240, 0.5);
}

.image-frame-watercolor img {
  border-radius: var(--organic-sm);
}
```

**File to modify**: `src/components/ImageFrame.astro` - add 'watercolor' style option

### 3.2 Enhanced Oval Frame

Soften the existing oval with warmer shadows:

```css
.image-frame-gentle-oval {
  border-radius: 50%;
  padding: 6px;
  background: var(--color-parchment-light);
  box-shadow:
    0 4px 12px rgba(139, 90, 60, 0.15),
    0 8px 20px rgba(90, 70, 50, 0.1),
    inset 0 0 15px rgba(255, 248, 240, 0.4);
}
```

**File to modify**: `src/components/ImageFrame.astro` - update existing styles

---

## 4. Organic Card Components

### 4.1 Handcrafted Card Component

Create a new `HandcraftedCard.astro` component:

```astro
---
interface Props {
  variant?: 'note' | 'recipe' | 'journal';
  className?: string;
}

const { variant = 'note', className = '' } = Astro.props;
---

<article class={`handcrafted-card card-${variant} ${className}`}>
  <slot />
</article>

<style>
  .handcrafted-card {
    background: var(--color-parchment-light);
    border: 1px solid color-mix(in srgb, var(--color-walnut) 15%, transparent);
    border-radius: var(--organic-paper);
    padding: var(--space-md);
    box-shadow:
      0 2px 6px rgba(139, 90, 60, 0.08),
      0 4px 12px rgba(90, 107, 71, 0.06);
    position: relative;
  }

  /* Tape/fixative effect */
  .handcrafted-card::before {
    content: '';
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 20px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(210, 180, 120, 0.3) 20%,
      rgba(210, 180, 120, 0.3) 80%,
      transparent 100%
    );
    clip-path: polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%);
  }
</style>
```

**New file**: `src/components/HandcraftedCard.astro`

---

## 5. Enhanced Drop Caps

Update DropCap component with warmer, more ornate options:

```css
.dropcap--ornate.dropcap--personal {
  float: left;
  font-size: 4.5em;
  line-height: 0.7;
  padding-right: 0.1em;
  padding-top: 0.1em;
  color: var(--color-ochre);
  font-family: var(--font-heading);
  text-shadow:
    2px 2px 0 var(--color-parchment-light),
    3px 3px 0 rgba(139, 90, 60, 0.15);
}
```

**File to modify**: `src/components/DropCap.astro` - enhance existing ornate style

---

## 6. Organic Section Dividers

Create `HandDrawnDivider.astro` with more options:

```astro
---
interface Props {
  variant?: 'wave' | 'vine' | 'sketch' | 'dots';
  color?: 'moss' | 'tansy' | 'walnut';
}

const { variant = 'wave', color = 'moss' } = Astro.props;
---

<div class={`divider divider-${variant} divider-${color}`}>
  <svg viewBox="0 0 200 20" preserveAspectRatio="none">
    <path
      d="M0,10 Q25,0 50,10 T100,10 T150,10 T200,10"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"></path>
  </svg>
</div>

<style>
  .divider {
    height: 20px;
    color: var(--color-moss);
    opacity: 0.6;
  }

  .divider svg {
    width: 100%;
    height: 100%;
  }
</style>
```

**Enhance file**: `src/components/HandDrawnDivider.astro`

---

## 7. Implementation Order

| Phase       | Tasks                                                    | Priority |
| ----------- | -------------------------------------------------------- | -------- |
| **Phase 1** | Add organic border-radius utilities, organic link styles | High     |
| **Phase 2** | Enhance PaperTexture with warmer watercolor pattern      | High     |
| **Phase 3** | Add vignette overlay to BaseLayout                       | Medium   |
| **Phase 4** | Add 'watercolor' frame style to ImageFrame               | Medium   |
| **Phase 5** | Create HandcraftedCard component                         | Medium   |
| **Phase 6** | Enhance DropCap styling                                  | Low      |
| **Phase 7** | Expand HandDrawnDivider options                          | Low      |

---

## Files to Modify

1. `src/styles/base.css` - Add organic utilities, link styles
2. `src/layouts/BaseLayout.astro` - Add vignette class
3. `src/components/PaperTexture.astro` - Add watercolor pattern variant
4. `src/components/ImageFrame.astro` - Add watercolor style option
5. `src/components/DropCap.astro` - Enhance ornate styling
6. `src/components/HandDrawnDivider.astro` - Add sketch variant

## New Files to Create

1. `src/components/HandcraftedCard.astro` - New handcrafted card component

---

## Design Principles Applied

- **Organic Imperfection**: Slight irregularities in border-radius, wavy underlines
- **Warmth**: Enhanced parchment tones, warm shadows, vignette lighting
- **Cozy**: Tape effects, paper textures, hand-drawn elements
- **Cohesion**: All new styles use existing CSS custom properties
