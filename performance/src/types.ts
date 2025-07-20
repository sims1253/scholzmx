/**
 * TypeScript interfaces for performance monitoring and auditing
 * Based on design document specifications
 */

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

export interface PerformanceMonitor {
  measurePageLoad(): PerformanceMetrics;
  reportMetrics(metrics: PerformanceMetrics): void;
  identifyBottlenecks(): string[];
}

export interface AssetOptimizationRecommendation {
  path: string;
  currentSize: number;
  estimatedSavings: number;
  recommendations: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface AssetAuditResult {
  path: string;
  size: number;
  type: 'image' | 'font' | 'css' | 'javascript' | 'other';
  lastModified: Date;
  recommendations: string[];
}

export interface PageAuditResult {
  pageName: string;
  url: string;
  totalTime: number;
  performance: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
    domInteractive: number;
    totalLoadTime: number;
  };
  webVitals: {
    lcp: number | null;
    fid: number | null;
    cls: number;
  };
  resources: NetworkResource[];
  resourceCount: number;
  totalResourceSize: number;
  error?: string;
}

export interface NetworkResource {
  url: string;
  size: number;
  type: string;
  status: number;
}

export interface PerformanceAuditResult {
  timestamp: string;
  pages: PageAuditResult[];
  assets: {
    images: AssetAuditResult[];
    fonts: AssetAuditResult[];
    svgs: AssetAuditResult[];
    css: AssetAuditResult[];
    js: AssetAuditResult[];
  };
  summary: PerformanceSummary;
}

export interface PerformanceSummary {
  averageLoadTime: number;
  averageResourceCount: number;
  averageResourceSize: number;
  totalAssets: number;
  totalAssetSize: number;
  performanceTarget: number;
  meetsTarget: boolean;
  recommendations: string[];
  error?: string;
}

export interface PerformanceConfig {
  optimization: {
    images: {
      formats: string[];
      quality: number;
      maxWidth: number;
    };
    css: {
      minify: boolean;
      criticalInline: boolean;
      nonCriticalDefer: boolean;
    };
    javascript: {
      minify: boolean;
      bundle: boolean;
      lazyLoad: boolean;
    };
  };
  monitoring: {
    enabled: boolean;
    reportingEndpoint: string | null;
    thresholds: {
      loadTime: number;
      fcp: number;
      lcp: number;
    };
  };
}

export interface AuditOptions {
  useProduction: boolean;
  baseUrl: string;
  pages: Array<{ url: string; name: string }>;
  timeout: number;
  cacheEnabled: boolean;
}