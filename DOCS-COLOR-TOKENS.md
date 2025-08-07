# Color Tokens Usage Guide

Scope: src/styles/tokens.colors.css palette for Astro site. Use variables, not hex. Keep contrast and warmth consistent with long-form reading.

## Core palette (authoritative)
File: src/styles/tokens.colors.css. Do not redefine in components. Extend via semantic tokens only.

## How to use in CSS
```css
@import "./tokens.colors.css";

.page {
  color: var(--color-text-primary);
  background: var(--color-background);
}

a {
  color: var(--color-link);
  text-decoration-color: var(--color-underline);
}

a:hover { color: var(--color-link-hover); text-decoration-color: var(--color-underline-hover); }

.card { background: var(--color-surface); border-color: var(--color-underline); }
.rule { border-color: var(--rule-ink); }
```

## Using in Astro/JS
```ts
// src/pages/example.astro
---
const ink = 'var(--color-ink-dark)';
---
<div style={`color:${ink}`}>Hello</div>
```
```ts
// TS modules (e.g., building inline styles)
export const colors = {
  text: 'var(--color-text-primary)',
  accent: 'var(--color-accent-primary)'
};
```

## Semantic tokens (preferred)
Use semantic tokens for UI intent; avoid raw base inks/warm/botanical in components:
- Text: --color-text-primary|secondary|muted
- Links: --color-link|link-hover, underlines: --color-underline|underline-hover
- Surfaces: --color-background|surface
- Accents: --color-accent-primary|secondary, decorative: --color-decorative

## Derived utilities
- --rule-ink: quiet rules/hairlines
- --wash-sage: subtle panel wash
- --btn-walnut-hover: button hover darken

## Creating new semantics
1) Add new semantic var in tokens.colors.css mapping to a base.
2) Prefer reusing existing bases; keep <5 accents site-wide.
3) Name by intent (e.g., --color-tag-bg, --color-quote-rule).

## Theming/experiments
```css
/* Example: lab route dark plate */
:root[data-theme="plate"] {
  --color-background: var(--color-ink-plate);
  --color-text-primary: var(--color-parchment);
}
```
Apply by toggling data-theme on <html> or top container.

## Accessibility & contrast
- Body text ≥ 4.5:1 against background; links ≥ 3:1 against surrounding text, underline visible.
- Avoid using --color-ink-light for body text.
- Test with Lighthouse or OS high-contrast modes.

## Do/Don’t
- Do import tokens once (global.css) and rely on cascade; component scopes may override with semantics.
- Don’t hardcode hex or duplicate tokens in components.
- Do keep line rules and borders subtle using --rule-ink.
- Don’t mix too many warms/cools in the same block; choose one accent.

## References
- tokens: src/styles/tokens.colors.css
- globals: src/styles/global.css