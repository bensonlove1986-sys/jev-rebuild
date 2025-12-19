#!/usr/bin/env node
// 规则校验工具（是否模块化、是否违规引用）

import fs from 'fs';
import path from 'path';

// 定义UI目录
const UI_DIR = 'D:/PDF转网页/JEV-Rebuild/ui-core/app';

console.log('=== UI Verification Tool ===');

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

// 检查文件是否使用ES Modules
function checkESModules(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 检查是否有import或export语句
  const hasImport = /import\s+.*\s+from\s+['"].+['"]/.test(content);
  const hasExport = /export\s+(?:const|let|var|function|class|default)/.test(content);
  
  return hasImport || hasExport;
}

// 检查index.html是否符合规则
function verifyIndexHtml() {
  console.log('\n1. Verifying index.html...');
  
  const filePath = path.join(UI_DIR, 'index.html');
  
  if (!fs.existsSync(filePath)) {
    recordResult('index.html exists', false, 'index.html文件不存在');
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 检查是否包含业务逻辑
  const hasInlineScriptLogic = /<script[^>]*>\s*[^<]*[{};]\s*<\/script>/.test(content);
  recordResult(
    'index.html no inline script logic',
    !hasInlineScriptLogic,
    hasInlineScriptLogic ? 'index.html包含内联脚本业务逻辑' : ''
  );
  
  // 检查是否使用ES Modules
  const usesESModules = /<script[^>]*type=["']module["'][^>]*>/.test(content);
  recordResult(
    'index.html uses ES Modules',
    usesESModules,
    usesESModules ? '' : 'index.html未使用ES Modules加载JavaScript'
  );
  
  // 检查是否引用外部HTML
  const referencesExternalHtml = /<iframe|\.html['"]/.test(content);
  recordResult(
    'index.html no external HTML references',
    !referencesExternalHtml,
    referencesExternalHtml ? 'index.html引用了外部HTML资源' : ''
  );
}

// 检查是否有bootstrap.js文件
function verifyBootstrapJs() {
  console.log('\n2. Verifying bootstrap.js...');
  
  const filePath = path.join(UI_DIR, 'bootstrap.js');
  
  if (fs.existsSync(filePath)) {
    recordResult('bootstrap.js exists', true, '');
    
    // 检查是否使用ES Modules
    const usesESModules = checkESModules(filePath);
    recordResult(
      'bootstrap.js uses ES Modules',
      usesESModules,
      usesESModules ? '' : 'bootstrap.js未使用ES Modules'
    );
  } else {
    recordResult('bootstrap.js exists', false, 'bootstrap.js文件不存在');
  }
}

// 检查目录结构
function verifyDirectoryStructure() {
  console.log('\n3. Verifying directory structure...');
  
  const requiredDirs = [
    path.join(UI_DIR, 'modules'),
    path.join(UI_DIR, 'styles')
  ];
  
  requiredDirs.forEach(dir => {
    const relativePath = path.relative(UI_DIR, dir);
    recordResult(
      `${relativePath} directory exists`,
      fs.existsSync(dir),
      fs.existsSync(dir) ? '' : `${relativePath}目录不存在`
    );
  });
  
  // 检查是否包含必需的模块文件
  const requiredModules = [
    path.join(UI_DIR, 'modules', 'state.js'),
    path.join(UI_DIR, 'modules', 'ws_client.js'),
    path.join(UI_DIR, 'modules', 'event_bus.js'),
    path.join(UI_DIR, 'modules', 'ui_render.js')
  ];
  
  requiredModules.forEach(modulePath => {
    const relativePath = path.relative(UI_DIR, modulePath);
    recordResult(
      `${relativePath} exists`,
      fs.existsSync(modulePath),
      fs.existsSync(modulePath) ? '' : `${relativePath}文件不存在`
    );
  });
  
  // 检查是否包含CSS文件
  const cssFilePath = path.join(UI_DIR, 'styles', 'base.css');
  recordResult(
    'styles/base.css exists',
    fs.existsSync(cssFilePath),
    fs.existsSync(cssFilePath) ? '' : 'styles/base.css文件不存在'
  );
}

// 检查JavaScript文件是否符合模块化规则
function verifyJavaScriptFiles() {
  console.log('\n4. Verifying JavaScript modules...');
  
  const jsFiles = [];
  
  // 递归查找所有JavaScript文件
  function findJsFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      if (fs.lstatSync(filePath).isDirectory()) {
        findJsFiles(filePath);
      } else if (file.endsWith('.js')) {
        jsFiles.push(filePath);
      }
    });
  }
  
  findJsFiles(UI_DIR);
  
  if (jsFiles.length === 0) {
    recordResult('JavaScript files exist', false, '未找到JavaScript文件');
    return;
  }
  
  // 检查每个JavaScript文件
  jsFiles.forEach(filePath => {
    const relativePath = path.relative(UI_DIR, filePath);
    
    // 检查是否使用ES Modules
    const usesESModules = checkESModules(filePath);
    recordResult(
      `${relativePath} uses ES Modules`,
      usesESModules,
      usesESModules ? '' : `${relativePath}未使用ES Modules`
    );
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否有全局变量声明
    const hasGlobalVars = /^(?:var|let|const)\s+[a-zA-Z_]/.test(content);
    recordResult(
      `${relativePath} no global variables`,
      !hasGlobalVars,
      hasGlobalVars ? `${relativePath}包含全局变量声明` : ''
    );
    
    // 检查是否引用旧系统文件
    const referencesOldFiles = /(chat|old|legacy|v1|v2)[^/]*\.js/i.test(content);
    recordResult(
      `${relativePath} no old system references`,
      !referencesOldFiles,
      referencesOldFiles ? `${relativePath}引用了旧系统文件` : ''
    );
  });
}

// 执行验证
function verifyUI() {
  // 重置验证结果
  verificationResults.passed = [];
  verificationResults.failed = [];
  
  console.log('Starting UI verification...');
  
  // 执行各项验证
  verifyIndexHtml();
  verifyBootstrapJs();
  verifyDirectoryStructure();
  verifyJavaScriptFiles();
  
  // 输出验证结果
  console.log('\n=== UI Verification Results ===');
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
    console.log('✅ All rules passed! UI is compliant with requirements.');
    return true;
  } else {
    console.log('❌ Some rules failed. Please check the results above.');
    return false;
  }
}

// 主函数
function main() {
  verifyUI();
}

// 执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { verifyUI };