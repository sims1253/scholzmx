#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Cross-platform TypeScript file copy script
 * Copies the compiled browser JavaScript to the root directory for Quarto
 */
async function copyCompiledJS(): Promise<void> {
  const source = path.join('dist-browser', 'sunlit-script-browser.js');
  const destination = 'sunlit-script.js';

  try {
    // Check if source file exists
    await fs.access(source);
    
    // Copy the file
    await fs.copyFile(source, destination);
    
    console.log(`✅ Copied ${source} → ${destination}`);
    
    // Optional: Log file sizes for verification
    const sourceStats = await fs.stat(source);
    const destStats = await fs.stat(destination);
    
    console.log(`   Source: ${Math.round(sourceStats.size / 1024)}KB`);
    console.log(`   Destination: ${Math.round(destStats.size / 1024)}KB`);
    
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`❌ Source file not found: ${source}`);
      console.error('   Make sure to run TypeScript compilation first: npm run build:ts');
    } else {
      console.error(`❌ Failed to copy file:`, error);
    }
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  copyCompiledJS().catch(error => {
    console.error('❌ Copy operation failed:', error);
    process.exit(1);
  });
}

export { copyCompiledJS };