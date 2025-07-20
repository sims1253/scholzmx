#!/usr/bin/env node

/**
 * Lighthouse CI Integration for Performance Regression Testing
 * Requirements: 2.1, 2.5
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { PerformanceMetrics } from './types';

export interface LighthouseResult {
  url: string;
  timestamp: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    totalBlockingTime: number;
    speedIndex: number;
  };
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    estimatedSavings: number;
  }>;
}

export interface LighthouseConfig {
  ci: {
    collect: {
      url: string[];
      numberOfRuns: number;
      settings: {
        chromeFlags: string[];
      };
    };
    assert: {
      assertions: {
        [key: string]: any;
      };
    };
    upload: {
      target: string;
      serverBaseUrl?: string;
    };
  };
}

export class LighthouseAuditor {
  private config: LighthouseConfig;
  private results: LighthouseResult[] = [];

  constructor() {
    this.config = {
      ci: {
        collect: {
          url: [
            'http://localhost:3000',
            'http://localhost:3000/blog.html',
            'http://localhost:3000/research.html',
            'http://localhost:3000/projects/'
          ],
          numberOfRuns: 3,
          settings: {
            chromeFlags: ['--no-sandbox', '--disable-setuid-sandbox']
          }
        },
        assert: {
          assertions: {
            'categories:performance': ['error', { minScore: 0.8 }],
            'categories:accessibility': ['error', { minScore: 0.9 }],
            'categories:best-practices': ['error', { minScore: 0.8 }],
            'categories:seo': ['error', { minScore: 0.8 }],
            'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
            'total-blocking-time': ['error', { maxNumericValue: 300 }]
          }
        },
        upload: {
          target: 'temporary-public-storage'
        }
      }
    };
  }

  async generateConfig(useProduction: boolean = false): Promise<void> {
    if (useProduction) {
      this.config.ci.collect.url = this.config.ci.collect.url.map(url =>
        url.replace('http://localhost:3000', 'https://scholzmx.com')
      );
    }

    const configPath = path.join('performance', 'lighthouserc.json');
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
    console.log(`✅ Lighthouse CI config generated at ${configPath}`);
  }

  async updatePerformanceLog(results: LighthouseResult[]): Promise<void> {
    const logPath = 'blog/performance-tracking.qmd';
    
    try {
      // Read existing blog post
      let content = await fs.readFile(logPath, 'utf-8');
      
      // Add new data points to the R data frame
      const today = new Date().toISOString().split('T')[0];
      const newDataRows = results.map(result => {
        const pageName = this.getPageName(result.url);
        const loadTime = Math.round(result.metrics.largestContentfulPaint); // Use LCP as load time proxy
        return `  as.Date("${today}"), "${pageName}", ${loadTime}, 1000`;
      }).join(',\n');
      
      // Find and update the data frame
      const dataFrameRegex = /(perf_data <- data\.frame\(\s*[\s\S]*?)\)/;
      const match = content.match(dataFrameRegex);
      
      if (match) {
        // Add new rows to existing data
        const existingData = match[1];
        const updatedData = existingData.replace(/\)$/, `,\n${newDataRows}\n)`);
        content = content.replace(dataFrameRegex, updatedData);
        
        await fs.writeFile(logPath, content);
        console.log(`✅ Performance tracking blog updated at ${logPath}`);
      }
    } catch (error) {
      console.error('Failed to update performance tracking blog:', error);
    }
  }

  private getPageName(url: string): string {
    if (url.includes('/blog')) return 'Blog';
    if (url.includes('/research')) return 'Research';
    if (url.includes('/projects')) return 'Projects';
    return 'Homepage';
  }

  async generateGitHubAction(): Promise<void> {
    const workflowContent = `name: Performance Regression Testing

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: |
          npm install -g @lhci/cli
          npm install
          
      - name: Setup Quarto
        uses: quarto-dev/quarto-actions/setup@v2
        
      - name: Build site
        run: quarto render
        
      - name: Serve site
        run: |
          npx http-server docs -p 3000 &
          sleep 5
          
      - name: Run Lighthouse CI
        run: lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: \${{ secrets.LHCI_GITHUB_APP_TOKEN }}
          
      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-results
          path: .lighthouseci/
          
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = require('path');
            
            try {
              const resultsPath = '.lighthouseci/lhr-*.json';
              const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
              
              const comment = \`## 🚦 Lighthouse Performance Results
              
              | Metric | Score | Target |
              |--------|-------|--------|
              | Performance | \${Math.round(results.categories.performance.score * 100)} | ≥80 |
              | Accessibility | \${Math.round(results.categories.accessibility.score * 100)} | ≥90 |
              | Best Practices | \${Math.round(results.categories['best-practices'].score * 100)} | ≥80 |
              | SEO | \${Math.round(results.categories.seo.score * 100)} | ≥80 |
              
              ### Core Web Vitals
              - **FCP**: \${Math.round(results.audits['first-contentful-paint'].numericValue)}ms (target: ≤1800ms)
              - **LCP**: \${Math.round(results.audits['largest-contentful-paint'].numericValue)}ms (target: ≤2500ms)
              - **CLS**: \${results.audits['cumulative-layout-shift'].numericValue.toFixed(3)} (target: ≤0.1)
              \`;
              
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: comment
              });
            } catch (error) {
              console.log('Could not post results comment:', error);
            }
`;

    const workflowPath = path.join('.github', 'workflows', 'performance.yml');
    await fs.mkdir(path.dirname(workflowPath), { recursive: true });
    await fs.writeFile(workflowPath, workflowContent);
    console.log(`✅ GitHub Actions workflow created at ${workflowPath}`);
  }

  async setupLocalTesting(): Promise<void> {
    const testScript = `#!/bin/bash

# Local Performance Testing Script
# Requirements: 2.1, 2.5

echo "🚀 Starting local performance testing..."

# Check if Quarto is available
if ! command -v quarto &> /dev/null; then
    echo "❌ Quarto is not installed. Please install Quarto first."
    exit 1
fi

# Check if LHCI is available
if ! command -v lhci &> /dev/null; then
    echo "📦 Installing Lighthouse CI..."
    npm install -g @lhci/cli
fi

# Build the site
echo "🔨 Building site with Quarto..."
quarto render

# Start local server
echo "🌐 Starting local server..."
npx http-server docs -p 3000 &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Run Lighthouse CI
echo "🔍 Running Lighthouse audit..."
lhci autorun

# Stop server
kill $SERVER_PID

echo "✅ Local performance testing complete!"
echo "📊 Results saved in .lighthouseci/ directory"
`;

    const scriptPath = path.join('performance', 'test-local.sh');
    await fs.writeFile(scriptPath, testScript);
    
    // Make script executable (on Unix systems)
    try {
      await fs.chmod(scriptPath, '755');
    } catch {
      // Windows doesn't support chmod, ignore
    }
    
    console.log(`✅ Local testing script created at ${scriptPath}`);
  }

  async createPerformanceBudget(): Promise<void> {
    const budget = {
      budget: [
        {
          resourceType: 'total',
          budget: 500 // 500KB total
        },
        {
          resourceType: 'image',
          budget: 200 // 200KB for images
        },
        {
          resourceType: 'script',
          budget: 100 // 100KB for JavaScript
        },
        {
          resourceType: 'stylesheet',
          budget: 50 // 50KB for CSS
        },
        {
          resourceType: 'font',
          budget: 100 // 100KB for fonts
        }
      ],
      timing: [
        {
          metric: 'first-contentful-paint',
          budget: 1800 // 1.8 seconds
        },
        {
          metric: 'largest-contentful-paint',
          budget: 2500 // 2.5 seconds
        },
        {
          metric: 'cumulative-layout-shift',
          budget: 0.1 // 0.1 CLS score
        }
      ]
    };

    const budgetPath = path.join('performance', 'budget.json');
    await fs.writeFile(budgetPath, JSON.stringify(budget, null, 2));
    console.log(`✅ Performance budget created at ${budgetPath}`);
  }
}

async function main(): Promise<void> {
  const auditor = new LighthouseAuditor();
  
  console.log('🚀 Setting up Lighthouse CI for performance regression testing...\n');
  
  const useProduction = process.argv.includes('--production');
  
  // Generate Lighthouse CI configuration
  await auditor.generateConfig(useProduction);
  
  // Create GitHub Actions workflow
  await auditor.generateGitHubAction();
  
  // Setup local testing script
  await auditor.setupLocalTesting();
  
  // Create performance budget
  await auditor.createPerformanceBudget();
  
  console.log('\n✨ Lighthouse CI setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Run "npm run lighthouse" for local testing');
  console.log('2. Commit the generated files to enable CI/CD');
  console.log('3. Configure LHCI_GITHUB_APP_TOKEN secret for PR comments');
}

if (require.main === module) {
  main().catch(console.error);
}

export default LighthouseAuditor;