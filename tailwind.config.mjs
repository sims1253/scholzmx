/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,vue,md,mdx}'],
  prefix: 'tw-',
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Map to your existing CSS variables so you can use tw-text-ink etc
        'ink-dark': 'var(--color-ink-dark)',
        'ink-medium': 'var(--color-ink-medium)', 
        'ink-light': 'var(--color-ink-light)',
        'ink-plate': 'var(--color-ink-plate)',
        'parchment': 'var(--color-parchment)',
        'parchment-light': 'var(--color-parchment-light)',
        'walnut': 'var(--color-walnut)',
        'ochre': 'var(--color-ochre)',
        'clay': 'var(--color-clay)',
        'moss': 'var(--color-moss)',
        'sage': 'var(--color-sage)',
        'lichen': 'var(--color-lichen)',
        'iron': 'var(--color-iron)',
        'surface': 'var(--color-surface)',
        'background': 'var(--color-background)',
      },
      fontFamily: {
        // Map to your existing fonts
        'serif': ['ET Book Roman', 'serif'],
        'human': ['Alegreya', 'serif'],
        'heading': ['Cormorant Garamond', 'serif'],
        'mono': ['Fira Code', 'monospace'],
      },
      spacing: {
        // Map to your existing spacing tokens
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
      },
      screens: {
        // Your existing breakpoints
        'sm': '40rem',
        'md': '56rem', 
        'lg': '72rem',
        'xl': '90rem',
      },
      maxWidth: {
        // Reading measures
        'prose': 'var(--content-width-serious, 65ch)',
        'prose-wide': 'var(--content-width-wide, 75ch)',
        'prose-personal': 'var(--content-width-personal, 60ch)',
      },
    }
  },
  plugins: []
};