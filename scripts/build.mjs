#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔨 Building Le Compagnon du Cœur...');

try {
  // Step 1: Build frontend with Vite
  console.log('📦 Building frontend...');
  execSync('vite build', { stdio: 'inherit' });

  // Step 2: Build server with esbuild (ES modules)
  console.log('🖥️  Building server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --target=node18', { stdio: 'inherit' });

  // Step 3: Build fullTextExtractor separately
  console.log('📚 Building text extractor...');
  execSync('esbuild server/fullTextExtractor.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/fullTextExtractor.js --target=node18', { stdio: 'inherit' });

  // Step 4: Create package.json for dist directory
  console.log('📄 Creating production package.json...');
  const distPackageJson = {
    "type": "module",
    "main": "index.js"
  };
  writeFileSync(join('dist', 'package.json'), JSON.stringify(distPackageJson, null, 2));

  // Step 5: Fix ES module compatibility issues
  console.log('🔧 Fixing ES module compatibility...');
  const indexPath = join('dist', 'index.js');
  if (existsSync(indexPath)) {
    let indexContent = readFileSync(indexPath, 'utf8');

    // Remove any problematic require statements that esbuild might add
    indexContent = indexContent.replace(
      /import\s*{\s*createRequire\s*}\s*from\s*["']module["'];\s*var\s+require\w*\s*=\s*createRequire\(import\.meta\.url\);\s*/g,
      ''
    );

    // Remove require calls for fullTextExtractor
    indexContent = indexContent.replace(
      /var\s*{\s*extractCompleteBook\s*}\s*=\s*require\w*\(["']\.\/fullTextExtractor["']\);/g,
      ''
    );

    // Ensure dynamic imports are used instead of require
    indexContent = indexContent.replace(
      /require\w*\(["']\.\/fullTextExtractor["']\)/g,
      'await import("./fullTextExtractor.js")'
    );

    // Fix any remaining require statements to use dynamic imports
    indexContent = indexContent.replace(
      /const\s+(\w+)\s+=\s+require\(["']([^"']+)["']\)/g,
      'const $1 = await import("$2")'
    );

    writeFileSync(indexPath, indexContent);
    console.log('✅ ES module compatibility fixed');
  }

  console.log('🎉 Build completed successfully!');
  console.log('📁 Files generated in ./dist/');
  console.log('🚀 Ready for deployment with: npm start');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}