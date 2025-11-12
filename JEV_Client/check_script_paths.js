/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.134Z */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'D:\\PDF转网页\\JEV_Client';
const INDEX_HTML = path.join(ROOT_DIR, 'index.html');
const REPORT_FILE = path.join(ROOT_DIR, 'jev_script_path_check_log.txt');
const KEY_FILES = [
  'main.js', 
  'init.js', 
  'toggle_manager.js', 
  'register.js', 
  'inviteCodeManager.js'
];

function readIndexHtml() {
  try {
    return fs.readFileSync(INDEX_HTML, 'utf8');
  } catch (error) {
    console.error(`❌ 无法读取 index.html 文件: ${error.message}`);
    return null;
  }
}

function extractScriptTags(html) {
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/g;
  const scripts = [];
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  
  return scripts;
}

function checkScriptExists(scriptPath) {
  // 处理相对路径
  const absolutePath = path.isAbsolute(scriptPath) 
    ? scriptPath 
    : path.join(ROOT_DIR, scriptPath);
    
  // 尝试在不同目录查找
  const possiblePaths = [
    absolutePath,
    path.join(ROOT_DIR, 'modules', path.basename(scriptPath)),
    path.join(ROOT_DIR, 'ui', path.basename(scriptPath))
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return { exists: true, path: p };
    }
  }
  
  return { exists: false, path: absolutePath };
}

function checkFileContent(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return { hasContent: false, size: 0, error: '文件为空' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查BOM
    const hasBOM = content.charCodeAt(0) === 0xFEFF;
    
    // 简单语法检查（尝试解析JS）
    let hasSyntaxError = false;
    try {
      if (filePath.endsWith('.js')) {
        // 使用 Function 构造函数进行简单语法检查
        new Function(`"use strict"; ${content}`);
      }
    } catch (syntaxError) {
      hasSyntaxError = true;
    }
    
    return {
      hasContent: true,
      size: stats.size,
      hasBOM,
      hasSyntaxError
    };
  } catch (error) {
    return { hasContent: false, size: 0, error: error.message };
  }
}

function checkKeyFiles() {
  const results = [];
  
  for (const fileName of KEY_FILES) {
    const checkResult = checkScriptExists(fileName);
    if (checkResult.exists) {
      const contentResult = checkFileContent(checkResult.path);
      results.push({
        file: fileName,
        found: true,
        path: checkResult.path,
        ...contentResult
      });
    } else {
      results.push({
        file: fileName,
        found: false,
        path: checkResult.path
      });
    }
  }
  
  return results;
}

function generateReport(indexScripts, indexCheckResults, keyFileResults) {
  const report = [];
  const timestamp = new Date().toLocaleString('zh-CN');
  
  report.push(`==========================================================`);
  report.push(`JEV Client 脚本路径检测报告`);
  report.push(`生成时间: ${timestamp}`);
  report.push(`==========================================================\n`);
  
  // index.html 脚本引用检查
  report.push(`📄 index.html 中的脚本引用检查:`);
  report.push(`总引用脚本数: ${indexScripts.length}`);
  report.push(``);
  
  indexScripts.forEach((script, index) => {
    const checkResult = indexCheckResults[index];
    if (checkResult.exists) {
      const contentResult = checkFileContent(checkResult.path);
      report.push(`✅ ${index + 1}. ${script}`);
      report.push(`   实际路径: ${checkResult.path}`);
      report.push(`   文件大小: ${contentResult.size} 字节`);
      report.push(`   BOM标记: ${contentResult.hasBOM ? '存在' : '不存在'}`);
      report.push(`   语法检查: ${contentResult.hasSyntaxError ? '❌ 存在语法错误' : '✅ 通过'}`);
    } else {
      report.push(`❌ ${index + 1}. ${script}`);
      report.push(`   错误: 文件不存在于以下路径:`);
      report.push(`   - ${checkResult.path}`);
      report.push(`   - ${path.join(ROOT_DIR, 'modules', path.basename(script))}`);
      report.push(`   - ${path.join(ROOT_DIR, 'ui', path.basename(script))}`);
    }
    report.push(``);
  });
  
  // 关键文件检查
  report.push(`\n==========================================================`);
  report.push(`🔑 关键文件检查结果:`);
  report.push(`==========================================================\n`);
  
  keyFileResults.forEach(result => {
    if (result.found) {
      report.push(`✅ ${result.file}`);
      report.push(`   找到路径: ${result.path}`);
      report.push(`   文件大小: ${result.size} 字节`);
      report.push(`   BOM标记: ${result.hasBOM ? '存在' : '不存在'}`);
      report.push(`   语法检查: ${result.hasSyntaxError ? '❌ 存在语法错误' : '✅ 通过'}`);
    } else {
      report.push(`❌ ${result.file}`);
      report.push(`   错误: 文件不存在`);
    }
    report.push(``);
  });
  
  // 统计信息
  const totalScripts = indexScripts.length;
  const foundScripts = indexCheckResults.filter(r => r.exists).length;
  const missingScripts = totalScripts - foundScripts;
  const foundKeyFiles = keyFileResults.filter(r => r.found).length;
  const missingKeyFiles = KEY_FILES.length - foundKeyFiles;
  
  report.push(`==========================================================`);
  report.push(`📊 统计信息:`);
  report.push(`==========================================================`);
  report.push(`index.html 引用脚本: ${totalScripts} 个`);
  report.push(`  - 找到: ${foundScripts} 个`);
  report.push(`  - 缺失: ${missingScripts} 个`);
  report.push(``);
  report.push(`关键文件检查: ${KEY_FILES.length} 个`);
  report.push(`  - 找到: ${foundKeyFiles} 个`);
  report.push(`  - 缺失: ${missingKeyFiles} 个`);
  report.push(`==========================================================`);
  
  return report.join('\n');
}

function main() {
  console.log('开始检测 index.html 中的脚本路径...');
  
  // 读取并解析 index.html
  const htmlContent = readIndexHtml();
  if (!htmlContent) {
    console.error('无法继续检测，退出');
    return;
  }
  
  // 提取所有 script 标签
  const scriptTags = extractScriptTags(htmlContent);
  console.log(`找到 ${scriptTags.length} 个脚本引用`);
  
  // 检查每个脚本是否存在
  const scriptCheckResults = scriptTags.map(script => checkScriptExists(script));
  
  // 检查关键文件
  const keyFileResults = checkKeyFiles();
  
  // 生成报告
  const report = generateReport(scriptTags, scriptCheckResults, keyFileResults);
  
  // 保存报告
  try {
    fs.writeFileSync(REPORT_FILE, report, 'utf8');
    console.log(`\n✅ 检测完成！`);
    console.log(`报告已保存至: ${REPORT_FILE}`);
  } catch (error) {
    console.error(`\n❌ 无法保存报告: ${error.message}`);
  }
}

main();