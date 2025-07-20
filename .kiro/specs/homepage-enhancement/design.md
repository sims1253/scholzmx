# Design Document

## Overview

This design document outlines the technical approach for enhancing the existing Quarto-based personal website (scholzmx.com) to add the missing "quote of the day" functionality, optimize performance, evaluate modern CSS frameworks, and ensure production readiness while maintaining the established medieval manuscript aesthetic.

The enhancement builds upon the existing sunlit theme integration, manuscript-inspired styling, and cozy aesthetic established in the current implementation.

## Architecture

### System Architecture

The website follows a static site generation architecture using Quarto with the following key components:

- **Static Site Generator**: Quarto with custom SCSS theming
- **Content Management**: Quarto Markdown (.qmd) files with YAML frontmatter and embedded code capabilities
- **Styling**: Custom SCSS theme with CSS custom properties for theming
- **Interactivity**: TypeScript compiled to JavaScript for progressive enhancement
- **Deployment**: GitHub Pages with automated CI/CD

### Quote of the Day System Architecture

The quote system will be implemented as a client-side feature with the following components:

1. **Quote Data Store**: JSON file containing curated quotes
2. **Quote Selection Logic**: JavaScript module for deterministic daily selection
3. **Quote Display Component**: CSS-styled container with manuscript aesthetic
4. **Persistence Layer**: LocalStorage for caching daily selections

### Performance Optimization Architecture

Performance improvements will focus on:

1. **Asset Optimization**: Image compression and format optimization
2. **CSS Optimization**: Critical CSS inlining and non-critical CSS lazy loading
3. **JavaScript Optimization**: Module bundling and lazy loading
4. **Caching Strategy**: Browser caching headers and service worker implementation

## Components and Interfaces

### Quote of the Day Component

#### Quarto Integration Approach
The quote system will integrate with Quarto's ecosystem by:
- Using Quarto's built-in data loading capabilities for quote collections
- Leveraging Quarto's YAML frontmatter for configuration
- Utilizing Quarto's include system for modular components
- Taking advantage of Quarto's built-in JavaScript bundling

#### Data Structure
```typescript
interface Quote {
  id: string;
  text: string;
  author: string;
  source?: string;
  category?: string;
  tags?: string[];
}

interface QuoteCollection {
  quotes: Quote[];
  lastUpdated: string;
  version: string;
}
```

#### Quote Selection Algorithm
```typescript
interface QuoteSelector {
  getDailyQuote(date: Date): Quote;
  getRandomQuote(): Quote;
  getCachedQuote(): Quote | null;
  setCachedQuote(quote: Quote, date: Date): void;
}
```

The selection algorithm will use a deterministic approach based on the current date to ensure consistency across visits on the same day.

#### Display Component
```html
<div class="quote-of-the-day manuscript-quote">
  <div class="quote-content">
    <blockquote class="daily-quote-text">
      <!-- Quote text -->
    </blockquote>
    <cite class="daily-quote-attribution">
      <!-- Author and source -->
    </cite>
  </div>
  <div class="quote-ornament">
    <!-- Decorative manuscript-style element -->
  </div>
</div>
```

### Art Slideshow Enhancement Component

#### Data Structure
```typescript
interface Artwork {
  id: string;
  filename: string;
  title: string;
  description?: string;
  artandfunUrl: string;
  localPath: string;
  dimensions: {
    width: number;
    height: number;
  };
}

interface ArtCollection {
  artworks: Artwork[];
  attribution: {
    artist: string;
    website: string;
    contact?: string;
  };
}
```

#### Slideshow Controller
```typescript
interface ArtSlideshow {
  currentIndex: number;
  artworks: Artwork[];
  rotationInterval: number;
  
  nextArtwork(): void;
  previousArtwork(): void;
  goToArtwork(index: number): void;
  startAutoRotation(): void;
  stopAutoRotation(): void;
}
```

### Performance Monitoring Component

#### Performance Regression Testing System
The performance monitoring system will use Lighthouse CI for consistent, reliable measurements:

```yaml
# .github/workflows/performance.yml
name: Performance Regression Testing
on: [push, pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Build site
        run: quarto render
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
```

#### Performance Metrics Interface
```typescript
interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timestamp: string;
  version: string;
}

interface PerformanceMonitor {
  measurePageLoad(): PerformanceMetrics;
  reportMetrics(metrics: PerformanceMetrics): void;
  identifyBottlenecks(): string[];
  updatePerformanceLog(metrics: PerformanceMetrics): void;
}
```

#### Performance Tracking Blog Post
A dedicated `performance-log.qmd` file will automatically update with performance metrics:

```markdown
---
title: "Performance Log"
format: html
---

## Performance History

| Date       | Load Time | FCP  | LCP  | CLS  | Notes    |
| ---------- | --------- | ---- | ---- | ---- | -------- |
| 2025-07-20 | 2.1s      | 1.2s | 1.8s | 0.05 | Baseline |
| ...        | ...       | ...  | ...  | ...  | ...      |

## Recent Changes
- Added quote of the day: +0.1s load time
- Optimized SVGs: -0.3s load time
```

### CSS Framework Evaluation Interface

#### Framework Assessment Structure
```typescript
interface FrameworkAssessment {
  framework: 'tailwind' | 'shadcn' | 'none';
  bundleSize: {
    before: number;
    after: number;
    impact: number;
  };
  maintainability: {
    score: number;
    pros: string[];
    cons: string[];
  };
  aestheticCompatibility: {
    score: number;
    preservedStyles: string[];
    conflictingStyles: string[];
  };
  recommendation: 'adopt' | 'reject' | 'partial';
  reasoning: string;
}
```

## Data Models

### Quote Data Model

The quote collection will be stored in `assets/data/quotes.json`:

```json
{
  "quotes": [
    {
      "id": "quote-001",
      "text": "The best time to plant a tree was 20 years ago. The second best time is now.",
      "author": "Chinese Proverb",
      "category": "wisdom",
      "tags": ["time", "action", "growth"]
    }
  ],
  "lastUpdated": "2025-07-20T00:00:00Z",
  "version": "1.0.0"
}
```

### Artwork Data Model

The artwork collection will be stored in `assets/data/artworks.json`:

```json
{
  "artworks": [
    {
      "id": "artwork-001",
      "filename": "painting-001.jpg",
      "title": "Forest Path",
      "description": "A serene woodland scene",
      "artandfunUrl": "https://artandfun.net/artwork/forest-path",
      "localPath": "img/artworks/painting-001.jpg",
      "dimensions": {
        "width": 800,
        "height": 600
      }
    }
  ],
  "attribution": {
    "artist": "Artist Name",
    "website": "https://artandfun.net",
    "contact": "contact@artandfun.net"
  }
}
```

### Performance Configuration Model

Performance settings will be stored in `assets/config/performance.json`:

```json
{
  "optimization": {
    "images": {
      "formats": ["webp", "avif", "jpg"],
      "quality": 85,
      "maxWidth": 1200
    },
    "css": {
      "minify": true,
      "criticalInline": true,
      "nonCriticalDefer": true
    },
    "javascript": {
      "minify": true,
      "bundle": true,
      "lazyLoad": true
    }
  },
  "monitoring": {
    "enabled": true,
    "reportingEndpoint": null,
    "thresholds": {
      "loadTime": 3000,
      "fcp": 1800,
      "lcp": 2500
    }
  }
}
```

## Error Handling

### Quote System Error Handling

1. **Data Loading Errors**:
   - Fallback to cached quotes if JSON fails to load
   - Display default inspirational message if no quotes available
   - Log errors for debugging without breaking page functionality

2. **Selection Algorithm Errors**:
   - Fallback to random selection if deterministic algorithm fails
   - Graceful degradation to static quote if all selection methods fail

3. **Display Errors**:
   - Hide quote container if rendering fails
   - Maintain page layout integrity
   - Provide accessible fallback content

### Art Slideshow Error Handling

1. **Image Loading Errors**:
   - Skip to next image if current image fails to load
   - Display placeholder with attribution if all images fail
   - Maintain slideshow functionality with available images

2. **Attribution Link Errors**:
   - Ensure attribution text remains visible even if links fail
   - Provide fallback contact information
   - Log broken links for maintenance

### Performance Monitoring Error Handling

1. **Metrics Collection Errors**:
   - Continue normal operation if monitoring fails
   - Store partial metrics when possible
   - Avoid impacting user experience with monitoring overhead

2. **Optimization Errors**:
   - Fallback to unoptimized assets if optimization fails
   - Maintain functionality over performance when necessary
   - Provide clear error messages for debugging

## Testing Strategy

### Unit Testing

1. **TypeScript/JavaScript Testing**:
   - Use Jest or Vitest for TypeScript unit testing
   - Test quote selection algorithm with deterministic inputs
   - Mock browser APIs (localStorage, Date) for consistent testing
   - Test error handling and edge cases

2. **Quote System Tests**:
   - Test deterministic selection algorithm
   - Verify quote data validation using TypeScript interfaces
   - Test caching mechanisms with mocked localStorage
   - Validate error handling scenarios

3. **Art Slideshow Tests**:
   - Test rotation logic with TypeScript type safety
   - Verify image loading and fallbacks
   - Test attribution link functionality
   - Validate responsive behavior

4. **Performance Tests**:
   - Test metrics collection accuracy
   - Verify optimization functions
   - Test error handling in monitoring

### Integration Testing

1. **Component Integration**:
   - Test quote display within page layout
   - Verify art slideshow integration with existing elements
   - Test theme compatibility across components

2. **Performance Integration**:
   - Test optimized assets in production environment
   - Verify caching behavior
   - Test loading performance across different connection speeds

### Visual Regression Testing

1. **Aesthetic Consistency**:
   - Compare rendered components against design specifications
   - Test manuscript aesthetic preservation
   - Verify responsive design integrity

2. **Cross-Browser Testing**:
   - Test functionality across modern browsers
   - Verify CSS custom property support
   - Test JavaScript compatibility

### Accessibility Testing

1. **Screen Reader Compatibility**:
   - Test quote content accessibility
   - Verify art slideshow controls are accessible
   - Test keyboard navigation

2. **Color Contrast**:
   - Verify text readability in light and dark modes
   - Test quote styling meets WCAG guidelines
   - Validate interactive element contrast ratios

### Performance Testing

1. **Load Time Testing**:
   - Measure page load times across different scenarios
   - Test with and without optimizations
   - Verify performance budget compliance

2. **Resource Usage Testing**:
   - Monitor memory usage during slideshow operation
   - Test CPU usage during animations
   - Verify network resource efficiency

### User Acceptance Testing

1. **Functionality Testing**:
   - Verify quote changes daily as expected
   - Test art slideshow user interactions
   - Confirm mobile responsiveness

2. **Aesthetic Testing**:
   - Validate manuscript theme consistency
   - Test visual hierarchy and readability
   - Confirm cozy, warm aesthetic preservation

## Implementation Considerations

### Quarto-Specific Considerations

1. **Content Structure**:
   - Use `.qmd` files for all content pages to leverage Quarto's full capabilities
   - Utilize Quarto's YAML frontmatter for page metadata and configuration
   - Take advantage of Quarto's cross-referencing and citation features

2. **Asset Management**:
   - Use Quarto's built-in asset handling for images and data files
   - Leverage Quarto's `resources` field in YAML for additional assets
   - Utilize Quarto's project-level configuration for global settings

3. **TypeScript Integration**:
   - Set up TypeScript compilation as part of the Quarto build process
   - Use Quarto's `include-after-body` for TypeScript-compiled scripts
   - Leverage Quarto's development server for hot reloading during development

4. **Component Architecture**:
   - Create reusable Quarto partials for common components
   - Use Quarto's shortcode system for interactive elements
   - Leverage Quarto's templating system for consistent layouts

### CSS Framework Evaluation Criteria

1. **Bundle Size Impact**:
   - Measure before/after bundle sizes
   - Evaluate tree-shaking effectiveness
   - Consider impact on page load times

2. **Aesthetic Compatibility**:
   - Assess compatibility with existing manuscript theme
   - Evaluate customization flexibility
   - Test integration with sunlit theme system

3. **Maintainability Benefits**:
   - Compare development velocity improvements
   - Evaluate code organization benefits
   - Assess long-term maintenance implications

### Performance Optimization Priorities

1. **Critical Path Optimization**:
   - Inline critical CSS for above-the-fold content
   - Defer non-critical JavaScript
   - Optimize font loading strategy

2. **Asset Optimization**:
   - Implement responsive image loading
   - Use modern image formats (WebP, AVIF)
   - Optimize SVG assets

3. **Caching Strategy**:
   - Implement appropriate cache headers
   - Consider service worker for offline functionality
   - Optimize browser caching for static assets

### Mobile Responsiveness Considerations

1. **Quote Display**:
   - Ensure readable typography on small screens
   - Maintain manuscript aesthetic on mobile
   - Optimize touch interactions

2. **Art Slideshow**:
   - Hide or adapt slideshow for mobile viewports
   - Ensure attribution remains accessible
   - Optimize image sizes for mobile

3. **Performance on Mobile**:
   - Prioritize mobile performance metrics
   - Consider reduced motion preferences
   - Optimize for slower mobile connections

### Accessibility Considerations

1. **Semantic HTML**:
   - Use appropriate semantic elements for quotes
   - Ensure proper heading hierarchy
   - Provide alternative text for decorative elements

2. **Keyboard Navigation**:
   - Ensure all interactive elements are keyboard accessible
   - Provide focus indicators
   - Support screen reader navigation

3. **Color and Contrast**:
   - Maintain sufficient color contrast ratios
   - Support high contrast mode
   - Ensure information isn't conveyed by color alone

## Development Workflow

### Performance Testing Tools
1. **Lighthouse CI**: Automated performance testing in GitHub Actions for consistent measurements
2. **Puppeteer**: Local development performance testing and profiling
3. **Performance Budget**: Fail builds if performance regresses beyond defined thresholds
4. **Performance Blog**: Automated tracking of performance metrics over time in `performance-log.qmd`
5. **Asset Optimization**: vecta.io/nano for SVG compression, font subsetting, image optimization

### TypeScript Setup
1. **Configuration**: Set up `tsconfig.json` for TypeScript compilation
2. **Build Process**: Integrate TypeScript compilation with Quarto's build process
3. **Development**: Use TypeScript for all interactive components
4. **Type Safety**: Leverage TypeScript interfaces for data validation and IDE support

### Quarto Best Practices
1. **File Structure**: Use `.qmd` files for all content pages
2. **Data Integration**: Use Quarto's data loading for quotes and artwork collections
3. **Partials**: Create reusable `.qmd` partials for common components
4. **Configuration**: Leverage `_quarto.yml` for project-wide settings

### Development Environment
1. **Local Development**: Use `quarto preview` for live development server
2. **Type Checking**: Run TypeScript compiler in watch mode during development
3. **Testing**: Set up Jest/Vitest for TypeScript testing
4. **Linting**: Use ESLint with TypeScript rules for code quality

This design provides a comprehensive technical foundation for implementing the homepage enhancements while preserving the established aesthetic and ensuring robust, performant functionality using modern web development practices with Quarto.