// Lighthouse 12 stopped checking budgets itself, so each budget in .lighthouse-budget.json
// becomes assertions here. As in Lighthouse, a URL gets the last budget whose path matches
// it, so "/*" holds for every page that no later path claims.
const budgets = require('./.lighthouse-budget.json');

const pathPattern = (path) =>
  `https?://[^/]+${path
    .split('*')
    .map((part) => part.replace(/[.?+^$|()[\]{}\\]/g, '\\$&'))
    .join('.*')}$`;

const budgetMatrix = budgets.map(
  ({ path, timings = [], resourceSizes = [], resourceCounts = [] }, index) => ({
    matchingUrlPattern: `^${budgets
      .slice(index + 1)
      .map((later) => `(?!${pathPattern(later.path)})`)
      .join('')}${pathPattern(path)}`,
    assertions: Object.fromEntries([
      ...timings.map(({ metric, budget }) => [metric, ['error', { maxNumericValue: budget }]]),
      ...resourceSizes.map(({ resourceType, budget }) => [
        `resource-summary:${resourceType}:size`,
        ['error', { maxNumericValue: budget * 1024 }],
      ]),
      ...resourceCounts.map(({ resourceType, budget }) => [
        `resource-summary:${resourceType}:count`,
        ['error', { maxNumericValue: budget }],
      ]),
    ]),
  })
);

// Paint and load timings live in the budgets; these hold for every page.
const assertions = {
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // 0.1 max
  'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms max

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
  'uses-text-compression': 'error',

  // Previews are noindex, so the crawlability audit cannot pass there.
  ...(process.env.LHCI_PREVIEW && { 'is-crawlable': 'off', 'categories:seo': 'off' }),
};

module.exports = {
  ci: {
    collect: {
      settings: {
        // Ubuntu 24.04 runners block Chrome's sandbox (as .pa11yci.json already allows for).
        chromeFlags: '--no-sandbox',
      },
      numberOfRuns: 3, // Run Lighthouse 3 times and take median for more reliable results
    },
    assert: {
      assertMatrix: [
        { matchingUrlPattern: '.*', preset: 'lighthouse:recommended', assertions },
        ...budgetMatrix,
      ],
    },
    upload: {
      target: 'temporary-public-storage', // Free temporary storage for 7 days
    },
  },
};
