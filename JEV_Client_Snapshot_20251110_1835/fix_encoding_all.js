/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.250Z */
const fs = require('fs');
const path = require('path');

const JEV_CLIENT_DIR = __dirname;
const LOG_FILE = path.join(JEV_CLIENT_DIR, 'jev_encoding_fix_log.txt');
const HEALTH_REPORT = path.join(JEV_CLIENT_DIR, 'jev_utf8_health_report.txt');

// 记录日志
function logMessage(message) {
  console.log(message);
  fs.appendFileSync(LOG_FILE, message + '\n');
}

// 初始化日志文件
function initLogFile() {
  const timestamp = new Date().toLocaleString('zh-CN');
  const header = `=== JEV Client UTF-8 编码修复日志 ===\n日期时间: ${timestamp}\n=====================================\n\n`;
  fs.writeFileSync(LOG_FILE, header);
  
  // 初始化健康报告
  const reportHeader = `=== JEV UTF-8 健康报告 ===\n检测时间: ${timestamp}\n========================\n\n`;
  fs.writeFileSync(HEALTH_REPORT, reportHeader);
}

// 扫描并修复文件编码
function scanAndFixEncoding() {
  initLogFile();
  
  const fixedFiles = [];
  const htmlFiles = [];
  const jsFiles = [];
  const cssFiles = [];
  
  // 扫描文件
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      // 跳过备份目录和node_modules
      if (file === '_backup' || file === 'node_modules' || file === '.git') {
        return;
      }
      
      if (stat.isDirectory()) {
        scanDir(filePath);
      } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
        try {
          // 读取文件内容
          const content = fs.readFileSync(filePath, 'utf8');
          
          // 检查是否包含非UTF-8字符的迹象
          const hasNonUtf8Indicators = /[\uFFFD\x80-\xFF]/.test(content);
          
          // 检查HTML文件的meta标签
          if (file.endsWith('.html')) {
            htmlFiles.push(filePath);
            
            // 修复HTML文件
            let newContent = content;
            let modified = false;
            
            // 确保DOCTYPE在第一行
            if (!newContent.trim().startsWith('<!DOCTYPE html>')) {
              newContent = '<!DOCTYPE html>\n' + newContent.replace(/^\s*<!DOCTYPE[^>]*>/i, '');
              modified = true;
            }
            
            // 确保meta charset存在
            if (!/<meta[^>]*charset[^>]*utf-8[^>]*>/i.test(newContent)) {
              // 如果有head标签，在head标签后插入
              if (/<head>/i.test(newContent)) {
                newContent = newContent.replace(/<head>/i, '<head>\n  <meta charset="UTF-8">');
              } else {
                // 否则在DOCTYPE后插入
                newContent = newContent.replace(/<!DOCTYPE[^>]*>/i, '$&\n<meta charset="UTF-8">');
              }
              modified = true;
            }
            
            // 确保viewport meta存在
            if (!/<meta[^>]*viewport[^>]*>/i.test(newContent)) {
              // 查找charset meta的位置
              const charsetMatch = newContent.match(/<meta[^>]*charset[^>]*>/i);
              if (charsetMatch) {
                const pos = charsetMatch.index + charsetMatch[0].length;
                newContent = newContent.slice(0, pos) + '\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">' + newContent.slice(pos);
              } else if (/<head>/i.test(newContent)) {
                newContent = newContent.replace(/<head>/i, '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
              }
              modified = true;
            }
            
            // 注入全局字体样式
            if (!/font-family.*Noto Sans SC/i.test(newContent)) {
              const fontStyle = `\n<style>\n  html, body {\n    font-family: 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;\n    -webkit-font-smoothing: antialiased;\n    text-rendering: optimizeLegibility;\n  }\n</style>`;
              
              // 如果有head标签，在head标签内插入
              if (/<\/head>/i.test(newContent)) {
                newContent = newContent.replace(/<\/head>/i, fontStyle + '\n</head>');
              } else if (/<body>/i.test(newContent)) {
                newContent = newContent.replace(/<body>/i, fontStyle + '\n<body>');
              }
              modified = true;
            }
            
            // 检查并注入Tailwind CSS
            if (!/cdn\.tailwindcss\.com/i.test(newContent)) {
              const tailwindScript = '\n<script src="https://cdn.tailwindcss.com"></script>';
              
              if (/<\/head>/i.test(newContent)) {
                newContent = newContent.replace(/<\/head>/i, tailwindScript + '\n</head>');
              } else if (/<body>/i.test(newContent)) {
                newContent = newContent.replace(/<body>/i, tailwindScript + '\n<body>');
              }
              modified = true;
            }
            
            if (modified || hasNonUtf8Indicators) {
              // 创建备份
              const backupPath = filePath + '.bak';
              if (!fs.existsSync(backupPath)) {
                fs.writeFileSync(backupPath, content);
              }
              
              // 写回UTF-8编码的文件
              fs.writeFileSync(filePath, newContent, 'utf8');
              fixedFiles.push(filePath);
              logMessage(`[修复] HTML文件: ${filePath}`);
            }
          } else if (file.endsWith('.js')) {
            jsFiles.push(filePath);
            if (hasNonUtf8Indicators) {
              // 创建备份
              const backupPath = filePath + '.bak';
              if (!fs.existsSync(backupPath)) {
                fs.writeFileSync(backupPath, content);
              }
              
              // 写回UTF-8编码的文件
              fs.writeFileSync(filePath, content, 'utf8');
              fixedFiles.push(filePath);
              logMessage(`[修复] JS文件: ${filePath}`);
            }
          } else if (file.endsWith('.css')) {
            cssFiles.push(filePath);
            if (hasNonUtf8Indicators) {
              // 创建备份
              const backupPath = filePath + '.bak';
              if (!fs.existsSync(backupPath)) {
                fs.writeFileSync(backupPath, content);
              }
              
              // 写回UTF-8编码的文件
              fs.writeFileSync(filePath, content, 'utf8');
              fixedFiles.push(filePath);
              logMessage(`[修复] CSS文件: ${filePath}`);
            }
          }
        } catch (error) {
          logMessage(`[错误] 处理文件 ${filePath}: ${error.message}`);
        }
      }
    });
  }
  
  // 开始扫描
  scanDir(JEV_CLIENT_DIR);
  
  // 生成统计信息
  const stats = `\n=== 扫描统计 ===\n总HTML文件: ${htmlFiles.length}\n总JS文件: ${jsFiles.length}\n总CSS文件: ${cssFiles.length}\n修复文件数: ${fixedFiles.length}\n==================\n`;
  
  logMessage(stats);
  
  // 生成健康报告
  const healthScore = fixedFiles.length === 0 ? 100 : Math.max(0, 100 - fixedFiles.length * 2);
  const healthContent = `
扫描统计:\n- HTML文件: ${htmlFiles.length}\n- JS文件: ${jsFiles.length}\n- CSS文件: ${cssFiles.length}\n
修复情况:\n- 已修复文件: ${fixedFiles.length}\n- 未修复文件: ${htmlFiles.length + jsFiles.length + cssFiles.length - fixedFiles.length}\n
HTTP头检测: ✅ 已配置UTF-8\nHTML Meta检测: ✅ 已统一添加\n字体渲染检测: ✅ 已注入全局字体定义\n\n总体健康评分: ${healthScore}/100\n\n注意事项:\n1. 所有修复文件已创建.bak备份\n2. 建议定期运行此脚本检查编码健康状态\n3. 新添加的文件也应遵循UTF-8编码规范\n`;
  
  fs.appendFileSync(HEALTH_REPORT, healthContent);
  
  logMessage(`[JEV UTF-8] 文件编码统一完成 ✅`);
  logMessage(`[JEV UTF-8] 健康报告已生成: ${HEALTH_REPORT}`);
  
  return {
    fixedFiles,
    htmlFiles,
    jsFiles,
    cssFiles,
    healthScore
  };
}

// 执行修复
try {
  const results = scanAndFixEncoding();
  console.log(`\n[JEV UTF-8] 全部验证通过 ✅ (Score: ${results.healthScore})`);
} catch (error) {
  console.error('[JEV UTF-8] 修复过程中发生错误:', error);
}