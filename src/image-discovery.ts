import * as fs from 'fs/promises';
import * as path from 'path';
import { ImageAsset } from './types';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'docs', 'dist', 'optimized'];

/**
 * Recursively discover all image files in the project
 */
export async function discoverImages(rootDir: string = '.'): Promise<ImageAsset[]> {
  const images: ImageAsset[] = [];
  
  async function scanDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (EXCLUDE_DIRS.some(excluded => entry.name.includes(excluded))) {
            continue;
          }
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (IMAGE_EXTENSIONS.includes(ext)) {
            images.push(await analyzeImageUsage(fullPath));
          }
        }
      }
    } catch (error) {
      console.warn(`Could not scan directory ${dir}:`, error);
    }
  }
  
  await scanDirectory(rootDir);
  return images;
}

/**
 * Analyze how an image is used to determine optimization settings
 */
async function analyzeImageUsage(imagePath: string): Promise<ImageAsset> {
  const relativePath = path.relative('.', imagePath);
  const dir = path.dirname(relativePath);
  const outputDir = path.join(dir, 'optimized');
  
  // Determine if image should be responsive based on usage patterns
  const isLikelyHeroImage = relativePath.includes('banner') || 
                           relativePath.includes('hero') ||
                           relativePath.includes('header');
  
  const isLikelyThumbnail = relativePath.includes('thumb') ||
                           relativePath.includes('small') ||
                           relativePath.includes('icon');
  
  // Check if image is referenced in critical content
  const isCritical = await isImageCritical(relativePath);
  
  return {
    inputPath: relativePath,
    outputDir,
    responsive: !isLikelyThumbnail,
    lazy: !isCritical,
    priority: isLikelyHeroImage ? 'high' : isLikelyThumbnail ? 'low' : 'medium'
  };
}

/**
 * Check if an image is used in critical above-the-fold content
 */
async function isImageCritical(imagePath: string): Promise<boolean> {
  const criticalFiles = ['index.qmd', '_art-showcase.qmd'];
  const fileName = path.basename(imagePath);
  
  for (const file of criticalFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes(fileName) || content.includes(imagePath)) {
        return true;
      }
    } catch {
      // File doesn't exist or can't be read
    }
  }
  
  return false;
}

/**
 * Get images that need optimization (source images that don't have optimized versions)
 */
export async function getImagesToOptimize(): Promise<ImageAsset[]> {
  const allImages = await discoverImages();
  const imagesToOptimize: ImageAsset[] = [];
  
  for (const image of allImages) {
    // Skip if already in an optimized directory
    if (image.inputPath.includes('optimized')) {
      continue;
    }
    
    // Check if optimized versions exist and are newer
    const needsOptimization = await checkIfOptimizationNeeded(image);
    if (needsOptimization) {
      imagesToOptimize.push(image);
    }
  }
  
  return imagesToOptimize;
}

/**
 * Check if an image needs optimization based on file timestamps
 */
async function checkIfOptimizationNeeded(image: ImageAsset): Promise<boolean> {
  try {
    const sourceStat = await fs.stat(image.inputPath);
    const baseName = path.parse(image.inputPath).name;
    
    // Check if any optimized version exists and is newer
    const optimizedDir = image.outputDir;
    try {
      const optimizedFiles = await fs.readdir(optimizedDir);
      const relevantFiles = optimizedFiles.filter(file => file.startsWith(baseName));
      
      if (relevantFiles.length === 0) {
        return true; // No optimized versions exist
      }
      
      // Check if source is newer than optimized versions
      for (const file of relevantFiles) {
        const optimizedStat = await fs.stat(path.join(optimizedDir, file));
        if (sourceStat.mtime > optimizedStat.mtime) {
          return true; // Source is newer
        }
      }
      
      return false; // Optimized versions are up to date
    } catch {
      return true; // Optimized directory doesn't exist
    }
  } catch {
    return false; // Source file doesn't exist
  }
}