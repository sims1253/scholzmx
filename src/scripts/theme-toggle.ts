// Theme toggle functionality
const KEY = 'theme-preference';

function getThemePreference(): string | null {
  return localStorage.getItem(KEY);
}

function setThemePreference(value: string | null): void {
  if (value) {
    localStorage.setItem(KEY, value);
  } else {
    localStorage.removeItem(KEY);
  }
}

function getSystemPreference(): 'dark' | 'light' {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme(): string {
  return getThemePreference() || getSystemPreference();
}

function applyTheme(theme: string | null): void {
  const root = document.documentElement;
  const btn = document.getElementById('nav-theme-toggle');

  if (!theme) {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }

  // Update theme-color meta tag
  const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (meta) {
    meta.content = theme === 'dark' ? '#0f100e' : '#f9f6f2';
  }

  // Update aria-pressed state
  if (btn) {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
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

  if ('startViewTransition' in document && !prefersReduced) {
    document.startViewTransition(run);
  } else {
    run();
  }
}

// Initialize
export function initThemeToggle(): void {
  const btn = document.getElementById('nav-theme-toggle');

  // Apply saved preference
  applyTheme(getThemePreference());

  // Set initial aria-pressed
  if (btn) {
    btn.setAttribute('aria-pressed', getEffectiveTheme() === 'dark' ? 'true' : 'false');
    btn.addEventListener('click', toggleTheme);
  }
}

// Auto-initialize
initThemeToggle();
