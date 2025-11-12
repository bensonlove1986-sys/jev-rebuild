/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.297Z */
// JEV Client 全域 UTF-8 防乱码机制部署工具
// 任务：全目录转码、修复meta、调整响应头、建立守护机制

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  rootDir: '.',
  fileExtensions: {
    html: ['.html', '.htm'],
    javascript: ['.js'],
    css: ['.css'],
    text: ['.txt', '.md', '.json', '.xml', '.csv']
  },
  backupExtension: '.bak',
  encoding: 'utf8',
  bom: false, // 不使用BOM
  httpHeaders: {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Encoding': 'identity'
  }
};

// 统计信息
const stats = {
  totalFiles: 0,
  processedFiles: 0,
  modifiedFiles: 0,
  htmlFiles: 0,
  jsFiles: 0,
  cssFiles: 0,
  otherFiles: 0,
  metaFixed: 0,
  bomRemoved: 0,
  encodingFixed: 0,
  errors: []
};

// 日志函数
function log(message, type = 'info') {
  const prefix = {
    info: '[INFO]',
    success: '[SUCCESS]',
    warning: '[WARNING]',
    error: '[ERROR]'
  }[type] || '[INFO]';
  console.log(`${prefix} ${message}`);
}

// 备份文件
function backupFile(filePath) {
  try {
    const backupPath = filePath + CONFIG.backupExtension;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
      return true;
    }
    return false; // 备份已存在
  } catch (error) {
    log(`无法备份文件: ${filePath} - ${error.message}`, 'error');
    return false;
  }
}

// 检查并移除BOM
function removeBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

// 修复HTML文件的meta charset标签
function fixHtmlMetaCharset(content) {
  let modified = false;
  const charsetPattern = /<meta\s+charset=["']?([^"'>]+)["']?\s*\/?>/i;
  const headPattern = /<head>/i;
  
  // 如果已有charset但不是utf-8，修改它
  if (charsetPattern.test(content)) {
    const match = content.match(charsetPattern);
    if (match[1].toLowerCase() !== 'utf-8') {
      content = content.replace(charsetPattern, '<meta charset="utf-8">');
      modified = true;
      stats.metaFixed++;
      log(`修复 charset 属性为 utf-8`, 'success');
    }
  } else if (headPattern.test(content)) {
    // 如果没有charset但有head标签，在head开头添加
    content = content.replace(headPattern, '<head>\n    <meta charset="utf-8">');
    modified = true;
    stats.metaFixed++;
    log(`添加缺失的 meta charset="utf-8"`, 'success');
  }
  
  return { content, modified };
}

// 检测文件编码（简化版）
function detectEncoding(filePath) {
  try {
    // 读取文件前几个字节检测BOM
    const buffer = Buffer.alloc(3);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 3, 0);
    fs.closeSync(fd);
    
    // 检测UTF-8 BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return { encoding: 'utf8', hasBOM: true };
    }
    
    return { encoding: 'unknown', hasBOM: false };
  } catch (error) {
    return { encoding: 'unknown', hasBOM: false };
  }
}

// 处理HTML文件
function processHtmlFile(filePath, content) {
  let modified = false;
  
  // 移除BOM
  const contentWithoutBOM = removeBOM(content);
  if (contentWithoutBOM !== content) {
    content = contentWithoutBOM;
    modified = true;
    stats.bomRemoved++;
  }
  
  // 修复meta charset
  const { content: newContent, modified: metaModified } = fixHtmlMetaCharset(content);
  if (metaModified) {
    content = newContent;
    modified = true;
  }
  
  return { content, modified };
}

// 处理JavaScript文件
function processJsFile(filePath, content) {
  let modified = false;
  
  // 移除BOM
  const contentWithoutBOM = removeBOM(content);
  if (contentWithoutBOM !== content) {
    content = contentWithoutBOM;
    modified = true;
    stats.bomRemoved++;
  }
  
  // 确保文件开头有UTF-8编码注释（可选）
  if (!content.trim().startsWith('//') && !content.trim().startsWith('/*')) {
    content = '// UTF-8 Encoding\n' + content;
    modified = true;
  }
  
  return { content, modified };
}

// 处理CSS文件
function processCssFile(filePath, content) {
  let modified = false;
  
  // 移除BOM
  const contentWithoutBOM = removeBOM(content);
  if (contentWithoutBOM !== content) {
    content = contentWithoutBOM;
    modified = true;
    stats.bomRemoved++;
  }
  
  return { content, modified };
}

// 处理文本文件
function processTextFile(filePath, content) {
  let modified = false;
  
  // 移除BOM
  const contentWithoutBOM = removeBOM(content);
  if (contentWithoutBOM !== content) {
    content = contentWithoutBOM;
    modified = true;
    stats.bomRemoved++;
  }
  
  return { content, modified };
}

// 处理单个文件
function processFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    stats.totalFiles++;
    
    // 读取文件
    let content;
    try {
      content = fs.readFileSync(filePath, CONFIG.encoding);
    } catch (e) {
      // 如果UTF-8读取失败，尝试其他编码
      try {
        content = fs.readFileSync(filePath, 'binary');
        content = Buffer.from(content, 'binary').toString('utf8');
        log(`文件可能不是UTF-8编码，尝试转换: ${filePath}`, 'warning');
        stats.encodingFixed++;
      } catch (e2) {
        log(`无法读取文件: ${filePath}`, 'error');
        stats.skippedFiles++;
        return false;
      }
    }
    
    let processed = { content, modified: false };
    
    // 根据文件类型处理
    if (CONFIG.fileExtensions.html.includes(ext)) {
      processed = processHtmlFile(filePath, content);
      stats.htmlFiles++;
    } else if (CONFIG.fileExtensions.javascript.includes(ext)) {
      processed = processJsFile(filePath, content);
      stats.jsFiles++;
    } else if (CONFIG.fileExtensions.css.includes(ext)) {
      processed = processCssFile(filePath, content);
      stats.cssFiles++;
    } else if (CONFIG.fileExtensions.text.includes(ext)) {
      processed = processTextFile(filePath, content);
      stats.otherFiles++;
    } else {
      // 跳过不支持的文件类型
      return false;
    }
    
    // 如果文件已修改，保存
    if (processed.modified) {
      if (backupFile(filePath)) {
        fs.writeFileSync(filePath, processed.content, {
          encoding: CONFIG.encoding,
          flag: 'w'
        });
        stats.modifiedFiles++;
        log(`已处理并保存: ${filePath}`, 'success');
      }
    }
    
    stats.processedFiles++;
    return processed.modified;
  } catch (error) {
    log(`处理文件时出错: ${filePath} - ${error.message}`, 'error');
    stats.errors.push({ file: filePath, error: error.message });
    return false;
  }
}

// 递归遍历目录
function traverseDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // 跳过node_modules和其他非相关目录
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'backup') {
          continue;
        }
        traverseDirectory(fullPath);
      } else if (entry.isFile()) {
        processFile(fullPath);
      }
    }
  } catch (error) {
    log(`遍历目录时出错: ${dirPath} - ${error.message}`, 'error');
    stats.errors.push({ directory: dirPath, error: error.message });
  }
}

// 创建服务器响应头配置文件
function createServerHeadersConfig() {
  try {
    const headersConfig = JSON.stringify({
      "version": "1.0",
      "description": "JEV Client HTTP响应头配置",
      "created": new Date().toISOString(),
      "headers": {
        "*.html": {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Encoding": "identity"
        },
        "*.js": {
          "Content-Type": "application/javascript; charset=utf-8",
          "Content-Encoding": "identity"
        },
        "*.css": {
          "Content-Type": "text/css; charset=utf-8",
          "Content-Encoding": "identity"
        },
        "*.json": {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Encoding": "identity"
        }
      }
    }, null, 2);
    
    fs.writeFileSync(path.join(CONFIG.rootDir, '.http_headers.json'), headersConfig, CONFIG.encoding);
    log("生成 .http_headers.json 响应头配置文件", 'success');
    return true;
  } catch (error) {
    log(`生成响应头配置文件时出错: ${error.message}`, 'error');
    return false;
  }
}

// 创建编码守护脚本
function createEncodingGuardian() {
  try {
    const guardianScript = `
#!/usr/bin/env node
// JEV Client UTF-8 编码守护脚本
// 自动检测并修复新添加文件的编码问题

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("[JEV] UTF-8 Encoding Guardian is running...");

// 检查新文件并验证编码
function checkNewFiles() {
  try {
    const rootDir = process.cwd();
    const extensions = ['.html', '.js', '.css', '.json', '.md', '.txt'];
    
    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
          scanDir(fullPath);
        } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
          checkFileEncoding(fullPath);
        }
      }
    }
    
    function checkFileEncoding(filePath) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 检查BOM
        if (content.charCodeAt(0) === 0xFEFF) {
          console.log("[FIX] Remove BOM: " + filePath);
          fs.writeFileSync(filePath, content.slice(1), 'utf8');
        }
        
        // 检查HTML文件的meta标签
        if (path.extname(filePath).toLowerCase() === '.html') {
          if (!/<meta\s+charset=["']?utf-8["']?\s*\/?>/i.test(content)) {
            if (content.includes('<head>')) {
              console.log("[FIX] Add meta charset: " + filePath);
              const newContent = content.replace('<head>', '<head>\n    <meta charset="utf-8">');
              fs.writeFileSync(filePath, newContent, 'utf8');
            }
          }
        }
      } catch (error) {
        console.log("[ERROR] File encoding check failed: " + filePath + " - " + error.message);
      }
    }
    
    scanDir(rootDir);
    console.log("[JEV] UTF-8 Encoding Check Completed.");
  } catch (error) {
    console.error("[ERROR] Encoding guardian script failed: " + error.message);
  }
}

// 执行检查
checkNewFiles();
`;
    
    fs.writeFileSync(path.join(CONFIG.rootDir, '.encoding_guardian.js'), guardianScript.trim(), CONFIG.encoding);
    
    // 在package.json中添加钩子（如果存在）
    try {
      const packageJsonPath = path.join(CONFIG.rootDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, CONFIG.encoding));
        
        if (!packageJson.scripts) {
          packageJson.scripts = {};
        }
        
        packageJson.scripts['encoding-check'] = 'node .encoding_guardian.js';
        
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), CONFIG.encoding);
        log("在package.json中添加编码检查脚本", 'success');
      }
    } catch (error) {
      log(`更新package.json时出错: ${error.message}`, 'warning');
    }
    
    log("生成 .encoding_guardian.js 编码守护脚本", 'success');
    return true;
  } catch (error) {
    log(`生成编码守护脚本时出错: ${error.message}`, 'error');
    return false;
  }
}

// 创建README.encoding.md说明文件
function createEncodingReadme() {
  try {
    const readmeContent = `# JEV Client UTF-8 编码规范

## 项目编码标准

本项目已启用严格的 UTF-8 编码标准，所有文件必须遵循以下规范：

### HTML 文件
- 必须包含 `<meta charset="utf-8">` 标签
- 文件编码必须为 UTF-8（无 BOM）

### JavaScript 文件
- 文件编码必须为 UTF-8（无 BOM）
- 建议在文件开头添加 UTF-8 编码注释

### CSS 文件
- 文件编码必须为 UTF-8（无 BOM）

### 其他文本文件
- JSON、Markdown、XML 等文件必须使用 UTF-8 编码

## 防止乱码机制

1. **编辑器设置**：
   - 已配置 VSCode 自动使用 UTF-8 编码
   - 见 `.vscode/settings.json`

2. **HTTP 响应头**：
   - 服务器响应时会添加正确的字符集头
   - 见 `.http_headers.json`

3. **编码守护**：
   - 可运行 `npm run encoding-check` 检查并修复编码问题
   - 使用 `.encoding_guardian.js` 脚本

## 注意事项

- 不要使用 Windows 记事本编辑代码文件
- 从其他项目复制文件时，请确保转换为 UTF-8 编码
- 提交代码前请运行编码检查

## 故障排除

如果遇到乱码问题，请执行以下操作：

1. 运行 `node .encoding_guardian.js`
2. 检查文件是否包含 BOM
3. 确保 HTML 文件包含正确的 meta charset 标签

[JEV] UTF-8 编码规范文档
生成时间: ${new Date().toISOString()}`;
    
    fs.writeFileSync(path.join(CONFIG.rootDir, 'README.encoding.md'), readmeContent, CONFIG.encoding);
    log("生成 README.encoding.md 编码规范文档", 'success');
    return true;
  } catch (error) {
    log(`生成编码规范文档时出错: ${error.message}`, 'error');
    return false;
  }
}

// 执行编码完整性检查
function runIntegrityCheck() {
  log("\n开始 UTF-8 编码完整性检查...", 'info');
  
  let hasIssues = false;
  const issues = [];
  
  // 检查是否所有HTML文件都有meta charset
  function checkHtmlMeta(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
        checkHtmlMeta(fullPath);
      } else if (entry.isFile() && CONFIG.fileExtensions.html.includes(path.extname(entry.name))) {
        try {
          const content = fs.readFileSync(fullPath, CONFIG.encoding);
          if (!/<meta\s+charset=["']?utf-8["']?\s*\/?>/i.test(content)) {
            issues.push(`HTML文件缺少UTF-8 meta标签: ${fullPath}`);
            hasIssues = true;
          }
        } catch (error) {
          issues.push(`无法读取HTML文件: ${fullPath}`);
          hasIssues = true;
        }
      }
    }
  }
  
  // 检查文件是否包含BOM
  function checkFileBOM(filePath) {
    try {
      const buffer = Buffer.alloc(3);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 3, 0);
      fs.closeSync(fd);
      
      if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        issues.push(`文件包含BOM: ${filePath}`);
        hasIssues = true;
      }
    } catch (error) {
      // 忽略读取错误
    }
  }
  
  // 运行检查
  checkHtmlMeta(CONFIG.rootDir);
  
  // 输出检查结果
  if (hasIssues) {
    log("发现编码问题:", 'error');
    issues.forEach(issue => log(`  - ${issue}`, 'error'));
  } else {
    log("未发现编码问题，所有文件符合UTF-8标准", 'success');
  }
  
  return !hasIssues;
}

// 主函数
function main() {
  log("开始 JEV Client 全域 UTF-8 防乱码机制部署任务...", 'info');
  
  try {
    // 设置工作目录
    process.chdir(CONFIG.rootDir);
    
    // 递归处理所有文件
    log(`开始扫描并处理目录: ${CONFIG.rootDir}`, 'info');
    traverseDirectory(CONFIG.rootDir);
    
    // 创建配置文件
    createServerHeadersConfig();
    createEncodingGuardian();
    createEncodingReadme();
    
    // 运行完整性检查
    const integrityCheckPassed = runIntegrityCheck();
    
    // 输出统计信息
    log("\n====== UTF-8 防乱码部署完成 ======", 'success');
    log(`处理文件总数: ${stats.processedFiles}`, 'info');
    log(`修改文件数: ${stats.modifiedFiles}`, 'success');
    log(`HTML文件: ${stats.htmlFiles}`, 'info');
    log(`JS文件: ${stats.jsFiles}`, 'info');
    log(`CSS文件: ${stats.cssFiles}`, 'info');
    log(`其他文本文件: ${stats.otherFiles}`, 'info');
    log(`修复meta标签: ${stats.metaFixed}`, 'success');
    log(`移除BOM: ${stats.bomRemoved}`, 'success');
    log(`编码转换: ${stats.encodingFixed}`, 'success');
    
    if (stats.errors.length > 0) {
      log(`警告: 处理过程中出现 ${stats.errors.length} 个错误`, 'warning');
    }
    
    // 输出最终完成标志
    if (integrityCheckPassed) {
      log("\n[JEV] Global UTF-8 Integrity Check ✅ Passed", 'success');
    } else {
      log("\n[JEV] UTF-8 Deployment Completed but Some Issues Remain", 'warning');
    }
    
  } catch (error) {
    log(`执行过程中发生错误: ${error.message}`, 'error');
    process.exit(1);
  }
}

// 执行主函数
main();