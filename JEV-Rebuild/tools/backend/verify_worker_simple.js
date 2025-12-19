#!/usr/bin/env node
// 简化版 Worker 规则校验工具

import fs from 'fs';
import path from 'path';

// 定义Worker目录
const WORKER_CORE_DIR = 'D:/PDF转网页/JEV-Rebuild/worker-core';

console.log('=== Worker Verification Tool ===');

// 验证结果计数
let passedCount = 0;
let failedCount = 0;

// 验证函数
function verify(rule, condition, message) {
  if (condition) {
    console.log(`✓ ${rule}`);
    passedCount++;
  } else {
    console.log(`✗ ${rule}: ${message}`);
    failedCount++;
  }
}

// 检查文件是否存在
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// 检查目录是否存在
function dirExists(dirPath) {
  return fs.existsSync(dirPath);
}

// 读取文件内容
function readFile(filePath) {
  if (!fileExists(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

// 验证目录结构
function verifyStructure() {
  console.log('\n1. Verifying directory structure...');
  
  verify('Worker core directory exists', dirExists(WORKER_CORE_DIR), 'Worker core directory not found');
  verify('Routes directory exists', dirExists(path.join(WORKER_CORE_DIR, 'routes')), 'Routes directory not found');
  verify('Modules directory exists', dirExists(path.join(WORKER_CORE_DIR, 'modules')), 'Modules directory not found');
  verify('Config directory exists', dirExists(path.join(WORKER_CORE_DIR, 'config')), 'Config directory not found');
}

// 验证核心文件
function verifyCoreFiles() {
  console.log('\n2. Verifying core files...');
  
  // 检查index.js
  verify('index.js exists', fileExists(path.join(WORKER_CORE_DIR, 'index.js')), 'index.js not found');
  
  // 检查路由文件
  const routes = ['ping.js', 'status.js', 'websocket.js'];
  routes.forEach(route => {
    verify(`Route ${route} exists`, fileExists(path.join(WORKER_CORE_DIR, 'routes', route)), `${route} not found`);
  });
  
  // 检查模块文件
  const modules = ['kv_store.js', 'ws_manager.js', 'trace.js'];
  modules.forEach(module => {
    verify(`Module ${module} exists`, fileExists(path.join(WORKER_CORE_DIR, 'modules', module)), `${module} not found`);
  });
  
  // 检查配置文件
  verify('Config constants.js exists', fileExists(path.join(WORKER_CORE_DIR, 'config', 'constants.js')), 'constants.js not found');
}

// 验证模块化规则
function verifyModularity() {
  console.log('\n3. Verifying modularity...');
  
  // 检查index.js是否只做路由注册
  const indexContent = readFile(path.join(WORKER_CORE_DIR, 'index.js'));
  verify('index.js has no business logic', !/message|connection|kv|trace/.test(indexContent), 'index.js contains business logic');
  verify('index.js uses ES modules', /import.*from.*routes/.test(indexContent), 'index.js does not use ES modules for routes');
  verify('index.js exports default fetch handler', /export\s+default\s+\{\s*fetch/.test(indexContent), 'index.js does not export default fetch handler');
  
  // 检查websocket.js是否符合规则
  const wsContent = readFile(path.join(WORKER_CORE_DIR, 'routes', 'websocket.js'));
  verify('WebSocket route uses WebSocketPair', /WebSocketPair/.test(wsContent), 'WebSocket route does not use WebSocketPair');
  verify('WebSocket route records connection_id', /connectionId|crypto\.randomUUID/.test(wsContent), 'WebSocket route does not record connection_id');
  verify('WebSocket route uses trace_id', /traceId/.test(wsContent), 'WebSocket route does not use trace_id');
  verify('WebSocket route uses KV module', /putKV|KV/.test(wsContent), 'WebSocket route does not use KV module');
  
  // 检查是否返回HTML
  const allJsFiles = [];
  function findJsFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        findJsFiles(filePath);
      } else if (file.endsWith('.js')) {
        allJsFiles.push(filePath);
      }
    });
  }
  findJsFiles(WORKER_CORE_DIR);
  
  let hasHtml = false;
  allJsFiles.forEach(filePath => {
    const content = readFile(filePath);
    if (/<html|<body|<div|Content-Type.*html/.test(content)) {
      hasHtml = true;
    }
  });
  verify('No HTML returned by any file', !hasHtml, 'Some files return HTML content');
  
  // 检查是否使用旧命名
  const oldNames = ['chat', 'old', 'legacy', 'v1', 'v2', 'relay'];
  let hasOldNames = false;
  allJsFiles.forEach(filePath => {
    const content = readFile(filePath);
    if (oldNames.some(name => new RegExp(name, 'i').test(content))) {
      hasOldNames = true;
    }
  });
  verify('No old naming patterns', !hasOldNames, 'Some files use old naming patterns');
}

// 主函数
function main() {
  verifyStructure();
  verifyCoreFiles();
  verifyModularity();
  
  console.log('\n=== Verification Summary ===');
  console.log(`Total rules: ${passedCount + failedCount}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  
  if (failedCount === 0) {
    console.log('\n✅ All rules passed! Worker is compliant with requirements.');
  } else {
    console.log('\n❌ Some rules failed. Please check the results above.');
  }
}

// 执行主函数
main();

export { main };