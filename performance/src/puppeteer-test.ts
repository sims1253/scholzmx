#!/usr/bin/env node

/**
 * Puppeteer-based Local Performance Testing
 * Requirements: 2.1, 2.5
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { promises as fs } from 'fs';
import * as path from 'path';

interface PuppeteerPerformanceResult {
  url: string;
  timestamp: string;
  metrics: {
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    totalBlockingTime: number;
    speedIndex: number;
  };
  scores: {
    performance: number;
    accessibility: number;
  };
  recommendations: string[];
}

export class PuppeteerPerformanceTester {
  private browser: Browser | null = null;
  private results: PuppeteerPerformanceResult[] = [];

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async testPage(url: string): Promise<PuppeteerPerformanceResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page: Page = await this.browser.newPage();
    
    // Enable performance monitoring
    await page.setCacheEnabled(false);
    
    console.log(`Testing ${url}...`);
    
    const startTime = Date.now();
    
    try {
      // Navigate to page and wait for network idle
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          loadTime: navigation.loadEventEnd - navigation.fetchStart,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
        };
      });

      // Get Core Web Vitals using PerformanceObserver
      const webVitals = await page.evaluate(() => {
        return new Promise<{
          lcp: number;
          cls: number;
          fid: number | null;
        }>((resolve) => {
          const vitals = { 
            lcp: 0, 
            cls: 0, 
            fid: null as number | null 
          };
          
          let observersCompleted = 0;
          const totalObservers = 2;
          
          const checkComplete = () => {
            observersCompleted++;
            if (observersCompleted >= totalObservers) {
              resolve(vitals);
            }
          };
          
          // LCP Observer
          if ('PerformanceObserver' in window) {
            try {
              new PerformanceObserver((list) => {
                const entries = list.getEntries();
                if (entries.length > 0) {
                  vitals.lcp = entries[entries.length - 1].startTime;
                }
                checkComplete();
              }).observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
              checkComplete();
            }
            
            // CLS Observer
            try {
              let clsValue = 0;
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  const layoutShiftEntry = entry as any;
                  if (!layoutShiftEntry.hadRecentInput) {
                    clsValue += layoutShiftEntry.value;
                  }
                }
                vitals.cls = clsValue;
                checkComplete();
              }).observe({ entryTypes: ['layout-shift'] });
            } catch (e) {
              checkComplete();
            }
          } else {
            // Fallback if PerformanceObserver is not available
            setTimeout(() => resolve(vitals), 1000);
          }
          
          // Timeout fallback
          setTimeout(() => resolve(vitals), 3000);
        });
      });

      // Calculate performance score (simplified)
      const performanceScore = this.calculatePerformanceScore({
        loadTime: metrics.totalLoadTime,
        fcp: metrics.firstContentfulPaint,
        lcp: webVitals.lcp,
        cls: webVitals.cls
      });

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        loadTime: metrics.totalLoadTime,
        fcp: metrics.firstContentfulPaint,
        lcp: webVitals.lcp,
        cls: webVitals.cls
      });

      const result: PuppeteerPerformanceResult = {
        url,
        timestamp: new Date().toISOString(),
        metrics: {
          loadTime: Math.round(metrics.totalLoadTime),
          firstContentfulPaint: Math.round(metrics.firstContentfulPaint),
          largestContentfulPaint: Math.round(webVitals.lcp),
          cumulativeLayoutShift: Math.round(webVitals.cls * 1000) / 1000,
          totalBlockingTime: 0, // Would need more complex measurement
          speedIndex: 0 // Would need more complex measurement
        },
        scores: {
          performance: performanceScore,
          accessibility: 85 // Placeholder - would need actual accessibility testing
        },
        recommendations
      };

      this.results.push(result);
      await page.close();
      
      console.log(`✅ ${url} tested - Performance Score: ${performanceScore}`);
      return result;
      
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  private calculatePerformanceScore(metrics: {
    loadTime: number;
    fcp: number;
    lcp: number;
    cls: number;
  }): number {
    let score = 100;
    
    // Penalize slow load times
    if (metrics.loadTime > 3000) score -= 30;
    else if (metrics.loadTime > 2000) score -= 15;
    
    // Penalize slow FCP
    if (metrics.fcp > 1800) score -= 20;
    else if (metrics.fcp > 1200) score -= 10;
    
    // Penalize slow LCP
    if (metrics.lcp > 2500) score -= 25;
    else if (metrics.lcp > 1800) score -= 12;
    
    // Penalize high CLS
    if (metrics.cls > 0.25) score -= 15;
    else if (metrics.cls > 0.1) score -= 8;
    
    return Math.max(0, Math.round(score));
  }

  private generateRecommendations(metrics: {
    loadTime: number;
    fcp: number;
    lcp: number;
    cls: number;
  }): string[] {
    const recommendations: string[] = [];
    
    if (metrics.loadTime > 3000) {
      recommendations.push('Reduce overall page load time - currently exceeds 3 second target');
    }
    
    if (metrics.fcp > 1800) {
      recommendations.push('Optimize First Contentful Paint - consider inlining critical CSS');
    }
    
    if (metrics.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint - check image optimization and server response times');
    }
    
    if (metrics.cls > 0.1) {
      recommendations.push('Reduce Cumulative Layout Shift - ensure images have dimensions and avoid dynamic content insertion');
    }
    
    return recommendations;
  }

  async testMultiplePages(urls: string[]): Promise<PuppeteerPerformanceResult[]> {
    const results: PuppeteerPerformanceResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.testPage(url);
        results.push(result);
      } catch (error) {
        console.error(`Failed to test ${url}:`, error);
      }
    }
    
    return results;
  }

  async saveResults(filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `puppeteer-performance-${timestamp}.json`;
    const filepath = path.join('performance', 'reports', filename || defaultFilename);
    
    // Ensure reports directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      tool: 'puppeteer',
      results: this.results,
      summary: this.generateSummary()
    };
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`📊 Results saved to ${filepath}`);
    
    return filepath;
  }

  private generateSummary() {
    if (this.results.length === 0) {
      return { error: 'No results to summarize' };
    }
    
    const avgLoadTime = this.results.reduce((sum, r) => sum + r.metrics.loadTime, 0) / this.results.length;
    const avgPerformanceScore = this.results.reduce((sum, r) => sum + r.scores.performance, 0) / this.results.length;
    
    return {
      totalPages: this.results.length,
      averageLoadTime: Math.round(avgLoadTime),
      averagePerformanceScore: Math.round(avgPerformanceScore),
      meetsTarget: avgLoadTime < 3000,
      recommendations: this.getTopRecommendations()
    };
  }

  private getTopRecommendations(): string[] {
    const allRecommendations = this.results.flatMap(r => r.recommendations);
    const recommendationCounts = allRecommendations.reduce((acc, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(recommendationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([rec]) => rec);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('PUPPETEER PERFORMANCE TEST RESULTS');
    console.log('='.repeat(60));
    
    if (this.results.length === 0) {
      console.log('❌ No results to display');
      return;
    }
    
    const summary = this.generateSummary();
    
    console.log(`📊 Pages Tested: ${summary.totalPages}`);
    console.log(`⏱️  Average Load Time: ${summary.averageLoadTime}ms`);
    console.log(`🎯 Performance Score: ${summary.averagePerformanceScore}/100`);
    console.log(`${summary.meetsTarget ? '✅' : '❌'} Meets 3s Target: ${summary.meetsTarget}`);
    
    console.log('\n📋 INDIVIDUAL RESULTS:');
    this.results.forEach(result => {
      console.log(`\n🔗 ${result.url}`);
      console.log(`   Load Time: ${result.metrics.loadTime}ms`);
      console.log(`   FCP: ${result.metrics.firstContentfulPaint}ms`);
      console.log(`   LCP: ${result.metrics.largestContentfulPaint}ms`);
      console.log(`   CLS: ${result.metrics.cumulativeLayoutShift}`);
      console.log(`   Performance Score: ${result.scores.performance}/100`);
    });
    
    if (summary.recommendations && summary.recommendations.length > 0) {
      console.log('\n🔧 TOP RECOMMENDATIONS:');
      summary.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
  }
}

async function main(): Promise<void> {
  const tester = new PuppeteerPerformanceTester();
  
  console.log('🚀 Starting Puppeteer Performance Testing...\n');
  
  // Define pages to test
  const pages = [
    'http://localhost:3000',
    'http://localhost:3000/blog.html',
    'http://localhost:3000/research.html',
    'http://localhost:3000/projects/'
  ];
  
  // Check if we should use production URLs
  const useProduction = process.argv.includes('--production');
  if (useProduction) {
    pages.forEach((page, i) => {
      pages[i] = page.replace('http://localhost:3000', 'https://scholzmx.com');
    });
    console.log('🌐 Using production URLs for testing\n');
  } else {
    console.log('🏠 Using local development server (use --production for live site)\n');
  }
  
  try {
    await tester.initialize();
    await tester.testMultiplePages(pages);
    await tester.saveResults();
    tester.printResults();
  } catch (error) {
    console.error('❌ Testing failed:', error);
  } finally {
    await tester.close();
  }
  
  console.log('\n✨ Puppeteer performance testing complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

export default PuppeteerPerformanceTester;