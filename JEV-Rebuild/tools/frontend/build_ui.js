#!/usr/bin/env node
// UI 构建工具（仅拷贝/拼装，不打包）

import fs from 'fs';
import path from 'path';

// 定义目录路径
const UI_SOURCE_DIR = 'D:/PDF转网页/JEV-Rebuild/ui-core/app';
const UI_BUILD_DIR = 'D:/PDF转网页/JEV-Rebuild/ui-core/build';

console.log('=== UI Build Tool ===');

// 确保目录存在
function ensureDirectory(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    } else {
      console.log(`✓ Directory already exists: ${dir}`);
    }
  } catch (error) {
    console.error(`✗ Failed to create directory ${dir}:`, error.message);
    process.exit(1);
  }
}

// 递归复制目录
function copyDirectory(sourceDir, targetDir) {
  console.log(`\nCopying files from ${sourceDir} to ${targetDir}...`);
  
  // 确保目标目录存在
  ensureDirectory(targetDir);
  
  // 获取源目录中的所有文件和子目录
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    
    if (entry.isDirectory()) {
      // 递归复制子目录
      copyDirectory(sourcePath, targetPath);
    } else {
      // 复制文件
      try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✓ Copied: ${sourcePath} → ${targetPath}`);
      } catch (error) {
        console.error(`✗ Failed to copy ${sourcePath} → ${targetPath}:`, error.message);
        process.exit(1);
      }
    }
  }
}

// 构建UI
function buildUI() {
  console.log('1. Preparing build directory...');
  
  // 清空构建目录（如果存在）
  if (fs.existsSync(UI_BUILD_DIR)) {
    try {
      fs.rmSync(UI_BUILD_DIR, { recursive: true, force: true });
      console.log(`✓ Cleared build directory: ${UI_BUILD_DIR}`);
    } catch (error) {
      console.error(`✗ Failed to clear build directory:`, error.message);
      process.exit(1);
    }
  }
  
  // 创建构建目录
  ensureDirectory(UI_BUILD_DIR);
  
  // 复制UI源码到构建目录
  copyDirectory(UI_SOURCE_DIR, UI_BUILD_DIR);
  
  console.log('\n=== UI Build Completed ===');
  console.log(`✓ UI build successfully completed!`);
  console.log(`✓ Build output directory: ${UI_BUILD_DIR}`);
  
  // 显示构建结果
  console.log('\nBuild result:');
  const buildFiles = fs.readdirSync(UI_BUILD_DIR, { recursive: true });
  buildFiles.forEach(file => {
    const filePath = path.join(UI_BUILD_DIR, file);
    if (fs.lstatSync(filePath).isFile()) {
      console.log(`  - ${path.relative(UI_BUILD_DIR, filePath)}`);
    }
  });
}

// 执行构建
if (import.meta.url === `file://${process.argv[1]}`) {
  buildUI();
}

export { buildUI };