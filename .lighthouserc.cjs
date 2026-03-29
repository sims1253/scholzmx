module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4321/',
        'http://localhost:4321/blog/',
        'http://localhost:4321/research/',
        'http://localhost:4321/projects/',
        'http://localhost:4321/notes/',
      ],
      numberOfRuns: 3, // Run Lighthouse 3 times and take median for more reliable results
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance thresholds
        // TODO
        // - largest-contentful-paint <= 2500
        // - categories:performance >= 0.90
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }], // 2.0s max
        'largest-contentful-paint': ['error', { maxNumericValue: 3100 }], // 3.1s max
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // 0.1 max
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms max
        'speed-index': ['error', { maxNumericValue: 3400 }], // 3.4s max

        // Category scores (0-1 scale)
        'categories:performance': ['error', { minScore: 0.85 }], // 85% min performance
        'categories:accessibility': ['error', { minScore: 0.95 }], // 95% min accessibility
        'categories:best-practices': ['error', { minScore: 0.9 }], // 90% min best practices
        'categories:seo': ['error', { minScore: 0.9 }], // 90% min SEO

        // Accessibility specific
        'color-contrast': 'error',
        'image-alt': 'error',
        label: 'error',
        'valid-lang': 'error',

        // Best practices
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
        'image-aspect-ratio': 'warn',
        'image-size-responsive': 'warn',
        'lcp-lazy-loaded': 'warn',
        'render-blocking-resources': 'off',
        'network-dependency-tree-insight': 'off',
        'render-blocking-insight': 'off',
        'lcp-discovery-insight': 'off',
        'image-delivery-insight': 'off',
        'cache-insight': 'off',
        'uses-text-compression': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage', // Free temporary storage for 7 days
    },
  },
};
