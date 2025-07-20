# Performance Regression Testing System

This directory contains a comprehensive performance regression testing system for the homepage enhancement project, implementing requirements 2.1 and 2.5.

## Overview

The performance testing system includes:

- **Lighthouse CI Integration**: Automated performance testing in GitHub Actions
- **Puppeteer Local Testing**: Development-time performance testing with Puppeteer
- **Performance Budgets**: Configurable thresholds and failure conditions
- **Automated Reporting**: Performance tracking blog post updates
- **Regression Detection**: Continuous monitoring for performance degradation

## Quick Start

### Local Development Testing

```bash
# Test with Puppeteer (recommended for development)
npm run test:local

# Test with production URLs
npm run puppeteer:production

# Run baseline audit
npm run audit

# Run Lighthouse audit
npm run lighthouse
```

### Windows Users

Use the batch script for local testing:
```cmd
performance\test-local.bat
```

## System Components

### 1. Baseline Auditing (`audit-baseline.ts`)
- Measures page load times using Puppeteer
- Audits static assets for optimization opportunities
- Generates comprehensive performance reports
- **Current Status**: ❌ All pages exceed 1s target (avg: 3.75s)

### 2. Lighthouse CI Integration (`lighthouse-audit.ts`)
- Automated performance regression testing
- GitHub Actions integration
- Performance budget enforcement
- PR comment integration with results

### 3. Performance Budget (`performance-budget.json`)
- **Aggressive Target**: <1000ms load time
- **Minimum Target**: <3000ms load time
- Resource size limits and Core Web Vitals thresholds

## Current Performance Status

| Page | Current | Target | Gap | Priority |
|------|---------|--------|-----|----------|
| Homepage | 4629ms | <1000ms | -3629ms | 🔴 Critical |
| Blog | 3415ms | <1000ms | -2415ms | 🔴 High |
| Research | 3464ms | <1000ms | -2464ms | 🔴 High |
| Projects | 3496ms | <1000ms | -2496ms | 🔴 High |

## Optimization Roadmap

### Phase 1: Asset Optimization (Target: -1000ms)
- SVG compression with vecta.io/nano
- Image conversion to WebP/AVIF formats
- Font loading optimization and subsetting

### Phase 2: Critical Path (Target: -800ms)
- Critical CSS inlining
- JavaScript optimization
- Lazy loading implementation

### Phase 3: Advanced (Target: -500ms)
- Service worker caching
- Resource bundling
- 