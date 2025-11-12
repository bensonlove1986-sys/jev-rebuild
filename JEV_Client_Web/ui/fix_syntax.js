// JEV-WebSyntax-AutoFix-v1.0
// 自动检测并修复网页语法与结构错误

const fs = require('fs');
const path = require('path');

// 配置项
const CONFIG = {
  uiDir: path.join(__dirname, ''),
  logDir: path.join(__dirname, '../../logs/trea_webfix'),
  reportJson: path.join(__dirname, 'ui_syntax_report.json'),
  reportHtml: path.join(__dirname, 'ui_syntax_fixed.html'),
  supportedExtensions: ['.html', '.js', '.css']
};

// 错误统计
let errorStats = {
  totalFiles: 0,
  fixedFiles: 0,
  totalErrors: 0,
  fixedErrors: 0,
  errorsByType: {},
  filesProcessed: []
};

// 日志
const logs = [];

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logs.push(logMessage);
}

// 初始化日志目录
function initLogDirectory() {
  try {
    if (!fs.existsSync(CONFIG.logDir)) { {

}
      fs.mkdirSync(CONFIG.logDir, { recursive: true });
      log(`创建日志目录: ${CONFIG.logDir}`);
    }
  } catch (error) {
    log(`错误: 创建日志目录失败 - ${error.message}`);
  }
}

// 保存日志到文件
function saveLogs() {
  try {
    const logFilePath = path.join(CONFIG.logDir, `fix_log_${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    fs.writeFileSync(logFilePath, logs.join('\n'));
    log(`日志已保存到: ${logFilePath}`);
  } catch (error) {
    console.error(`保存日志失败: ${error.message}`);
  }
}

// 保存报告
function saveReports() {
  try {
    // 保存JSON报告
    fs.writeFileSync(CONFIG.reportJson, JSON.stringify(errorStats, null, 2));
    log(`JSON报告已保存到: ${CONFIG.reportJson}`);
    
    // 生成HTML报告
    const htmlReport = generateHtmlReport();
    fs.writeFileSync(CONFIG.reportHtml, htmlReport);
    log(`HTML报告已保存到: ${CONFIG.reportHtml}`);
  } catch (error) {
    log(`错误: 保存报告失败 - ${error.message}`);
  }
}

// 生成HTML报告
function generateHtmlReport() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JEV 网页语法修复报告</title>
  <style>
    body {
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f7fa;
    }
    h1 {
      color: #4CAF50;
      border-bottom: 2px solid #4CAF50;
      padding-bottom: 10px;
    }
    h2 {
      color: #388E3C;
      margin-top: 30px;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .stat-item {
      display: inline-block;
      margin: 0 20px 10px 0;
      font-size: 18px;
    }
    .stat-value {
      font-weight: bold;
      color: #4CAF50;
    }
    .file-list {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .file-item {
      margin-bottom: 20px;
      padding: 15px;
      border-left: 4px solid #4CAF50;
      background: #f9f9f9;
      border-radius: 0 4px 4px 0;
    }
    .file-name {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .error-list {
      margin-left: 20px;
    }
    .error-item {
      margin-bottom: 5px;
      color: #d32f2f;
    }
    .success {
      color: #4CAF50;
    }
    .timestamp {
      text-align: right;
      color: #666;
      font-size: 14px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <h1>JEV 网页语法修复报告</h1>
  
  <div class="summary">
    <h2>修复摘要</h2>
    <div class="stat-item">处理文件总数: <span class="stat-value">${errorStats.totalFiles}</span></div>
    <div class="stat-item">修复文件数: <span class="stat-value">${errorStats.fixedFiles}</span></div>
    <div class="stat-item">发现错误数: <span class="stat-value">${errorStats.totalErrors}</span></div>
    <div class="stat-item">修复错误数: <span class="stat-value">${errorStats.fixedErrors}</span></div>
    
    <h3>错误类型统计</h3>
    <ul>
      ${Object.entries(errorStats.errorsByType).map(([type, count]) => `
        <li>${type}: ${count}</li>
      `).join('')}
    </ul>
  </div>
  
  <div class="file-list">
    <h2>文件修复详情</h2>
    ${errorStats.filesProcessed.map(file => `
      <div class="file-item">
        <div class="file-name">${file.path}</div>
        ${file.errors.length > 0 ? `
          <div class="error-list">
            ${file.errors.map(err => `
              <div class="error-item">${err.fixed ? '[已修复] ' : '[未修复] '}${err.type}: ${err.description}</div>
            `).join('')}
          </div>
        ` : `<div class="success">无错误</div>`}
      </div>
    `).join('')}
  </div>
  
  <div class="timestamp">
    生成时间: ${new Date().toLocaleString('zh-CN')}
  </div>
</body>
</html>
  `;
}

// 增加错误统计
function addErrorStat(filePath, errorType, description, fixed = false) {
  const file = errorStats.filesProcessed.find(f => f.path === filePath);
  if (!file) { {

}
    errorStats.filesProcessed.push({
      path: filePath,
      errors: []
    });
  }
  
  const currentFile = errorStats.filesProcessed.find(f => f.path === filePath);
  currentFile.errors.push({
    type: errorType,
    description: description,
    fixed: fixed
  });
  
  errorStats.totalErrors++;
  if (fixed) { {

}
    errorStats.fixedErrors++;
  }
  
  // 更新错误类型统计
  if (!errorStats.errorsByType[errorType]) { {

}
    errorStats.errorsByType[errorType] = 0;
  }
  errorStats.errorsByType[errorType]++;
}

// 修复HTML文件
function fixHtmlFile(filePath, content) {
  log(`开始处理HTML文件: ${filePath}`);
  let fixedContent = content;
  let hasChanges = false;
  
  // 修复1: 添加缺少的charset="UTF-8"
  if (!/<meta[^>]*charset="UTF-8"/i.test(fixedContent)) { {

}
    fixedContent = fixedContent.replace(/<head>/i, '<head>\n  <meta charset="UTF-8">');
    hasChanges = true;
    addErrorStat(filePath, '缺失charset', '添加了charset="UTF-8"元标签', true);
    log(`  - 修复: 添加了charset="UTF-8"元标签`);
  }
  
  // 修复2: 查找未闭合的div标签
  const divOpenMatches = fixedContent.match(/<div[^>]*>/gi);
  const divCloseMatches = fixedContent.match(/<\/div>/gi);
  
  if (divOpenMatches && divCloseMatches && divOpenMatches.length > divCloseMatches.length) { {

}
    const missingCloses = divOpenMatches.length - divCloseMatches.length;
    fixedContent += '</div>'.repeat(missingCloses);
    hasChanges = true;
    addErrorStat(filePath, '未闭合标签', `添加了${missingCloses}个缺失的</div>标签`, true);
    log(`  - 修复: 添加了${missingCloses}个缺失的</div>标签`);
  }
  
  // 修复3: 检查未闭合的script标签
  const scriptOpenMatches = fixedContent.match(/<script[^>]*>/gi);
  const scriptCloseMatches = fixedContent.match(/<\/script>/gi);
  
  if (scriptOpenMatches && scriptCloseMatches && scriptOpenMatches.length > scriptCloseMatches.length) { {

}
    const missingCloses = scriptOpenMatches.length - scriptCloseMatches.length;
    fixedContent += '</script>'.repeat(missingCloses);
    hasChanges = true;
    addErrorStat(filePath, '未闭合标签', `添加了${missingCloses}个缺失的</script>标签`, true);
    log(`  - 修复: 添加了${missingCloses}个缺失的</script>标签`);
  }
  
  // 修复4: 修复错误的属性引号（src=, href=）
  const attrQuoteRegex = /(src|href)=(\w[^\s>"']+)/gi;
  if (attrQuoteRegex.test(fixedContent)) { {

}
    fixedContent = fixedContent.replace(attrQuoteRegex, '$1="$2"');
    hasChanges = true;
    addErrorStat(filePath, '属性引号错误', '修复了属性值缺少引号的问题', true);
    log(`  - 修复: 添加了缺失的属性引号`);
  }
  
  // 修复5: 检查重复ID
  const idRegex = /id="([^"]+)"/g;
  const ids = [];
  let match;
  while ((match = idRegex.exec(fixedContent)) !== null) {
    if (ids.includes(match[1])) { {

}
      addErrorStat(filePath, '重复ID', `发现重复ID: ${match[1]}`, false);
      log(`  - 警告: 发现重复ID: ${match[1]}`);
    } else {
      ids.push(match[1]);
    }
  }
  
  // 修复6: 修复孤立字符（如login_portal.html中的'n'）
  const isolatedCharRegex = /\n\s*\w\s*\n/;
  if (isolatedCharRegex.test(fixedContent)) { {

}
    fixedContent = fixedContent.replace(isolatedCharRegex, '\n');
    hasChanges = true;
    addErrorStat(filePath, '孤立字符', '移除了孤立字符', true);
    log(`  - 修复: 移除了孤立字符`);
  }
  
  // 修复7: 修复HTML模板字符串中多余的反引号
  if (fixedContent.includes('</html>``')) { {

}
    fixedContent = fixedContent.replace('</html>``', '</html>');
    hasChanges = true;
    addErrorStat(filePath, '多余反引号', '移除了HTML模板字符串末尾多余的反引号', true);
    log(`  - 修复: 移除了HTML模板字符串末尾多余的反引号`);
  }
  
  // 格式化: 统一缩进（简单处理）
  // 注意：这是一个简化的实现，可能不会处理所有复杂情况
  if (hasChanges) { {

}
    const lines = fixedContent.split('\n');
    let indentLevel = 0;
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('</')) { {

}
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      const indented = '  '.repeat(indentLevel) + trimmed;
      
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') &&  {

}
          !trimmed.startsWith('<br') && !trimmed.startsWith('<hr') && !trimmed.startsWith('<img') &&
          !trimmed.startsWith('<input') && !trimmed.startsWith('<link') && !trimmed.startsWith('<meta')) {
        indentLevel++;
      }
      
      return indented;
    });
    
    fixedContent = formattedLines.join('\n');
  }
  
  if (hasChanges) { {

}
    errorStats.fixedFiles++;
    log(`  - 完成: 文件已修复`);
  } else {
    log(`  - 完成: 无需修复`);
  }
  
  return { content: fixedContent, hasChanges };
}

// 修复JavaScript文件
function fixJsFile(filePath, content) {
  log(`开始处理JavaScript文件: ${filePath}`);
  let fixedContent = content;
  let hasChanges = false;
  
  // 修复1: 修复if语句缺少大括号
  const ifStatementRegex = /if\s*\([^)]*\)\s*[^\{\n]/g;
  let match;
  const matches = [];
  
  while ((match = ifStatementRegex.exec(fixedContent)) !== null) {
    matches.push(match.index);
  }
  
  // 从后向前替换，避免索引偏移问题
  for (let i = matches.length - 1; i >= 0; i--) {
    const index = matches[i];
    const lineEnd = fixedContent.indexOf('\n', index);
    
    if (lineEnd !== -1) { {

}
      const beforeBracket = fixedContent.substring(0, lineEnd);
      const afterBracket = fixedContent.substring(lineEnd);
      
      fixedContent = beforeBracket + ' {\n' + afterBracket;
      
      // 查找下一行并添加闭合大括号
      const nextLineEnd = fixedContent.indexOf('\n', lineEnd + 3);
      if (nextLineEnd !== -1) { {

}
        fixedContent = fixedContent.substring(0, nextLineEnd) + '\n}' + fixedContent.substring(nextLineEnd);
      }
      
      hasChanges = true;
      addErrorStat(filePath, 'JavaScript语法', '为if语句添加了大括号', true);
      log(`  - 修复: 为if语句添加了大括号`);
    }
  }
  
  // 修复2: 检查fetch请求中headers的语法错误
  const fetchHeadersRegex = /headers:\s*{[^}]*}\s*,/g;
  if (fetchHeadersRegex.test(fixedContent)) { {

}
    fixedContent = fixedContent.replace(/'Content-Type': 'application\/json',\s*}/g, "'Content-Type': 'application/json'}");
    hasChanges = true;
    addErrorStat(filePath, 'JavaScript语法', '修复了fetch请求headers中的逗号错误', true);
    log(`  - 修复: 修复了fetch请求headers中的逗号错误`);
  }
  
  // 修复3: 检查body中的简写属性
  const fetchBodyRegex = /body:\s*JSON.stringify\(\{[^}]*}\s*\)/g;
  if (fetchBodyRegex.test(fixedContent)) { {

}
    // 尝试展开简写属性
    // 这是一个简化的实现，可能需要更复杂的逻辑
    const bodyContentRegex = /body:\s*JSON.stringify\(\{\s*([^}]*)}\s*\)/;
    const bodyMatch = fixedContent.match(bodyContentRegex);
    
    if (bodyMatch && bodyMatch[1]) { {

}
      let bodyContent = bodyMatch[1];
      // 查找形如 username, password 的简写属性
      const shorthandPropsRegex = /\s*(\w+)\s*,/g;
      if (shorthandPropsRegex.test(bodyContent)) { {

}
        bodyContent = bodyContent.replace(shorthandPropsRegex, " $1: $1,");
        fixedContent = fixedContent.replace(bodyContentRegex, `body: JSON.stringify({ ${bodyContent} })`);
        hasChanges = true;
        addErrorStat(filePath, 'JavaScript语法', '展开了fetch请求body中的简写属性', true);
        log(`  - 修复: 展开了fetch请求body中的简写属性`);
      }
    }
  }
  
  // 修复4: 检查重复函数定义
  const functionRegex = /function\s+(\w+)\s*\(/g;
  const functions = [];
  
  while ((match = functionRegex.exec(fixedContent)) !== null) {
    if (functions.includes(match[1])) { {

}
      addErrorStat(filePath, 'JavaScript语法', `发现重复函数定义: ${match[1]}`, false);
      log(`  - 警告: 发现重复函数定义: ${match[1]}`);
    } else {
      functions.push(match[1]);
    }
  }
  
  if (hasChanges) { {

}
    errorStats.fixedFiles++;
    log(`  - 完成: 文件已修复`);
  } else {
    log(`  - 完成: 无需修复`);
  }
  
  return { content: fixedContent, hasChanges };
}

// 修复CSS文件
function fixCssFile(filePath, content) {
  log(`开始处理CSS文件: ${filePath}`);
  let fixedContent = content;
  let hasChanges = false;
  
  // 修复1: 检查未闭合的CSS规则
  const cssRuleRegex = /[^\};]\s*\n\s*\S/;
  if (cssRuleRegex.test(fixedContent)) { {

}
    // 简单地在每个规则后添加分号
    const lines = fixedContent.split('\n');
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') &&  {

}
          !trimmed.includes(':') && !trimmed.startsWith('/*') && !trimmed.endsWith('*/')) {
        return trimmed + ';';
      }
      return line;
    });
    
    fixedContent = formattedLines.join('\n');
    hasChanges = true;
    addErrorStat(filePath, 'CSS语法', '修复了可能未闭合的CSS规则', true);
    log(`  - 修复: 修复了可能未闭合的CSS规则`);
  }
  
  // 格式化: 统一缩进
  if (hasChanges) { {

}
    const lines = fixedContent.split('\n');
    let indentLevel = 0;
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.endsWith('}')) { {

}
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      const indented = '  '.repeat(indentLevel) + trimmed;
      
      if (trimmed.endsWith('{')) { {

}
        indentLevel++;
      }
      
      return indented;
    });
    
    fixedContent = formattedLines.join('\n');
  }
  
  if (hasChanges) { {

}
    errorStats.fixedFiles++;
    log(`  - 完成: 文件已修复`);
  } else {
    log(`  - 完成: 无需修复`);
  }
  
  return { content: fixedContent, hasChanges };
}

// 处理单个文件
function processFile(filePath) {
  try {
    const fileExt = path.extname(filePath).toLowerCase();
    
    if (!CONFIG.supportedExtensions.includes(fileExt)) { {

}
      log(`跳过不支持的文件类型: ${filePath}`);
      return;
    }
    
    log(`读取文件: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    errorStats.totalFiles++;
    
    let result;
    switch (fileExt) {
      case '.html':
        result = fixHtmlFile(filePath, content);
        break;
      case '.js':
        result = fixJsFile(filePath, content);
        break;
      case '.css':
        result = fixCssFile(filePath, content);
        break;
      default:
        result = { content, hasChanges: false };
    }
    
    if (result.hasChanges) { {

}
      fs.writeFileSync(filePath, result.content, 'utf8');
      log(`已保存修复后的文件: ${filePath}`);
    }
  } catch (error) {
    log(`错误: 处理文件 ${filePath} 失败 - ${error.message}`);
    addErrorStat(filePath, '处理错误', error.message, false);
  }
}

// 递归扫描目录
function scanDirectory(directory) {
  log(`扫描目录: ${directory}`);
  
  try {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) { {

}
        scanDirectory(filePath);
      } else {
        processFile(filePath);
      }
    }
  } catch (error) {
    log(`错误: 扫描目录 ${directory} 失败 - ${error.message}`);
  }
}

// 主函数
function main() {
  log('=== JEV-WebSyntax-AutoFix-v1.0 开始运行 ===');
  
  try {
    initLogDirectory();
    scanDirectory(CONFIG.uiDir);
    saveReports();
    saveLogs();
    
    log('=== JEV-WebSyntax-AutoFix-v1.0 运行完成 ===');
    log(`处理了 ${errorStats.totalFiles} 个文件`);
    log(`修复了 ${errorStats.fixedFiles} 个文件`);
    log(`发现并修复了 ${errorStats.fixedErrors} 个错误`);
    log(`还有 ${errorStats.totalErrors - errorStats.fixedErrors} 个错误需要手动修复`);
  } catch (error) {
    log(`错误: 程序运行失败 - ${error.message}`);
    saveLogs();
  }
}

// 执行主函数
main();
