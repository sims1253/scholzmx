// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import lightningcss from 'vite-plugin-lightningcss';
import purgecss from 'astro-purgecss';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.scholzmx.com',
  integrations: [
    sitemap(),
    // PurgeCSS should be last to process all other integrations' CSS
    purgecss({
      content: [
        './src/**/*.{astro,js,jsx,ts,tsx,vue,svelte}',
        './public/**/*.html',
      ],
      // Keep critical animations and dynamic classes
      safelist: [
        // Keep all CSS custom properties (variables)
        /^--/,
        // Keep classes that might be added dynamically by JavaScript
        'active', 'focus', 'hover', 'disabled',
        // Keep torch toggle states
        'torch-toggle', 'copied',
        // Keep manuscript and page elements
        /^manuscript/, /^page/, /^longform/, /^personal-content/, /^serious-content/,
        // Keep navigation states
        /^nav-/, /^site-/,
        // Keep botanical and artistic elements
        /^botanical/, /^border/, /^vine/, /^portrait/,
        // Keep math/code elements
        'astro-code', 'copy-button',
      ],
      // Keep keyframes for animations (set to false if using View Transitions)
      keyframes: true,
      // Keep font-face declarations
      fontFace: true,
    }),
  ],
  // Enable automatic image optimization
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        // ~268 megapixels cap (same default as Sharp). Prevents pathological inputs.
        limitInputPixels: 268402689,
      },
    },
    domains: [],
    remotePatterns: [],
  },

  // Use Astro's native markdown processing with math support and Gruvbox themes
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: {
        light: 'solarized-light',
        dark: 'gruvbox-dark-hard',
      },
      wrap: true,
    },
  },

  // Optimize performance
  build: {
    // Keep CSS files separate - large inline CSS causes render delay
    inlineStylesheets: 'never',
  },

  // Reduce bundle size and improve loading
  vite: {
    plugins: [
      lightningcss({
        minify: true,
        targets: {
          // Support modern browsers for better performance
          chrome: 100,
          firefox: 100,
          safari: 15,
          edge: 100,
        },
      }),
    ],
    server: {
      host: true,
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
    build: {
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Optimize build performance
      minify: 'esbuild',
      rollupOptions: {
        output: {
          // Optimize chunk size and reduce main thread blocking
          manualChunks: {
            // Separate vendor chunks for better caching
          },
          assetFileNames: (assetInfo) => {
            const name = assetInfo && assetInfo.name ? assetInfo.name : '';
            const info = name.split('.');
            const ext = info[info.length - 1] || '';
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `img/[name]-[hash][extname]`;
            }
            if (/css/i.test(ext)) {
              return `css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
    },
  },
});
