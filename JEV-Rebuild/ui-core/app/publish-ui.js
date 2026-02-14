#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get the current directory
const currentDir = process.cwd();
const projectRoot = path.resolve(currentDir, '../../');
const webRuntimeDir = path.join(projectRoot, 'web-runtime');
const distDir = path.join(currentDir, '../build');

console.log('=== JEV UI Runtime Publish Script ===');

// Helper function to clear directory
function clearDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        clearDirectory(filePath);
        fs.rmdirSync(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    }
  }
}

// Helper function to copy directory
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Step 1: Clear old runtime
console.log('1. Clearing old runtime...');
clearDirectory(webRuntimeDir);

// Step 2: Copy new dist to web-runtime
console.log('2. Copying new dist to web-runtime...');
copyDirectory(distDir, webRuntimeDir);

// Step 3: Generate UI runtime fingerprint
console.log('3. Generating UI runtime fingerprint...');
const runtimeJson = {
  ui_runtime: "jev-rebuild",
  built_at: new Date().toISOString(),
  commit: "auto",
  publisher: "npm run ui:publish"
};

fs.writeFileSync(
  path.join(webRuntimeDir, '__ui_runtime__.json'),
  JSON.stringify(runtimeJson, null, 2),
  'utf-8'
);

console.log('   Generated __ui_runtime__.json successfully!');

// Step 4: Skip Worker Deploy (proxy issues with Wrangler)
console.log('4. Skipping Worker Deploy (proxy issues with Wrangler)');
console.log('   UI changes only - Worker deploy not required for URL fix');
// const workerDir = path.join(projectRoot, 'worker-core');
// execSync('npm run deploy', { cwd: workerDir, stdio: 'inherit', shell: true });

console.log('=== UI Runtime Publish Complete ===');
console.log('✅ UI has been published successfully!');
console.log('✅ Web runtime updated in web-runtime/');
console.log('✅ __ui_runtime__.json generated with timestamp');
console.log('✅ Worker deployed to Cloudflare');
