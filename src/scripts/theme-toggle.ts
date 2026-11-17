// The light switch (src/components/LightSwitch.astro). By night torchlight comes on by
// itself (the head script in BaseLayout reads the visitor's clock); the button overrides
// the clock until the next dawn or dusk.
const KEY = 'torch';
// Keep in step with the head script.
const DAWN = 6;
const DUSK = 21;

declare global {
  interface Window {
    grottoSky?: () => void;
    grottoTorch?: { theme: 'dark' | 'light'; until: number };
  }
}

function nextTurn(now: Date): number {
  const turn = new Date(now);
  const hour = now.getHours();
  if (hour < DAWN) turn.setHours(DAWN, 0, 0, 0);
  else if (hour < DUSK) turn.setHours(DUSK, 0, 0, 0);
  else {
    turn.setDate(turn.getDate() + 1);
    turn.setHours(DAWN, 0, 0, 0);
  }
  return turn.getTime();
}

function remember(theme: 'dark' | 'light'): void {
  const choice = { theme, until: nextTurn(new Date()) };
  window.grottoTorch = choice;
  try {
    localStorage.setItem(KEY, JSON.stringify(choice));
    localStorage.removeItem('theme-preference');
  } catch {
    // Ignore storage errors (e.g., private browsing mode)
  }
}

function getEffectiveTheme(): 'dark' | 'light' {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === 'dark' || chosen === 'light') return chosen;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: string): void {
  const root = document.documentElement;
  const btn = document.getElementById('nav-theme-toggle');

  root.setAttribute('data-theme', theme);

  // Update theme-color meta tag
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.content = theme === 'dark' ? '#18140f' : '#f2f1e8';
  }

  // Update aria-pressed state
  if (btn) {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    btn.title = theme === 'dark' ? 'Blow out the candle' : 'Light the candle';
  }
}

// The switch plays the change: the candle catches, or it is blown out (CSS, keyed on
// data-turn). Only a click plays it; on load and at dusk the drawing just is in its state.
function playTurn(theme: 'dark' | 'light'): void {
  const btn = document.getElementById('nav-theme-toggle');
  if (!btn) return;
  delete btn.dataset.turn;
  // Flush styles in between, so the same turn twice still starts over.
  void btn.getBoundingClientRect();
  btn.dataset.turn = theme === 'dark' ? 'light' : 'out';
}

function toggleTheme(): void {
  const current = getEffectiveTheme();
  const next = current === 'dark' ? 'light' : 'dark';

  const run = () => {
    remember(next);
    applyTheme(next);
    playTurn(next);
  };

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!('startViewTransition' in document) || prefersReduced) {
    run();
    return;
  }

  // A short cross-fade (modern.css), so the whole page changes light at once.
  document.startViewTransition(run).ready.catch(() => {
    // A skipped transition has already applied the theme.
  });
}

// Initialize
export function initThemeToggle(): void {
  const btn = document.getElementById('nav-theme-toggle');

  applyTheme(getEffectiveTheme());

  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }

  // The day moves on while the page is open: shadows turn, and at dusk torchlight comes on.
  setInterval(() => {
    window.grottoSky?.();
    applyTheme(getEffectiveTheme());
  }, 5 * 60_000);
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
  initThemeToggle();
}
