// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Enable automatic image optimization
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  
  // Optimize performance
  build: {
    // Inline all CSS for better performance
    inlineStylesheets: 'always',
  },
  
  // Reduce bundle size and improve loading
  vite: {
    server: {
      host: true,
    },
    build: {
      // Enable CSS code splitting
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Optimize chunk size
          manualChunks: undefined,
        }
      }
    }
  }
});
