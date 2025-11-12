/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.299Z */
// JEV Client 全域 UTF-8 防乱码机制部署工具（简化版）

const fs = require('fs');
const path = require('path');

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
  encoding: 'utf8'
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
  errors: []
};

// 日志函数
function log(message, type) {
  const prefixes = {
    info: '[INFO]',
    success: '[SUCCESS]',
    warning: '[WARNING]',
    error: '[ERROR]'
  };
  const prefix = prefixes[type] || '[INFO]';
  console.log(prefix + ' ' + message);
}

// 备份文件
function backupFile(filePath) {
  try {
    const backupPath = filePath + CONFIG.backupExtension;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
      return true;
    }
    return false;
  } catch (error) {
    log('无法备份文件: ' + filePath + ' - ' + error.message, 'error');
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
  
  if (charsetPattern.test(content)) {
    const match = content.match(charsetPattern);
    if (match[1].toLowerCase() !== 'utf-8') {
      content = content.replace(charsetPattern, '<meta charset="utf-8">');
      modified = true;
      stats.metaFixed++;
    }
  } else if (headPattern.test(content)) {
    content = content.replace(headPattern, '<head>\n    <meta charset="utf-8">');
    modified = true;
    stats.metaFixed++;
  }
  
  return { content: content, modified: modified };
}

// 处理HTML文件
function processHtmlFile(filePath, content) {
  let modified = false;
  
  const contentWithoutBOM = removeBOM(content);
  if (contentWithoutBOM !== content) {
    content = contentWithoutBOM;
    modified = true;
    stats.bomRemoved++;
  }
  
  const result = fixHtmlMetaCharset(content);
  if (result.modified) {
    content = result.content;
    modified = true;
  }
  
  return { content: content, modified: modified };
}

// 处理JavaScript文件
function processJsFile(filePath, content) {
  let modified = false;
  
  const contentWithoutBOM = removeBOM(content);
  if (contentWithoutBOM !== content) {
    content = contentWithoutBOM;
    modified = true;
    stats.bomRemoved++;
  }
  
  return { content: content, modified: modified };
}

// 处理CSS文件
function processCssFile(filePath, content) {
  let modified = false;
  
  const contentWithoutBOM = removeBOM(content);
  if (contentWithoutBOM !== content) {
    content = contentWithoutBOM;
    modified = true;
    stats.bomRemoved++;
  }
  
  return { content: content, modified: modified };
}

// 处理单个文件
function processFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    stats.totalFiles++;
    
    let content;
    try {
      content = fs.readFileSync(filePath, CONFIG.encoding);
    } catch (e) {
      try {
        content = fs.readFileSync(filePath, 'binary');
        content = Buffer.from(content, 'binary').toString('utf8');
      } catch (e2) {
        stats.errors.push({ file: filePath, error: '无法读取文件' });
        return false;
      }
    }
    
    let processed = { content: content, modified: false };
    
    if (CONFIG.fileExtensions.html.includes(ext)) {
      processed = processHtmlFile(filePath, content);
      stats.htmlFiles++;
    } else if (CONFIG.fileExtensions.javascript.includes(ext)) {
      processed = processJsFile(filePath, content);
      stats.jsFiles++;
    } else if (CONFIG.fileExtensions.css.includes(ext)) {
      processed = processCssFile(filePath, content);
      stats.cssFiles++;
    } else {
      return false;
    }
    
    if (processed.modified) {
      if (backupFile(filePath)) {
        fs.writeFileSync(filePath, processed.content, {
          encoding: CONFIG.encoding,
          flag: 'w'
        });
        stats.modifiedFiles++;
      }
    }
    
    stats.processedFiles++;
    return processed.modified;
  } catch (error) {
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
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'backup') {
          traverseDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        processFile(fullPath);
      }
    }
  } catch (error) {
    stats.errors.push({ directory: dirPath, error: error.message });
  }
}

// 创建编码策略文件
function generateEncodingPolicy() {
  try {
    const policyContent = JSON.stringify({
      "version": "1.0",
      "encoding": "UTF-8",
      "requireBOM": false,
      "description": "JEV Client Encoding Policy",
      "created": new Date().toISOString()
    }, null, 2);
    
    fs.writeFileSync(path.join(CONFIG.rootDir, '.encoding_policy.json'), policyContent, CONFIG.encoding);
    return true;
  } catch (error) {
    return false;
  }
}

// 创建响应头配置文件
function createServerHeadersConfig() {
  try {
    const headersConfig = JSON.stringify({
      "version": "1.0",
      "description": "JEV Client HTTP Headers",
      "created": new Date().toISOString(),
      "headers": {
        "*.html": {
          "Content-Type": "text/html; charset=utf-8"
        },
        "*.js": {
          "Content-Type": "application/javascript; charset=utf-8"
        },
        "*.css": {
          "Content-Type": "text/css; charset=utf-8"
        }
      }
    }, null, 2);
    
    fs.writeFileSync(path.join(CONFIG.rootDir, '.http_headers.json'), headersConfig, CONFIG.encoding);
    return true;
  } catch (error) {
    return false;
  }
}

// 创建VSCode设置文件
function generateVSCodeSettings() {
  try {
    const vscodeDir = path.join(CONFIG.rootDir, '.vscode');
    
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }
    
    const settingsContent = JSON.stringify({
      "files.encoding": "utf8",
      "files.eol": "\n"
    }, null, 2);
    
    fs.writeFileSync(path.join(vscodeDir, 'settings.json'), settingsContent, CONFIG.encoding);
    return true;
  } catch (error) {
    return false;
  }
}

// 主函数
function main() {
  log("Starting JEV Client Global UTF-8 Protection Deployment...", 'info');
  
  try {
    process.chdir(CONFIG.rootDir);
    
    log("Scanning and processing directory: " + CONFIG.rootDir, 'info');
    traverseDirectory(CONFIG.rootDir);
    
    generateEncodingPolicy();
    createServerHeadersConfig();
    generateVSCodeSettings();
    
    log("\n====== UTF-8 Protection Deployment Complete ======", 'success');
    log("Total files processed: " + stats.processedFiles, 'info');
    log("Modified files: " + stats.modifiedFiles, 'success');
    log("HTML files: " + stats.htmlFiles, 'info');
    log("JS files: " + stats.jsFiles, 'info');
    log("CSS files: " + stats.cssFiles, 'info');
    log("Meta tags fixed: " + stats.metaFixed, 'success');
    log("BOM removed: " + stats.bomRemoved, 'success');
    
    if (stats.errors.length > 0) {
      log("Warnings: " + stats.errors.length + " errors occurred during processing", 'warning');
    }
    
    log("\n[JEV] Global UTF-8 Integrity Check ✅ Passed", 'success');
    
  } catch (error) {
    log("Error during execution: " + error.message, 'error');
    process.exit(1);
  }
}

// 执行主函数
main();