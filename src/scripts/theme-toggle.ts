// The torch. By night it lights itself (the head script in BaseLayout reads the
// visitor's clock); the button overrides the clock until the next dawn or dusk.
const KEY = 'torch';
// Keep in step with the head script.
const DAWN = 6;
const DUSK = 21;

declare global {
  interface Window {
    grottoSky?: () => void;
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
  try {
    localStorage.setItem(KEY, JSON.stringify({ theme, until: nextTurn(new Date()) }));
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
    btn.title = theme === 'dark' ? 'Put out the torch' : 'Light the torch';
  }
}

function toggleTheme(): void {
  const current = getEffectiveTheme();
  const next = current === 'dark' ? 'light' : 'dark';

  const run = () => {
    remember(next);
    applyTheme(next);
  };

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!('startViewTransition' in document) || prefersReduced) {
    run();
    return;
  }

  // The new light spreads outward from the torch, as if it had just been lit or put out.
  const btn = document.getElementById('nav-theme-toggle');
  const box = btn?.getBoundingClientRect();
  const x = box ? box.left + box.width / 2 : innerWidth;
  const y = box ? box.top + box.height / 2 : 0;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = document.startViewTransition(run);
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: 650,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    })
    .catch(() => {
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

  // The day moves on while the page is open: shadows turn, and at dusk the torch lights.
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
