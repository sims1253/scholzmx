#!/usr/bin/env node

import chokidar from 'chokidar';
import { ImageOptimizer } from './image-optimizer.js';
import path from 'path';

class ImageWatcher {
  private optimizer = new ImageOptimizer();
  private debounceMap = new Map<string, NodeJS.Timeout>();
  private debounceDelay = 1000; // 1 second

  private debounce(key: string, fn: () => void): void {
    const existing = this.debounceMap.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    
    const timeout = setTimeout(() => {
      fn();
      this.debounceMap.delete(key);
    }, this.debounceDelay);
    
    this.debounceMap.set(key, timeout);
  }

  async start(): Promise<void> {
    console.log('👀 Starting image file watcher...');
    console.log('   Watching for changes in image files...\n');
    
    const watcher = chokidar.watch([
      'img/**/*.{jpg,jpeg,png,gif}',
      'projects/**/*.{jpg,jpeg,png,gif}',
      '*.{jpg,jpeg,png,gif}',
      'assets/**/*.{jpg,jpeg,png,gif}'
    ], {
      ignored: [
        '**/optimized/**',
        '**/node_modules/**',
        '**/docs/**',
        '**/_freeze/**'
      ],
      persistent: true,
      ignoreInitial: true
    });

    watcher
      .on('add', (filePath) => {
        console.log(`📸 New image detected: ${filePath}`);
        this.debounce(filePath, () => this.processImage(filePath));
      })
      .on('change', (filePath) => {
        console.log(`🔄 Image changed: ${filePath}`);
        this.debounce(filePath, () => this.processImage(filePath));
      })
      .on('unlink', (filePath) => {
        console.log(`🗑️  Image removed: ${filePath}`);
        this.debounce(filePath, () => this.cleanupOptimizedImages(filePath));
      })
      .on('error', (error) => {
        console.error('❌ Watcher error:', error);
      });

    console.log('✅ Image watcher started. Press Ctrl+C to stop.');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping image watcher...');
      watcher.close();
      process.exit(0);
    });
  }

  private async processImage(filePath: string): Promise<void> {
    try {
      console.log(`\n🔧 Processing ${filePath}...`);
      await this.optimizer.optimizeImage(filePath);
      console.log(`✅ Finished processing ${filePath}\n`);
    } catch (error) {
      console.error(`❌ Failed to process ${filePath}:`, error);
    }
  }

  private async cleanupOptimizedImages(filePath: string): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      const outputDir = path.join(path.dirname(filePath), 'optimized');
      const baseName = path.parse(filePath).name;
      
      // Find and remove optimized versions
      const files = await fs.readdir(outputDir).catch(() => []);
      const toRemove = files.filter(file => file.startsWith(baseName));
      
      for (const file of toRemove) {
        const fullPath = path.join(outputDir, file);
        await fs.unlink(fullPath);
        console.log(`🗑️  Removed optimized: ${fullPath}`);
      }
    } catch (error) {
      console.warn(`Warning: Could not cleanup optimized images for ${filePath}:`, error);
    }
  }
}

// CLI usage
if (require.main === module) {
  const watcher = new ImageWatcher();
  watcher.start().catch(error => {
    console.error('❌ Image watcher failed:', error);
    process.exit(1);
  });
}

export { ImageWatcher };