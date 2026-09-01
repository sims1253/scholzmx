// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import purgecss from 'astro-purgecss';
import pagefind from 'astro-pagefind';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.scholzmx.com',
  devToolbar: { enabled: false },
  redirects: {
    // Preserve legacy blog post URLs from live site
    '/post/building-bayesim-intro/': '/blog/2023/04-26-building-bayesim/',
    '/post/how-to-make-your-simulation-study-reproducible/':
      '/blog/2022/11-03-how-to-make-your-simulation-study-reproducible/',
    '/post/kumaraswamy-custom-brms-family/': '/blog/2022/03-14-kumaraswamy-custom-brms-family/',
    '/post/simulating-dags/': '/blog/2022/01-26-simulating-dags/',
    '/post/gsoc-2017-postmorten-part-2-org-application/': '/blog/2017/gsoc_postmortem_2/',
    '/post/gsoc-2017-postmorten-part-1-overview/': '/blog/2017/gsoc_postmortem_1/',
    '/post/april-community-team-update/': '/blog/2017/april-community-update/',
    '/post/coalas-call-for-chefs/': '/blog/2017/coala-call-for-chefs/',
    '/post/the-birth-of-a-coala/': '/blog/2017/birth-of-coala/',
    // Redirect old blog listing page to new one
    '/post/': '/blog/',
  },
  integrations: [
    sitemap(),
    pagefind(),
    // PurgeCSS with conservative minimal safelist
    purgecss({
      // Include markdown/quarto so typography/dropcaps classes referenced in content are detected
      content: [
        './src/**/*.{astro,js,jsx,ts,tsx,vue,svelte,md,mdx}',
        './src/content/**/*.{md,mdx,qmd}',
        './public/**/*.html',
      ],
      safelist: [
        // Keep all CSS custom properties (variables)
        /^--/,
        // Keep classes added dynamically by JavaScript
        'active',
        'focus',
        'hover',
        'disabled',
        'torch-toggle',
        'copied',
        'visible',
        // Layout and content classes
        /^prose/,
        /^layout-/,
        /^personal-content/,
        /^serious-content/,
        // Navigation
        /^nav-/,
        /^site-/,
        // Decorative elements
        /^botanical/,
        /^border/,
        /^vine/,
        /^sc-/,
        // Code and math
        'astro-code',
        'copy-button',
        // Dropcap variants (dynamically generated)
        /^dropcap/,
        // ImageFrame dynamic classes
        /^image-frame/,
        'primary-image',
        'alternate-image',
        'clickable',
        'show-alternate',
        /^fill-/,
        // Margin notes (injected via JS)
        'margin-note',
        'notes-container',
        'note-anchor',
        // Tailwind utilities used dynamically
        'tw-grid',
        /^tw-grid-cols/,
        /^tw-gap/,
        'tw-w-full',
        /^tw-max-w/,
        'tw-mx-auto',
        /^tw-px-/,
        // Responsive Tailwind
        /^md:tw-/,
        /^lg:tw-/,
        // StackedCard positions
        'topLeft',
        'topRight',
        'bottomLeft',
        'bottomRight',
        'center',
      ],
      keyframes: true,
      // Keep all @font-face declarations so production keeps heading/body/dropcap fonts
      fontFace: false,
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
    domains: ['sims1253.github.io'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sims1253.github.io',
      },
    ],
  },

  // Use Astro's native markdown processing with math support and Gruvbox themes
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: {
        light: 'kanagawa-lotus',
        dark: 'kanagawa-dragon',
      },
      wrap: false,
    },
  },

  // Optimize performance
  build: {
    // Keep CSS files separate - large inline CSS causes render delay
    inlineStylesheets: 'never',
  },

  // Reduce bundle size and improve loading
  vite: {
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
            const name =
              assetInfo && assetInfo.names && assetInfo.names[0] ? assetInfo.names[0] : '';
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
