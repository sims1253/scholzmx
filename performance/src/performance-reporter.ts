#!/usr/bin/env node

/**
 * Automated Performance Reporting System
 * Updates the performance tracking blog post with new data
 * Requirements: 2.1, 2.5
 */

import { promises as fs } from 'fs';
import * as path from 'path';

interface PerformanceDataPoint {
  date: string;
  page: string;
  loadTime: number;
  target: number;
  tool: 'lighthouse' | 'puppeteer' | 'baseline';
  version?: string;
}

interface PerformanceReport {
  timestamp: string;
  tool: string;
  results: Array<{
    url: string;
    metrics: {
      loadTime: number;
      firstContentfulPaint?: number;
      largestContentfulPaint?: number;
    };
  }>;
  summary?: {
    averageLoadTime: number;
    meetsTarget: boolean;
  };
}

export class PerformanceReporter {
  private blogPostPath = 'blog/performance-tracking.qmd';
  private reportsDir = 'performance/reports';

  async updatePerformanceLog(reportPath: string): Promise<void> {
    console.log(`📊 Updating performance log with data from ${reportPath}...`);
    
    try {
      // Read the performance report
      const reportData = await fs.readFile(reportPath, 'utf-8');
      const report: PerformanceReport = JSON.parse(reportData);
      
      // Extract data points
      const dataPoints = this.extractDataPoints(report);
      
      // Update the blog post
      await this.updateBlogPost(dataPoints);
      
      console.log('✅ Performance tracking blog post updated successfully');
      
    } catch (error) {
      console.error('❌ Failed to update performance log:', error);
      throw error;
    }
  }

  private extractDataPoints(report: PerformanceReport): PerformanceDataPoint[] {
    const date = new Date().toISOString().split('T')[0];
    const dataPoints: PerformanceDataPoint[] = [];
    
    for (const result of report.results) {
      const pageName = this.getPageName(result.url);
      const loadTime = result.metrics.loadTime || 0;
      
      dataPoints.push({
        date,
        page: pageName,
        loadTime: Math.round(loadTime),
        target: 3000, // 3 second target from requirements
        tool: report.tool as 'lighthouse' | 'puppeteer' | 'baseline'
      });
    }
    
    return dataPoints;
  }

  private getPageName(url: string): string {
    if (url.includes('/blog')) return 'Blog';
    if (url.includes('/research')) return 'Research';
    if (url.includes('/projects')) return 'Projects';
    return 'Homepage';
  }

  private async updateBlogPost(newDataPoints: PerformanceDataPoint[]): Promise<void> {
    try {
      // Read existing blog post
      let content = await fs.readFile(this.blogPostPath, 'utf-8');
      
      // Find the R data frame section
      const dataFrameRegex = /(perf_data <- data\.frame\(\s*[\s\S]*?)\)/;
      const match = content.match(dataFrameRegex);
      
      if (!match) {
        console.warn('Could not find data frame in blog post - creating new one');
        await this.createNewDataFrame(newDataPoints);
        return;
      }
      
      // Extract existing data and add new points
      const existingDataFrame = match[1];
      const newRows = newDataPoints.map(point => 
        `  as.Date("${point.date}"), "${point.page}", ${point.loadTime}, ${point.target}`
      ).join(',\n');
      
      // Update the data frame
      const updatedDataFrame = existingDataFrame.replace(/\)$/, `,\n${newRows}\n)`);
      content = content.replace(dataFrameRegex, updatedDataFrame);
      
      // Update the current status section
      content = await this.updateCurrentStatus(content, newDataPoints);
      
      // Write updated content
      await fs.writeFile(this.blogPostPath, content);
      
    } catch (error) {
      console.error('Failed to update blog post:', error);
      throw error;
    }
  }

  private async updateCurrentStatus(content: string, dataPoints: PerformanceDataPoint[]): Promise<string> {
    const today = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const avgLoadTime = Math.round(
      dataPoints.reduce((sum, point) => sum + point.loadTime, 0) / dataPoints.length
    );
    
    const gap = Math.max(0, avgLoadTime - 1000); // Gap from 1 second target
    
    // Create the status table
    const statusTable = dataPoints.map(point => {
      const overTarget = Math.max(0, point.loadTime - 1000);
      return `| ${point.page} | ${point.loadTime.toLocaleString()}ms | +${overTarget.toLocaleString()}ms |`;
    }).join('\n');
    
    // Update the current status section
    const statusRegex = /(\*\*Baseline Date\*\*:.*?\n)([\s\S]*?)(\*This page will be automatically updated)/;
    const statusMatch = content.match(statusRegex);
    
    if (statusMatch) {
      const newStatus = `**Baseline Date**: ${today}  
**Average Load Time**: ${avgLoadTime.toLocaleString()}ms  
**Target**: <1,000ms  
**Gap**: ${gap.toLocaleString()}ms reduction needed

| Page | Load Time | Over Target |
|------|-----------|-------------|
${statusTable}

`;
      
      content = content.replace(statusRegex, `$1${newStatus}$3`);
    }
    
    return content;
  }

  private async createNewDataFrame(dataPoints: PerformanceDataPoint[]): Promise<void> {
    const dataRows = dataPoints.map(point => 
      `  as.Date("${point.date}"), "${point.page}", ${point.loadTime}, ${point.target}`
    ).join(',\n');
    
    const newDataFrame = `# Performance data
perf_data <- data.frame(
  date = c(${dataRows.split(',').filter(row => row.includes('as.Date')).join(', ')}),
  page = c(${dataPoints.map(p => `"${p.page}"`).join(', ')}),
  load_time = c(${dataPoints.map(p => p.loadTime).join(', ')}),
  target = c(${dataPoints.map(p => p.target).join(', ')})
)`;
    
    console.log('Creating new data frame structure...');
    // This would require more complex blog post reconstruction
    // For now, just log what would be created
    console.log(newDataFrame);
  }

  async generatePerformanceReport(): Promise<void> {
    console.log('📈 Generating comprehensive performance report...');
    
    try {
      // Read all report files
      const reportFiles = await this.getReportFiles();
      const reports: PerformanceReport[] = [];
      
      for (const file of reportFiles) {
        try {
          const reportData = await fs.readFile(file, 'utf-8');
          reports.push(JSON.parse(reportData));
        } catch (error) {
          console.warn(`Could not read report file ${file}:`, error);
        }
      }
      
      // Generate summary report
      const summary = this.generateSummaryReport(reports);
      
      // Save summary report
      const summaryPath = path.join(this.reportsDir, 'performance-summary.json');
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
      
      console.log(`✅ Performance summary report saved to ${summaryPath}`);
      
    } catch (error) {
      console.error('❌ Failed to generate performance report:', error);
      throw error;
    }
  }

  private async getReportFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.reportsDir);
      return files
        .filter(file => file.endsWith('.json') && file !== 'performance-summary.json')
        .map(file => path.join(this.reportsDir, file))
        .sort(); // Sort by filename (which includes timestamp)
    } catch (error) {
      console.warn('Reports directory not found or empty');
      return [];
    }
  }

  private generateSummaryReport(reports: PerformanceReport[]) {
    if (reports.length === 0) {
      return {
        error: 'No reports found',
        timestamp: new Date().toISOString()
      };
    }
    
    const latestReport = reports[reports.length - 1];
    const firstReport = reports[0];
    
    // Calculate trends
    const latestAvg = latestReport.summary?.averageLoadTime || 0;
    const firstAvg = firstReport.summary?.averageLoadTime || 0;
    const improvement = firstAvg - latestAvg;
    const improvementPercent = firstAvg > 0 ? Math.round((improvement / firstAvg) * 100) : 0;
    
    return {
      timestamp: new Date().toISOString(),
      totalReports: reports.length,
      dateRange: {
        first: firstReport.timestamp,
        latest: latestReport.timestamp
      },
      currentPerformance: {
        averageLoadTime: latestAvg,
        meetsTarget: latestReport.summary?.meetsTarget || false,
        tool: latestReport.tool
      },
      trends: {
        improvement: improvement,
        improvementPercent: improvementPercent,
        direction: improvement > 0 ? 'improving' : improvement < 0 ? 'declining' : 'stable'
      },
      recommendations: this.generateRecommendations(latestReport)
    };
  }

  private generateRecommendations(report: PerformanceReport): string[] {
    const recommendations: string[] = [];
    const avgLoadTime = report.summary?.averageLoadTime || 0;
    
    if (avgLoadTime > 3000) {
      recommendations.push('Critical: Page load time exceeds 3-second requirement');
      recommendations.push('Priority: Implement image optimization and compression');
      recommendations.push('Priority: Optimize CSS delivery and minification');
    } else if (avgLoadTime > 2000) {
      recommendations.push('Moderate: Page load time could be improved');
      recommendations.push('Consider: Font optimization and preloading');
      recommendations.push('Consider: JavaScript bundling and minification');
    } else if (avgLoadTime > 1000) {
      recommendations.push('Good: Performance is acceptable but can be optimized');
      recommendations.push('Fine-tune: Asset caching and CDN implementation');
    } else {
      recommendations.push('Excellent: Performance meets all targets');
      recommendations.push('Maintain: Continue monitoring for regressions');
    }
    
    return recommendations;
  }
}

async function main(): Promise<void> {
  const reporter = new PerformanceReporter();
  
  // Check for report file argument
  const reportPath = process.argv[2];
  
  if (reportPath) {
    console.log(`📊 Updating performance log with specific report: ${reportPath}`);
    await reporter.updatePerformanceLog(reportPath);
  } else {
    console.log('📈 Generating comprehensive performance report...');
    await reporter.generatePerformanceReport();
  }
  
  console.log('✨ Performance reporting complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

export default PerformanceReporter;