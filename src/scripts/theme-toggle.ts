// Theme toggle functionality
const KEY = 'theme-preference';

function getThemePreference(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function setThemePreference(value: string | null): void {
  try {
    if (value) {
      if (value !== 'dark' && value !== 'light') {
        return;
      }
      localStorage.setItem(KEY, value);
    } else {
      localStorage.removeItem(KEY);
    }
  } catch {
    // Ignore storage errors (e.g., private browsing mode)
  }
}

function getSystemPreference(): 'dark' | 'light' {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme(): 'dark' | 'light' {
  const pref = getThemePreference();
  if (pref === 'dark' || pref === 'light') {
    return pref;
  }
  return getSystemPreference();
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
    setThemePreference(next);
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
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
  initThemeToggle();
}
