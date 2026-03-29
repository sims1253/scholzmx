const THEME_PREFERENCE_KEY = 'theme-preference';

function getThemePreference(): string | null {
  try {
    return localStorage.getItem(THEME_PREFERENCE_KEY);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Unable to read theme preference from localStorage.', error);
    }
    return null;
  }
}

function setThemePreference(value: 'dark' | 'light' | null): void {
  try {
    if (value === 'dark' || value === 'light') {
      localStorage.setItem(THEME_PREFERENCE_KEY, value);
    } else {
      localStorage.removeItem(THEME_PREFERENCE_KEY);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Unable to persist theme preference to localStorage.', error);
    }
  }
}

function getSystemPreference(): 'dark' | 'light' {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme(): 'dark' | 'light' {
  const pref = getThemePreference();
  return pref === 'dark' || pref === 'light' ? pref : getSystemPreference();
}

function applyTheme(theme: string): void {
  const root = document.documentElement;
  const btn = document.getElementById('nav-theme-toggle');

  root.setAttribute('data-theme', theme);

  const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (meta) {
    meta.content = theme === 'dark' ? '#0f100e' : '#f9f6f2';
  }

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

function initThemeToggle(): void {
  const btn = document.getElementById('nav-theme-toggle');
  applyTheme(getEffectiveTheme());
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
}

// Initialize immediately if DOM ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
  initThemeToggle();
}
