export interface ImageConfig {
  quality: {
    jpeg: number;
    webp: number;
    avif: number;
  };
  sizes: Array<{
    width: number;
    suffix: string;
  }>;
  formats: string[];
}

export interface ImageAsset {
  inputPath: string;
  outputDir: string;
  responsive: boolean;
  lazy: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface OptimizedImage {
  format: string;
  path: string;
  width: number;
  height: number;
  size: number;
}

export interface ImageOptimizationResult {
  original: {
    path: string;
    size: number;
    width: number;
    height: number;
    format: string;
  };
  optimized: OptimizedImage[];
  savings: number;
}