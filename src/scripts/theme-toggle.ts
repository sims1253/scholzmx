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
  return (getThemePreference() || getSystemPreference()) as 'dark' | 'light';
}

function applyTheme(theme: string): void {
  const root = document.documentElement;
  const btn = document.getElementById('nav-theme-toggle');

  root.setAttribute('data-theme', theme);

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

  applyTheme(getEffectiveTheme());

  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
}

// Auto-initialize
initThemeToggle();
