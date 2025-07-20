#!/usr/bin/env node

/**
 * Performance Baseline Audit Script
 * Measures current page load times and identifies bottlenecks
 * Requirements: 2.1, 2.5
 */

import puppeteer, { Browser, Page, HTTPResponse } from 'puppeteer';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  PerformanceAuditResult,
  PageAuditResult,
  AssetAuditResult,
  NetworkResource,
  PerformanceSummary,
  AuditOptions
} from './types';

export class PerformanceAuditor {
  private results: PerformanceAuditResult;

  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      pages: [],
      assets: {
        images: [],
        fonts: [],
        svgs: [],
        css: [],
        js: []
      },
      summary: {} as PerformanceSummary
    };
  }

  async auditPage(url: string, pageName: string): Promise<PageAuditResult> {
    console.log(`Auditing ${pageName} at ${url}...`);
    
    const browser: Browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page: Page = await browser.newPage();
    
    // Enable performance monitoring
    await page.setCacheEnabled(false);
    
    const metrics: Partial<PageAuditResult> = {};
    const resources: NetworkResource[] = [];
    
    // Monitor network requests
    page.on('response', (response: HTTPResponse) => {
      const url = response.url();
      const size = parseInt(response.headers()['content-length'] || '0');
      const type = response.headers()['content-type'] || '';
      
      resources.push({
        url,
        size,
        type,
        status: response.status()
      });
    });

    // Start performance measurement
    const startTime = Date.now();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Get performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
        };
      });

      // Get Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise<{ lcp: number | null; fid: number | null; cls: number }>((resolve) => {
          const vitals = { lcp: null as number | null, fid: null as number | null, cls: 0 };
          
          // LCP (Largest Contentful Paint)
          if ('PerformanceObserver' in window) {
            try {
              new PerformanceObserver((list) => {
                const entries = list.getEntries();
                if (entries.length > 0) {
                  vitals.lcp = entries[entries.length - 1].startTime;
                }
              }).observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
              console.warn('LCP measurement failed:', e);
            }
            
            // CLS (Cumulative Layout Shift)
            let clsValue = 0;
            try {
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  const layoutShiftEntry = entry as any;
                  if (!layoutShiftEntry.hadRecentInput) {
                    clsValue += layoutShiftEntry.value;
                  }
                }
                vitals.cls = clsValue;
              }).observe({ entryTypes: ['layout-shift'] });
            } catch (e) {
              console.warn('CLS measurement failed:', e);
            }
          }
          
          // FID (First Input Delay) - can't measure without user interaction
          vitals.fid = null;
          
          setTimeout(() => resolve(vitals), 2000);
        });
      });

      const endTime = Date.now();
      
      const result: PageAuditResult = {
        pageName,
        url,
        totalTime: endTime - startTime,
        performance: performanceMetrics,
        webVitals,
        resources,
        resourceCount: resources.length,
        totalResourceSize: resources.reduce((sum, r) => sum + r.size, 0)
      };
      
      this.results.pages.push(result);
      
      console.log(`✓ ${pageName} audited in ${result.totalTime}ms`);
      
      await browser.close();
      return result;
      
    } catch (error) {
      console.error(`✗ Failed to audit ${pageName}:`, (error as Error).message);
      const errorResult: PageAuditResult = {
        pageName,
        url,
        totalTime: 0,
        performance: {
          domContentLoaded: 0,
          loadComplete: 0,
          firstPaint: 0,
          firstContentfulPaint: 0,
          domInteractive: 0,
          totalLoadTime: 0
        },
        webVitals: { lcp: null, fid: null, cls: 0 },
        resources: [],
        resourceCount: 0,
        totalResourceSize: 0,
        error: (error as Error).message
      };
      
      this.results.pages.push(errorResult);
      await browser.close();
      return errorResult;
    }
  }

  async auditAssets(): Promise<void> {
    console.log('Auditing static assets...');
    
    const assetDirs = [
      { dir: 'img', type: 'images' as keyof typeof this.results.assets },
      { dir: 'docs/site_libs', type: 'js' as keyof typeof this.results.assets, pattern: /\.js$/ },
      { dir: '.', type: 'css' as keyof typeof this.results.assets, pattern: /\.(css|scss)$/ }
    ];

    for (const { dir, type, pattern } of assetDirs) {
      try {
        const files = await this.getFilesRecursively(dir, pattern);
        
        for (const file of files) {
          const stats = await fs.stat(file);
          const asset: AssetAuditResult = {
            path: file,
            size: stats.size,
            type: this.getAssetType(file),
            lastModified: stats.mtime,
            recommendations: this.getOptimizationRecommendations({
              path: file,
              size: stats.size,
              type: this.getAssetType(file),
              lastModified: stats.mtime,
              recommendations: []
            })
          };
          
          this.results.assets[type].push(asset);
        }
      } catch (error) {
        console.warn(`Could not audit ${dir}:`, (error as Error).message);
      }
    }
  }

  private async getFilesRecursively(dir: string, pattern?: RegExp): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath, pattern);
          files.push(...subFiles);
        } else if (!pattern || pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  private getAssetType(filePath: string): AssetAuditResult['type'] {
    const ext = path.extname(filePath).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
    const fontExts = ['.woff', '.woff2', '.ttf', '.otf'];
    
    if (imageExts.includes(ext)) return 'image';
    if (fontExts.includes(ext)) return 'font';
    if (ext === '.css' || ext === '.scss') return 'css';
    if (ext === '.js') return 'javascript';
    return 'other';
  }

  private getOptimizationRecommendations(asset: AssetAuditResult): string[] {
    const recommendations: string[] = [];
    const sizeMB = asset.size / (1024 * 1024);
    
    if (asset.type === 'image') {
      if (sizeMB > 1) {
        recommendations.push('Consider compressing - file is over 1MB');
      }
      if (asset.path.includes('.png') && sizeMB > 0.5) {
        recommendations.push('Consider converting PNG to WebP for better compression');
      }
      if (asset.path.includes('.jpg') && sizeMB > 0.3) {
        recommendations.push('Consider optimizing JPEG quality settings');
      }
      if (asset.path.includes('.svg')) {
        recommendations.push('Consider optimizing SVG with vecta.io/nano or similar tools');
      }
    }
    
    if (asset.type === 'css' && sizeMB > 0.1) {
      recommendations.push('Consider minifying CSS');
    }
    
    if (asset.type === 'javascript' && sizeMB > 0.2) {
      recommendations.push('Consider minifying and bundling JavaScript');
    }
    
    if (asset.type === 'font') {
      recommendations.push('Consider font subsetting to reduce file size');
      recommendations.push('Implement font-display: swap for better perceived performance');
    }
    
    return recommendations;
  }

  generateSummary(): void {
    const pages = this.results.pages.filter(p => !p.error);
    
    if (pages.length === 0) {
      this.results.summary = { 
        averageLoadTime: 0,
        averageResourceCount: 0,
        averageResourceSize: 0,
        totalAssets: 0,
        totalAssetSize: 0,
        performanceTarget: 3000,
        meetsTarget: false,
        recommendations: ['No pages successfully audited'],
        error: 'No pages successfully audited' 
      };
      return;
    }

    const avgLoadTime = pages.reduce((sum, p) => sum + p.totalTime, 0) / pages.length;
    const avgResourceCount = pages.reduce((sum, p) => sum + p.resourceCount, 0) / pages.length;
    const avgResourceSize = pages.reduce((sum, p) => sum + p.totalResourceSize, 0) / pages.length;
    
    const totalAssets = Object.values(this.results.assets).flat();
    const totalAssetSize = totalAssets.reduce((sum, a) => sum + a.size, 0);
    
    this.results.summary = {
      averageLoadTime: Math.round(avgLoadTime),
      averageResourceCount: Math.round(avgResourceCount),
      averageResourceSize: Math.round(avgResourceSize / 1024), // KB
      totalAssets: totalAssets.length,
      totalAssetSize: Math.round(totalAssetSize / (1024 * 1024) * 100) / 100, // MB
      performanceTarget: 3000, // 3 seconds as per requirements
      meetsTarget: avgLoadTime < 3000,
      recommendations: this.generateRecommendations()
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const pages = this.results.pages.filter(p => !p.error);
    
    if (pages.length === 0) return ['No pages could be audited'];
    
    const avgLoadTime = pages.reduce((sum, p) => sum + p.totalTime, 0) / pages.length;
    
    if (avgLoadTime > 3000) {
      recommendations.push('Page load time exceeds 3-second target');
    }
    
    // Check for large assets
    const largeImages = this.results.assets.images.filter(img => img.size > 500000); // 500KB
    if (largeImages.length > 0) {
      recommendations.push(`${largeImages.length} images over 500KB should be optimized`);
    }
    
    // Check for unoptimized formats
    const pngImages = this.results.assets.images.filter(img => img.path.includes('.png'));
    if (pngImages.length > 0) {
      recommendations.push(`Consider converting ${pngImages.length} PNG images to WebP`);
    }
    
    // Check SVG optimization
    const svgImages = this.results.assets.images.filter(img => img.path.includes('.svg'));
    if (svgImages.length > 0) {
      recommendations.push(`Optimize ${svgImages.length} SVG files using vecta.io/nano`);
    }
    
    // Check CSS size
    const largeCss = this.results.assets.css.filter(css => css.size > 100000); // 100KB
    if (largeCss.length > 0) {
      recommendations.push(`${largeCss.length} CSS files over 100KB should be minified`);
    }
    
    // Font optimization
    if (this.results.assets.fonts && this.results.assets.fonts.length > 0) {
      recommendations.push('Consider font subsetting and implementing font-display: swap');
    }
    
    return recommendations;
  }

  async saveResults(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-baseline-${timestamp}.json`;
    const filepath = path.join('performance', 'reports', filename);
    
    // Ensure reports directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    
    // Also save as latest
    await fs.writeFile(
      path.join('performance', 'reports', 'latest-baseline.json'),
      JSON.stringify(this.results, null, 2)
    );
    
    console.log(`\n📊 Results saved to ${filepath}`);
    return filepath;
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('PERFORMANCE BASELINE AUDIT SUMMARY');
    console.log('='.repeat(60));
    
    if (this.results.summary.error) {
      console.log('❌ Error:', this.results.summary.error);
      return;
    }
    
    const { summary } = this.results;
    
    console.log(`📈 Average Load Time: ${summary.averageLoadTime}ms`);
    console.log(`🎯 Target: ${summary.performanceTarget}ms`);
    console.log(`${summary.meetsTarget ? '✅' : '❌'} Meets Performance Target: ${summary.meetsTarget}`);
    console.log(`📦 Total Assets: ${summary.totalAssets} (${summary.totalAssetSize}MB)`);
    console.log(`🔗 Average Resources per Page: ${summary.averageResourceCount}`);
    
    if (summary.recommendations.length > 0) {
      console.log('\n🔧 RECOMMENDATIONS:');
      summary.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    console.log('\n📋 PAGES AUDITED:');
    this.results.pages.forEach(page => {
      const status = page.error ? '❌' : '✅';
      const time = page.error ? 'Failed' : `${page.totalTime}ms`;
      console.log(`   ${status} ${page.pageName}: ${time}`);
    });
  }
}

async function main(): Promise<void> {
  const auditor = new PerformanceAuditor();
  
  console.log('🚀 Starting Performance Baseline Audit...\n');
  
  // Define pages to audit (assuming local development server)
  const pages = [
    { url: 'http://localhost:3000', name: 'Homepage' },
    { url: 'http://localhost:3000/blog.html', name: 'Blog' },
    { url: 'http://localhost:3000/research.html', name: 'Research' },
    { url: 'http://localhost:3000/projects/', name: 'Projects' }
  ];
  
  // Check if we should use production URLs instead
  const useProduction = process.argv.includes('--production');
  if (useProduction) {
    pages.forEach(page => {
      page.url = page.url.replace('http://localhost:3000', 'https://scholzmx.com');
    });
    console.log('🌐 Using production URLs for audit\n');
  } else {
    console.log('🏠 Using local development server (use --production for live site)\n');
  }
  
  // Audit each page
  for (const page of pages) {
    await auditor.auditPage(page.url, page.name);
  }
  
  // Audit static assets
  await auditor.auditAssets();
  
  // Generate summary and save results
  auditor.generateSummary();
  await auditor.saveResults();
  auditor.printSummary();
  
  console.log('\n✨ Baseline audit complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

export default PerformanceAuditor;