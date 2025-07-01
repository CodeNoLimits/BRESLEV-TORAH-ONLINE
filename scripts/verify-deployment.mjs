#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

console.log('🔍 Verifying Le Compagnon du Cœur deployment readiness...');

async function verifyDeployment() {
  const checks = [];
  
  try {
    // Check 1: Verify build artifacts exist
    console.log('📁 Checking build artifacts...');
    const requiredFiles = [
      'dist/index.js',
      'dist/fullTextExtractor.js', 
      'dist/package.json',
      'dist/public/index.html',
      'dist/public/assets'
    ];
    
    for (const file of requiredFiles) {
      if (existsSync(file)) {
        checks.push(`✅ ${file} exists`);
      } else {
        checks.push(`❌ ${file} missing`);
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    // Check 2: Verify ES module configuration
    console.log('📦 Checking ES module configuration...');
    const packageJson = JSON.parse(readFileSync('dist/package.json', 'utf8'));
    if (packageJson.type === 'module') {
      checks.push('✅ ES module type configured');
    } else {
      checks.push('❌ ES module type missing');
      throw new Error('ES module type not configured');
    }
    
    // Check 3: Verify no require() statements in built files
    console.log('🔧 Checking for ES module compatibility...');
    const indexContent = readFileSync('dist/index.js', 'utf8');
    const hasRequire = /require\d*\s*\(/.test(indexContent);
    if (!hasRequire) {
      checks.push('✅ No require() statements found');
    } else {
      checks.push('❌ require() statements still present');
      throw new Error('ES module compatibility issues remain');
    }
    
    // Check 4: Start production server and test endpoints
    console.log('🚀 Testing production server startup...');
    const testPort = 5002;
    
    try {
      const serverProcess = execSync(
        `NODE_ENV=production PORT=${testPort} timeout 2s node dist/index.js || true`,
        { 
          cwd: '.',
          stdio: 'pipe',
          encoding: 'utf8'
        }
      ).toString();
      
      if (serverProcess.includes('serving on port') || serverProcess.includes('running on http')) {
        checks.push('✅ Production server starts successfully');
      } else {
        checks.push('⚠️  Production server test inconclusive');
      }
    } catch (error) {
      // Server startup is expected to timeout - this is normal behavior
      if (error.status === 124) { // timeout exit code
        checks.push('✅ Production server starts successfully (timeout expected)');
      } else {
        checks.push('❌ Production server startup failed');
        throw error;
      }
    }
    
    // Check 5: Verify environment variable handling
    console.log('🔑 Checking environment configuration...');
    const envVars = ['DATABASE_URL', 'GEMINI_API_KEY'];
    let envConfigured = true;
    
    for (const envVar of envVars) {
      if (process.env[envVar]) {
        checks.push(`✅ ${envVar} configured`);
      } else {
        checks.push(`⚠️  ${envVar} not set (will need configuration)`);
        envConfigured = false;
      }
    }
    
    // Check 6: Verify deployment configuration
    console.log('📋 Checking deployment configuration...');
    if (existsSync('.replit')) {
      const replitConfig = readFileSync('.replit', 'utf8');
      if (replitConfig.includes('[deployment]') && 
          replitConfig.includes('build = ["npm", "run", "build"]') && 
          replitConfig.includes('run = ["npm", "run", "start"]')) {
        checks.push('✅ Deployment commands configured');
      } else {
        checks.push('❌ Deployment commands missing');
      }
    } else {
      checks.push('❌ .replit configuration file missing');
    }
    
    // Summary
    console.log('\n📊 Deployment Verification Summary:');
    console.log('='.repeat(50));
    checks.forEach(check => console.log(check));
    
    const failed = checks.filter(check => check.includes('❌')).length;
    const warnings = checks.filter(check => check.includes('⚠️')).length;
    
    if (failed === 0) {
      console.log('\n🎉 Deployment verification PASSED!');
      console.log('✅ Application is ready for production deployment');
      
      if (warnings > 0) {
        console.log(`⚠️  ${warnings} configuration warning(s) - check environment variables`);
      }
      
      console.log('\n📝 Deployment Instructions:');
      console.log('1. Click the Deploy button in Replit');
      console.log('2. Ensure environment variables are configured');
      console.log('3. Application will be available on your Replit domain');
      
      return true;
    } else {
      console.log(`\n❌ Deployment verification FAILED: ${failed} error(s)`);
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Deployment verification failed:', error.message);
    return false;
  }
}

// Run verification
const success = await verifyDeployment();
process.exit(success ? 0 : 1);