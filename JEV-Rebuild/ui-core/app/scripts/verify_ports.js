/**
 * 端口统一验证脚本
 * 扫描构建产物或源码，发现以下任一项就 exit(1)：
 * - localhost:8787
 * - :8787/
 * - http://localhost: 但不是 3000（允许 3000）
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 扫描目录
const scanDir = process.argv[2] || './dist';

// 错误收集
const errors = [];

// 扫描文件
async function scanFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // 检查 localhost:8787
    if (content.includes('localhost:8787')) {
      errors.push(`${filePath}: 包含 localhost:8787`);
    }
    
    // 检查 :8787/
    if (/:8787\//.test(content)) {
      errors.push(`${filePath}: 包含 :8787/`);
    }
    
    // 检查 http://localhost: 但不是 3000
    const localhostMatches = content.match(/http:\/\/localhost:(\d+)/g);
    if (localhostMatches) {
      localhostMatches.forEach(match => {
        if (!match.includes('localhost:3000')) {
          errors.push(`${filePath}: 包含 ${match}`);
        }
      });
    }
  } catch (error) {
    console.error(`Error scanning file ${filePath}: ${error.message}`);
  }
}

// 遍历目录
async function scanDirectory(directory) {
  const files = await fs.readdir(directory);
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = await fs.stat(filePath);
    
    if (stat.isDirectory()) {
      await scanDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.html'))) {
      await scanFile(filePath);
    }
  }
}

// 执行扫描
async function main() {
  console.log(`Scanning directory: ${scanDir}`);
  await scanDirectory(scanDir);
  
  // 输出结果
  if (errors.length > 0) {
    console.error('❌ 发现端口配置错误:');
    errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    process.exit(1);
  } else {
    console.log('✅ 端口配置检查通过!');
    process.exit(0);
  }
}

main();
