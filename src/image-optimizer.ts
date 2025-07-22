#!/usr/bin/env node

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ImageConfig {
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

interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
}

interface OptimizedResult {
  format: string;
  path: string;
  width: number;
  height: number;
  size: number;
}

interface ImageProcessingResult {
  originalPath: string;
  outputDir: string;
  results: OptimizedResult[];
  lazy: boolean;
}

class ImageOptimizer {
  private config: ImageConfig = {
    quality: {
      jpeg: 85,
      webp: 85,
      avif: 80
    },
    sizes: [
      { width: 400, suffix: '-sm' },
      { width: 800, suffix: '-md' },
      { width: 1200, suffix: '-lg' }
    ],
    formats: ['webp', 'avif']
  };

  private lazyLoadPatterns = [
    /art-showcase/,
    /project.*banner/,
    /screenshot/i,
    /banner/i
  ];

  private criticalPatterns = [
    /flip.*card.*front/,
    /hero/,
    /above.*fold/
  ];

  private flipCardBackPatterns = [
    /flip.*card.*back/,
    /flip.*back/
  ];

  async discoverImages(): Promise<string[]> {
    const patterns = [
      'img/**/*.{jpg,jpeg,png,gif}',
      'projects/**/*.{jpg,jpeg,png,gif}',
      '*.{jpg,jpeg,png,gif}',
      'assets/**/*.{jpg,jpeg,png,gif}'
    ];

    const allImages: string[] = [];

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          ignore: ['**/optimized/**', '**/node_modules/**', '**/docs/**', '**/_freeze/**']
        });
        allImages.push(...matches);
      } catch (error) {
        console.warn(`Warning: Could not search pattern ${pattern}:`, error);
      }
    }

    // Remove duplicates and filter out already optimized images
    const uniqueImages = [...new Set(allImages)].filter(img =>
      !img.includes('/optimized/') &&
      !img.includes('\\optimized\\')
    );

    return uniqueImages;
  }

  private shouldLazyLoad(imagePath: string): boolean {
    const pathLower = imagePath.toLowerCase();

    // Check if it matches critical patterns (should NOT be lazy loaded)
    if (this.criticalPatterns.some(pattern => pattern.test(pathLower))) {
      return false;
    }

    // Check if it's a flip card back (should be lazy loaded)
    if (this.flipCardBackPatterns.some(pattern => pattern.test(pathLower))) {
      return true;
    }

    // Check if it matches other lazy load patterns
    return this.lazyLoadPatterns.some(pattern => pattern.test(pathLower));
  }

  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }

  private async getImageInfo(inputPath: string): Promise<ImageInfo | null> {
    try {
      const metadata = await sharp(inputPath).metadata();
      const stats = await fs.stat(inputPath);

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: stats.size
      };
    } catch (error) {
      console.error(`❌ Error reading ${inputPath}:`, error);
      return null;
    }
  }

  private getOutputDirectory(inputPath: string): string {
    const dir = path.dirname(inputPath);
    return path.join(dir, 'optimized');
  }

  private shouldGenerateResponsiveSizes(imagePath: string, originalInfo: ImageInfo): boolean {
    // Don't generate responsive sizes for very small images
    if (originalInfo.width < 600) {
      return false;
    }

    // Don't generate responsive sizes for icons or decorative elements
    const pathLower = imagePath.toLowerCase();
    if (pathLower.includes('icon') || pathLower.includes('logo') || pathLower.includes('decoration')) {
      return false;
    }

    return true;
  }

  async optimizeImage(inputPath: string): Promise<ImageProcessingResult | null> {
    console.log(`\n🖼️  Checking: ${inputPath}`);

    const originalInfo = await this.getImageInfo(inputPath);
    if (!originalInfo) return null;

    // Check if optimization is needed
    const checkOutputDir = this.getOutputDirectory(inputPath);
    const checkBaseName = path.parse(inputPath).name;

    // Check if optimized files exist and are newer than original
    const originalStat = await fs.stat(inputPath);
    const webpPath = path.join(checkOutputDir, `${checkBaseName}.webp`);

    try {
      const webpStat = await fs.stat(webpPath);
      if (webpStat.mtime > originalStat.mtime) {
        console.log(`   ⏭️  Skipping: Already optimized and up-to-date`);
        return null; // Skip optimization
      }
    } catch {
      // Optimized files don't exist, proceed with optimization
    }

    console.log(`   🔄 Optimizing: ${originalInfo.width}x${originalInfo.height}, ${Math.round(originalInfo.size / 1024)}KB, ${originalInfo.format}`);

    console.log(`   Original: ${originalInfo.width}x${originalInfo.height}, ${Math.round(originalInfo.size / 1024)}KB, ${originalInfo.format}`);

    const outputDir = this.getOutputDirectory(inputPath);
    await this.ensureDirectory(outputDir);

    const baseName = path.parse(inputPath).name;
    const results: OptimizedResult[] = [];
    const lazy = this.shouldLazyLoad(inputPath);
    const responsive = this.shouldGenerateResponsiveSizes(inputPath, originalInfo);

    // Determine sizes to generate
    const sizesToGenerate = responsive
      ? this.config.sizes.filter(size => size.width <= originalInfo.width)
      : [{ width: originalInfo.width, suffix: '' }];

    for (const size of sizesToGenerate) {
      const sizeWidth = Math.min(size.width, originalInfo.width);

      // Generate WebP
      const webpPath = path.join(outputDir, `${baseName}${size.suffix}.webp`);
      await sharp(inputPath)
        .resize(sizeWidth, null, { withoutEnlargement: true })
        .webp({ quality: this.config.quality.webp })
        .toFile(webpPath);

      const webpInfo = await this.getImageInfo(webpPath);
      if (webpInfo) {
        results.push({ ...webpInfo, format: 'webp', path: webpPath });
      }

      // Generate AVIF
      const avifPath = path.join(outputDir, `${baseName}${size.suffix}.avif`);
      await sharp(inputPath)
        .resize(sizeWidth, null, { withoutEnlargement: true })
        .avif({ quality: this.config.quality.avif })
        .toFile(avifPath);

      const avifInfo = await this.getImageInfo(avifPath);
      if (avifInfo) {
        results.push({ ...avifInfo, format: 'avif', path: avifPath });
      }

      // Generate optimized fallback
      const originalFormat = originalInfo.format;
      const fallbackPath = path.join(outputDir, `${baseName}${size.suffix}.${originalFormat}`);

      let sharpInstance = sharp(inputPath).resize(sizeWidth, null, { withoutEnlargement: true });

      if (originalFormat === 'jpeg' || originalFormat === 'jpg') {
        sharpInstance = sharpInstance.jpeg({ quality: this.config.quality.jpeg });
      } else if (originalFormat === 'png') {
        sharpInstance = sharpInstance.png({ compressionLevel: 9 });
      }

      await sharpInstance.toFile(fallbackPath);
      const fallbackInfo = await this.getImageInfo(fallbackPath);
      if (fallbackInfo) {
        results.push({ ...fallbackInfo, format: originalFormat, path: fallbackPath });
      }
    }

    // Log results
    console.log('   Generated:');
    results.forEach(result => {
      const savings = Math.round((1 - result.size / originalInfo.size) * 100);
      const relativePath = path.relative(process.cwd(), result.path);
      console.log(`     ${relativePath}: ${result.width}x${result.height}, ${Math.round(result.size / 1024)}KB (${savings}% smaller)`);
    });

    return {
      originalPath: inputPath,
      outputDir,
      results,
      lazy
    };
  }

  async optimizeAll(): Promise<ImageProcessingResult[]> {
    console.log('🚀 Starting automated image optimization...\n');

    const images = await this.discoverImages();

    if (images.length === 0) {
      console.log('ℹ️  No images found to optimize.');
      return [];
    }

    console.log(`📸 Found ${images.length} images to optimize:`);
    images.forEach(img => console.log(`   - ${img}`));

    const results: ImageProcessingResult[] = [];

    for (const imagePath of images) {
      try {
        const result = await this.optimizeImage(imagePath);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`❌ Failed to optimize ${imagePath}:`, error);
      }
    }

    console.log('\n✅ Image optimization complete!');
    console.log(`📊 Processed ${results.length} images`);

    return results;
  }

  generatePictureElement(result: ImageProcessingResult, size: string = 'default'): string {
    const baseName = path.parse(result.originalPath).name;
    const suffix = size === 'default' ? '' : `-${size}`;

    // Group results by format for this size
    const formats: Record<string, OptimizedResult> = {};
    result.results.forEach(res => {
      const match = res.path.match(new RegExp(`${baseName}${suffix}\\.(webp|avif|jpg|jpeg|png)$`));
      if (match) {
        formats[match[1]] = res;
      }
    });

    let html = '<picture>\n';

    // Add AVIF source
    if (formats.avif) {
      const relativePath = path.relative(process.cwd(), formats.avif.path).replace(/\\/g, '/');
      html += `  <source srcset="${relativePath}" type="image/avif">\n`;
    }

    // Add WebP source
    if (formats.webp) {
      const relativePath = path.relative(process.cwd(), formats.webp.path).replace(/\\/g, '/');
      html += `  <source srcset="${relativePath}" type="image/webp">\n`;
    }

    // Add fallback img
    const fallback = formats.jpg || formats.jpeg || formats.png;
    if (fallback) {
      const relativePath = path.relative(process.cwd(), fallback.path).replace(/\\/g, '/');
      const lazyAttr = result.lazy ? ' loading="lazy"' : '';
      html += `  <img src="${relativePath}" alt="[Alt text needed]"${lazyAttr}>\n`;
    }

    html += '</picture>';

    return html;
  }
}

export { ImageOptimizer };

// CLI usage
if (require.main === module) {
  const optimizer = new ImageOptimizer();
  optimizer.optimizeAll().catch(console.error);
}