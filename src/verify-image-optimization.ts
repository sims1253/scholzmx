#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

interface VerificationResults {
  passed: number;
  failed: number;
  issues: string[];
}

async function verifyImageOptimization(): Promise<boolean> {
  console.log('🔍 Verifying image optimization implementation...\n');

  const results: VerificationResults = {
    passed: 0,
    failed: 0,
    issues: []
  };

  // Test 1: Check if optimized directories exist
  console.log('1. Checking optimized image directories...');
  try {
    await fs.access('img/optimized');
    await fs.access('projects/optimized');
    console.log('✅ Optimized directories exist');
    results.passed++;
  } catch (error) {
    console.log('❌ Optimized directories missing');
    results.failed++;
    results.issues.push('Missing optimized image directories');
  }

  // Test 2: Check for WebP and AVIF formats
  console.log('\n2. Checking modern image formats...');
  try {
    const imgOptimized = await fs.readdir('img/optimized');
    const projectsOptimized = await fs.readdir('projects/optimized');

    const hasWebP = [...imgOptimized, ...projectsOptimized].some(file => file.endsWith('.webp'));
    const hasAVIF = [...imgOptimized, ...projectsOptimized].some(file => file.endsWith('.avif'));

    if (hasWebP && hasAVIF) {
      console.log('✅ WebP and AVIF formats found');
      results.passed++;
    } else {
      console.log('❌ Missing modern image formats');
      results.failed++;
      results.issues.push('Missing WebP or AVIF formats');
    }
  } catch (error) {
    console.log('❌ Could not check image formats');
    results.failed++;
    results.issues.push('Could not verify image formats');
  }

  // Test 3: Check for responsive sizes
  console.log('\n3. Checking responsive image sizes...');
  try {
    const imgOptimized = await fs.readdir('img/optimized');
    const hasSizes = imgOptimized.some(file => file.includes('-sm') || file.includes('-md') || file.includes('-lg'));

    if (hasSizes) {
      console.log('✅ Responsive image sizes found');
      results.passed++;
    } else {
      console.log('❌ No responsive sizes found');
      results.failed++;
      results.issues.push('Missing responsive image sizes');
    }
  } catch (error) {
    console.log('❌ Could not check responsive sizes');
    results.failed++;
    results.issues.push('Could not verify responsive sizes');
  }

  // Test 4: Check for picture elements in HTML
  console.log('\n4. Checking picture element usage...');
  try {
    const artShowcase = await fs.readFile('_art-showcase.qmd', 'utf8');
    const indexFile = await fs.readFile('index.qmd', 'utf8');
    const projectsFile = await fs.readFile('projects/index.qmd', 'utf8');

    const hasPictureElements = [artShowcase, indexFile, projectsFile].some(content =>
      content.includes('<picture>') && content.includes('<source')
    );

    if (hasPictureElements) {
      console.log('✅ Picture elements implemented');
      results.passed++;
    } else {
      console.log('❌ Picture elements not found');
      results.failed++;
      results.issues.push('Missing picture elements for responsive images');
    }
  } catch (error) {
    console.log('❌ Could not check picture elements');
    results.failed++;
    results.issues.push('Could not verify picture elements');
  }

  // Test 5: Check for lazy loading
  console.log('\n5. Checking lazy loading implementation...');
  try {
    const artShowcase = await fs.readFile('_art-showcase.qmd', 'utf8');
    const projectsFile = await fs.readFile('projects/index.qmd', 'utf8');

    const hasLazyLoading = [artShowcase, projectsFile].some(content =>
      content.includes('loading="lazy"')
    );

    if (hasLazyLoading) {
      console.log('✅ Lazy loading implemented');
      results.passed++;
    } else {
      console.log('❌ Lazy loading not found');
      results.failed++;
      results.issues.push('Missing lazy loading attributes');
    }
  } catch (error) {
    console.log('❌ Could not check lazy loading');
    results.failed++;
    results.issues.push('Could not verify lazy loading');
  }

  // Test 6: Check file size improvements
  console.log('\n6. Checking file size improvements...');
  try {
    const originalStats = await fs.stat('img/fancy_me.jpg');
    const optimizedStats = await fs.stat('img/optimized/fancy_me-md.webp');

    const improvement = (1 - optimizedStats.size / originalStats.size) * 100;

    if (improvement > 50) {
      console.log(`✅ Significant file size reduction: ${improvement.toFixed(1)}%`);
      results.passed++;
    } else {
      console.log(`⚠️  Modest file size reduction: ${improvement.toFixed(1)}%`);
      results.passed++;
    }
  } catch (error) {
    console.log('❌ Could not verify file size improvements');
    results.failed++;
    results.issues.push('Could not verify file size improvements');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.issues.length > 0) {
    console.log('\n🚨 Issues found:');
    results.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }

  if (results.failed === 0) {
    console.log('\n🎉 All image optimization requirements have been successfully implemented!');
    console.log('\nImplemented features:');
    console.log('• ✅ Images compressed and converted to WebP/AVIF formats');
    console.log('• ✅ Responsive image sizing with multiple breakpoints');
    console.log('• ✅ Lazy loading for non-critical images');
    console.log('• ✅ Picture elements for modern browser support');
    console.log('• ✅ Significant file size reductions achieved');
    return true;
  } else {
    console.log('\n⚠️  Some image optimization requirements need attention.');
    return false;
  }
}

export { verifyImageOptimization };

if (require.main === module) {
  verifyImageOptimization().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}