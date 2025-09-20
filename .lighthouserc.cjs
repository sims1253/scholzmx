module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3, // Run Lighthouse 3 times and take median for more reliable results
      startServerCommand: 'bun run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance thresholds
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }], // 1.8s max
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // 2.5s max
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // 0.1 max
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms max
        'speed-index': ['error', { maxNumericValue: 3000 }], // 3s max

        // Category scores (0-1 scale)
        'categories:performance': ['error', { minScore: 0.9 }], // 90% min performance
        'categories:accessibility': ['error', { minScore: 0.95 }], // 95% min accessibility
        'categories:best-practices': ['error', { minScore: 0.9 }], // 90% min best practices
        'categories:seo': ['error', { minScore: 0.9 }], // 90% min SEO

        // Accessibility specific
        'color-contrast': 'error',
        'image-alt': 'error',
        label: 'error',
        'valid-lang': 'error',

        // Best practices
        'uses-https': 'error',
        'is-on-https': 'error',
        'uses-http2': 'off', // Not always applicable for static sites

        // SEO
        'meta-description': 'error',
        'document-title': 'error',
        viewport: 'error',

        // Performance
        'unused-css-rules': 'off', // Can be noisy with utility CSS
        'unused-javascript': 'warn',
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',
        'uses-text-compression': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage', // Free temporary storage for 7 days
    },
  },
};
