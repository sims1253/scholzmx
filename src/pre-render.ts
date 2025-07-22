#!/usr/bin/env node

import { ImageOptimizer } from './image-optimizer.js';
import { promises as fs } from 'fs';
import path from 'path';

interface BuildConfig {
    optimizeImages: boolean;
    copyToOutput: boolean;
    outputDir: string;
}

class PreRenderProcessor {
    private config: BuildConfig = {
        optimizeImages: true,
        copyToOutput: true,
        outputDir: 'docs'
    };

    async copyOptimizedImages(): Promise<void> {
        console.log('📋 Copying optimized images to output directory...');

        const sourcePatterns = [
            'img/optimized/**/*',
            'projects/optimized/**/*',
            'assets/optimized/**/*',
            'optimized/**/*'  // For root-level optimized images
        ];

        for (const pattern of sourcePatterns) {
            try {
                const { glob } = await import('glob');
                const files = await glob(pattern, {
                    nodir: true,  // Only match files, not directories
                    dot: false    // Don't match hidden files
                });

                console.log(`   Pattern ${pattern} found ${files.length} files`);

                // Process files in batches to avoid overwhelming the system
                const batchSize = 10;
                for (let i = 0; i < files.length; i += batchSize) {
                    const batch = files.slice(i, i + batchSize);

                    await Promise.all(batch.map(async (file) => {
                        try {
                            const relativePath = path.relative(process.cwd(), file);
                            const outputPath = path.join(this.config.outputDir, relativePath);

                            // Ensure output directory exists
                            await fs.mkdir(path.dirname(outputPath), { recursive: true });

                            // Copy file with error handling
                            await fs.copyFile(file, outputPath);
                            console.log(`   Copied: ${relativePath} → ${path.relative(process.cwd(), outputPath)}`);
                        } catch (fileError) {
                            console.error(`   Failed to copy ${file}:`, fileError);
                        }
                    }));
                }
            } catch (error) {
                console.warn(`Warning: Could not copy files matching ${pattern}:`, error);
            }
        }
    }

    async run(): Promise<void> {
        console.log('🔧 Running pre-render processing...\n');

        if (this.config.optimizeImages) {
            const optimizer = new ImageOptimizer();
            await optimizer.optimizeAll();
        }

        if (this.config.copyToOutput) {
            await this.copyOptimizedImages();
        }

        console.log('\n✅ Pre-render processing complete!');
    }
}

// CLI usage
if (require.main === module) {
    const processor = new PreRenderProcessor();
    processor.run().catch(error => {
        console.error('❌ Pre-render processing failed:', error);
        process.exit(1);
    });
}

export { PreRenderProcessor };