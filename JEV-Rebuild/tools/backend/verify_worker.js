#!/usr/bin/env node
// Worker 规则校验工具

import fs from 'fs';
import path from 'path';

// 定义Worker目录
const WORKER_CORE_DIR = 'D:/PDF转网页/JEV-Rebuild/worker-core';

console.log('=== Worker Verification Tool ===');

// 验证结果
const verificationResults = {
  passed: [],
  failed: []
};

// 记录验证结果
function recordResult(rule, passed, message) {
  const result = {
    rule,
    passed,
    message
  };
  
  if (passed) {
    verificationResults.passed.push(result);
    console.log(`✓ ${rule}`);
  } else {
    verificationResults.failed.push(result);
    console.log(`✗ ${rule}: ${message}`);
  }
}

// 检查文件是否存在
function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

// 检查目录是否存在
function checkDirExists(dirPath) {
  return fs.existsSync(dirPath);
}

// 检查文件内容是否符合规则
function checkFileContent(filePath, rules) {
  if (!checkFileExists(filePath)) {
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  for (const rule of rules) {
    if (rule.pattern && !rule.pattern.test(content)) {
      return false;
    }
    if (rule.antiPattern && rule.antiPattern.test(content)) {
      return false;
    }
  }
  
  return true;
}

// 检查文件是否使用ES Modules
function checkESModules(filePath) {
  if (!checkFileExists(filePath)) {
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  return /import\s+.*\s+from\s+['"].+['"]/.test(content) || /export\s+/.test(content);
}

// 验证目录结构
function verifyDirectoryStructure() {
  console.log('\n1. Verifying directory structure...');
  
  // 检查主目录
  recordResult(
    'Worker core directory exists',
    checkDirExists(WORKER_CORE_DIR),
    checkDirExists(WORKER_CORE_DIR) ? '' : 'Worker core directory does not exist'
  );
  
  // 检查子目录
  const requiredDirs = [
    path.join(WORKER_CORE_DIR, 'routes'),
    path.join(WORKER_CORE_DIR, 'modules'),
    path.join(WORKER_CORE_DIR, 'config')
  ];
  
  requiredDirs.forEach(dir => {
    const relativePath = path.relative(WORKER_CORE_DIR, dir);
    recordResult(
      `${relativePath} directory exists`,
      checkDirExists(dir),
      checkDirExists(dir) ? '' : `${relativePath} directory does not exist`
    );
  });
}

// 验证核心文件
function verifyCoreFiles() {
  console.log('\n2. Verifying core files...');
  
  // 检查 index.js
  const indexPath = path.join(WORKER_CORE_DIR, 'index.js');
  recordResult(
    'index.js exists',
    checkFileExists(indexPath),
    checkFileExists(indexPath) ? '' : 'index.js does not exist'
  );
  
  // 检查 index.js 是否只做路由注册
  if (checkFileExists(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // 检查是否包含业务逻辑关键字
    const hasBusinessLogic = /(message|connection|kv|trace).*=/.test(indexContent);
    recordResult(
      'index.js only does route registration',
      !hasBusinessLogic,
      hasBusinessLogic ? 'index.js contains business logic' : ''
    );
    
    // 检查是否包含 export default fetch
    recordResult(
      'index.js exports default fetch handler',
      /export\s+default\s+\{\s*fetch/.test(indexContent),
      /export\s+default\s+\{\s*fetch/.test(indexContent) ? '' : 'index.js does not export default fetch handler'
    );
  }
  
  // 检查路由文件
  const routes = ['ping.js', 'status.js', 'websocket.js'];
  routes.forEach(route => {
    const routePath = path.join(WORKER_CORE_DIR, 'routes', route);
    recordResult(
      `route ${route} exists`,
      checkFileExists(routePath),
      checkFileExists(routePath) ? '' : `route ${route} does not exist`
    );
    
    if (checkFileExists(routePath)) {
      recordResult(
        `${route} uses ES Modules`,
        checkESModules(routePath),
        checkESModules(routePath) ? '' : `${route} does not use ES Modules`
      );
    }
  });
  
  // 检查模块文件
  const modules = ['kv_store.js', 'ws_manager.js', 'trace.js'];
  modules.forEach(module => {
    const modulePath = path.join(WORKER_CORE_DIR, 'modules', module);
    recordResult(
      `module ${module} exists`,
      checkFileExists(modulePath),
      checkFileExists(modulePath) ? '' : `module ${module} does not exist`
    );
    
    if (checkFileExists(modulePath)) {
      recordResult(
        `${module} uses ES Modules`,
        checkESModules(modulePath),
        checkESModules(modulePath) ? '' : `${module} does not use ES Modules`
      );
    }
  });
  
  // 检查配置文件
  const configFile = path.join(WORKER_CORE_DIR, 'config', 'constants.js');
  recordResult(
    'config/constants.js exists',
    checkFileExists(configFile),
    checkFileExists(configFile) ? '' : 'config/constants.js does not exist'
  );
}

// 验证模块化规则
function verifyModularRules() {
  console.log('\n3. Verifying modular rules...');
  
  // 检查 index.js 是否引用路由模块
  const indexPath = path.join(WORKER_CORE_DIR, 'index.js');
  if (checkFileExists(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // 检查是否引用所有路由
    recordResult(
      'index.js imports all routes',
      /from\s+['"]\.\/routes\//.test(indexContent),
      /from\s+['"]\.\/routes\//.test(indexContent) ? '' : 'index.js does not import routes from routes directory'
    );
  }
  
  // 检查路由是否不包含业务逻辑（业务逻辑应在模块中）
  const routesDir = path.join(WORKER_CORE_DIR, 'routes');
  if (checkDirExists(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir);
    routeFiles.forEach(routeFile => {
      if (routeFile.endsWith('.js')) {
        const routePath = path.join(routesDir, routeFile);
        const routeContent = fs.readFileSync(routePath, 'utf8');
        
        // 检查是否直接操作 KV
        recordResult(
          `${routeFile} does not directly access KV`,
          !/\.put\(|\.get\(|\.delete\(/.test(routeContent),
          /\.put\(|\.get\(|\.delete\(/.test(routeContent) ? `${routeFile} directly accesses KV` : ''
        );
      }
    });
  }
}

// 验证WebSocket规则
function verifyWebSocketRules() {
  console.log('\n4. Verifying WebSocket rules...');
  
  const websocketPath = path.join(WORKER_CORE_DIR, 'routes', 'websocket.js');
  
  if (checkFileExists(websocketPath)) {
    const content = fs.readFileSync(websocketPath, 'utf8');
    
    // 检查是否使用 WebSocketPair
    recordResult(
      'WebSocket route uses WebSocketPair',
      /WebSocketPair/.test(content),
      /WebSocketPair/.test(content) ? '' : 'WebSocket route does not use WebSocketPair'
    );
    
    // 检查是否记录 connection_id
    recordResult(
      'WebSocket route records connection_id',
      /connectionId|crypto\.randomUUID/.test(content),
      /connectionId|crypto\.randomUUID/.test(content) ? '' : 'WebSocket route does not record connection_id'
    );
    
    // 检查是否附加 trace_id
    recordResult(
      'WebSocket route attaches trace_id',
      /traceId/.test(content),
      /traceId/.test(content) ? '' : 'WebSocket route does not attach trace_id'
    );
    
    // 检查是否写入 KV
    recordResult(
      'WebSocket events are written to KV',
      /putKV|KV/.test(content),
      /putKV|KV/.test(content) ? '' : 'WebSocket events are not written to KV'
    );
  } else {
    recordResult(
      'WebSocket route exists',
      false,
      'WebSocket route does not exist'
    );
  }
}

// 验证是否与UI耦合
function verifyNoUICoupling() {
  console.log('\n5. Verifying no UI coupling...');
  
  // 检查所有JS文件是否返回HTML
  const jsFiles = [];
  
  // 递归查找所有JS文件
  function findJsFiles(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        findJsFiles(filePath);
      } else if (file.endsWith('.js')) {
        jsFiles.push(filePath);
      }
    }
  }
  
  findJsFiles(WORKER_CORE_DIR);
  
  let hasHtmlResponse = false;
  jsFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    if (/<html|<body|<div|Content-Type.*html/.test(content)) {
      hasHtmlResponse = true;
      recordResult(
        `${path.relative(WORKER_CORE_DIR, filePath)} does not return HTML`,
        false,
        'Returns HTML content'
      );
    } else {
      recordResult(
        `${path.relative(WORKER_CORE_DIR, filePath)} does not return HTML`,
        true,
        ''
      );
    }
  });
}

// 验证是否使用旧命名
function verifyNoOldNaming() {
  console.log('\n6. Verifying no old naming...');
  
  // 检查所有JS文件是否包含旧命名
  const jsFiles = [];
  
  // 递归查找所有JS文件
  function findJsFiles(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        findJsFiles(filePath);
      } else if (file.endsWith('.js')) {
        jsFiles.push(filePath);
      }
    }
  }
  
  findJsFiles(WORKER_CORE_DIR);
  
  const oldNames = ['chat', 'old', 'legacy', 'v1', 'v2', 'relay'];
  
  jsFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasOldName = oldNames.some(oldName => new RegExp(oldName, 'i').test(content));
    
    recordResult(
      `${path.relative(WORKER_CORE_DIR, filePath)} does not use old naming`,
      !hasOldName,
      hasOldName ? 'Uses old naming patterns' : ''
    );
  });
}

// 执行验证
function verifyWorker() {
  // 重置验证结果
  verificationResults.passed = [];
  verificationResults.failed = [];
  
  console.log('Starting Worker verification...');
  
  // 执行各项验证
  verifyDirectoryStructure();
  verifyCoreFiles();
  verifyModularRules();
  verifyWebSocketRules();
  verifyNoUICoupling();
  verifyNoOldNaming();
  
  // 输出验证结果
  console.log('\n=== Verification Results ===');
  console.log(`Passed: ${verificationResults.passed.length}`);
  console.log(`Failed: ${verificationResults.failed.length}`);
  
  if (verificationResults.failed.length > 0) {
    console.log('\nFailed Rules:');
    verificationResults.failed.forEach(result => {
      console.log(`✗ ${result.rule}: ${result.message}`);
    });
  }
  
  if (verificationResults.passed.length > 0) {
    console.log('\nPassed Rules:');
    verificationResults.passed.forEach(result => {
      console.log(`✓ ${result.rule}`);
    });
  }
  
  console.log('\n=== Verification Summary ===');
  if (verificationResults.failed.length === 0) {
    console.log('✅ All rules passed! Worker is compliant with requirements.');
    return true;
  } else {
    console.log('❌ Some rules failed. Please check the results above.');
    return false;
  }
}

// 主函数
function main() {
  verifyWorker();
}

// 执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { verifyWorker };