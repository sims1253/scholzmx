// Code themes for Shiki, adjusted so every token reads at WCAG AA (4.5:1) on the code
// block backgrounds the site sets (base.css). Kanagawa's own hues stay; a token that
// falls short is mixed toward black (light theme) or white (torchlight) just enough.
import { bundledThemes } from 'shiki';

const TARGET = 4.6; // a hair over 4.5, so rounding to hex never lands below it

const parse = (hex) => {
  let h = hex.replace('#', '');
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  const n = (i) => parseInt(h.slice(i, i + 2), 16);
  return { rgb: [n(0), n(2), n(4)], alpha: h.length === 8 ? n(6) / 255 : 1 };
};
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (rgb, to, t) => rgb.map((v, i) => v + (to[i] - v) * t);

function readable(color, background) {
  const { rgb: raw, alpha } = parse(color);
  const bg = parse(background).rgb;
  const rgb = alpha < 1 ? mix(bg, raw, alpha) : raw; // what the eye sees
  if (contrast(rgb, bg) >= TARGET) return color;
  const toward = luminance(bg) > 0.18 ? [0, 0, 0] : [255, 255, 255];
  for (let t = 0.02; t <= 1; t += 0.02) {
    const next = mix(rgb, toward, t);
    if (contrast(next, bg) >= TARGET) return toHex(next);
  }
  return toHex(toward);
}

async function adjusted(name, background) {
  const theme = structuredClone((await bundledThemes[name]()).default);
  // Theme colours are hex strings; named or inherited values are left alone.
  const fix = (c) => (c.startsWith('#') ? readable(c, background) : c);
  theme.name = `${name}-aa`;
  if (theme.colors?.['editor.foreground']) {
    theme.colors['editor.foreground'] = fix(theme.colors['editor.foreground']);
  }
  for (const rule of theme.tokenColors ?? []) {
    if (rule.settings?.foreground) rule.settings.foreground = fix(rule.settings.foreground);
  }
  return theme;
}

// Backgrounds of .astro-code in each light, as base.css sets them.
export const lightCodeTheme = await adjusted('kanagawa-lotus', '#e9eadf');
export const darkCodeTheme = await adjusted('kanagawa-dragon', '#221d16');
