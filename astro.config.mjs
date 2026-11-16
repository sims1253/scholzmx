// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { lightCodeTheme, darkCodeTheme } from './src/lib/shiki-themes.mjs';
import { unified } from '@astrojs/markdown-remark';
import pagefind from 'astro-pagefind';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.scholzmx.com',
  // Preserve the existing spaces between inline elements across the Astro 7 upgrade.
  compressHTML: true,
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
  integrations: [sitemap(), pagefind()],
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
    processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }),
    shikiConfig: {
      // Kanagawa Lotus and Dragon, with any token below 4.5:1 deepened (src/lib/shiki-themes.mjs)
      themes: {
        light: lightCodeTheme,
        dark: darkCodeTheme,
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
    css: {
      transformer: 'lightningcss',
      lightningcss: {
        targets: { chrome: 100 << 16, firefox: 100 << 16, safari: 15 << 16, edge: 100 << 16 },
      },
    },
    build: {
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Optimize build performance
      cssMinify: 'lightningcss',
      rolldownOptions: {
        output: {
          // Optimize chunk size and reduce main thread blocking
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
