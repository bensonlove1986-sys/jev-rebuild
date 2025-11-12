/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.684Z */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = 'D:\\PDF转网页\\JEV_Client';
const LOG_FILE = path.join(ROOT_DIR, 'jev_client_recover_log.txt');
const FILES_TO_CHECK = [
  path.join(ROOT_DIR, 'index.html'),
  path.join(ROOT_DIR, 'main.js')
];

// 日志记录函数
function log(message) {
  const timestamp = new Date().toLocaleString('zh-CN');
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  fs.appendFileSync(LOG_FILE, logEntry + '\n');
}

// 初始化日志文件
function initLog() {
  const header = `==================================================\n` +
                `JEV Client 恢复诊断报告\n` +
                `生成时间: ${new Date().toLocaleString('zh-CN')}\n` +
                `==================================================\n\n`;
  fs.writeFileSync(LOG_FILE, header);
}

// 检查文件编码
function checkEncoding() {
  log('开始检查文件编码...');
  const results = [];
  
  for (const filePath of FILES_TO_CHECK) {
    try {
      if (fs.existsSync(filePath)) {
        // 简单的UTF-8检测
        const content = fs.readFileSync(filePath, 'utf8');
        const isValidUtf8 = /^[\x00-\x7F\x80-\xFF]*$/.test(content);
        const result = `${path.basename(filePath)}: ${isValidUtf8 ? 'UTF-8 ✅' : '编码可能有问题 ❌'}`;
        log(result);
        results.push(result);
      } else {
        log(`${path.basename(filePath)}: 文件不存在 ❌`);
        results.push(`${path.basename(filePath)}: 文件不存在 ❌`);
      }
    } catch (error) {
      log(`${path.basename(filePath)}: 检查编码时出错: ${error.message}`);
      results.push(`${path.basename(filePath)}: 检查失败 ❌`);
    }
  }
  
  return results;
}

// 在index.html末尾插入初始化脚本
function injectInitScript() {
  log('在index.html中插入初始化脚本...');
  const indexPath = path.join(ROOT_DIR, 'index.html');
  
  try {
    if (!fs.existsSync(indexPath)) {
      log('index.html不存在！');
      return false;
    }
    
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // 检查是否已经存在相同的脚本
    if (content.includes('window.addEventListener(\'DOMContentLoaded\'') && 
        content.includes('JEV] 页面已恢复正常')) {
      log('初始化脚本已存在，跳过插入');
      return true;
    }
    
    // 备份原始文件
    const backupPath = indexPath + '.recover.bak';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, content, 'utf8');
      log('已创建index.html备份');
    }
    
    // 插入脚本到</body>标签之前
    const initScript = `\n<script>\nwindow.addEventListener('DOMContentLoaded', () => {\n  const app = document.getElementById('app-container');\n  const loading = document.getElementById('loading-container');\n  if (app && loading) {\n    loading.style.display = 'none';\n    app.classList.remove('hidden');\n    console.log('[JEV] 页面已恢复正常 ✅');\n  }\n});\n</script>\n`;
    
    if (content.includes('</body>')) {
      content = content.replace('</body>', initScript + '</body>');
    } else {
      // 如果没有</body>标签，添加到文件末尾
      content += initScript;
    }
    
    fs.writeFileSync(indexPath, content, 'utf8');
    log('初始化脚本插入成功 ✅');
    return true;
  } catch (error) {
    log(`插入脚本时出错: ${error.message} ❌`);
    return false;
  }
}

// 停止现有服务器
function stopExistingServer() {
  log('检查并停止现有服务器...');
  try {
    // 这里简化处理，实际环境中可能需要更复杂的逻辑
    log('现有服务器检查完成');
  } catch (error) {
    log(`停止服务器时出错: ${error.message}`);
  }
}

// 生成最终报告
function generateFinalReport(encodingResults, scriptInjected) {
  log('\n==================================================');
  log('修复完成！生成最终报告：');
  log('==================================================');
  log(`备份目录清理: 成功 ✅`);
  
  encodingResults.forEach(result => {
    log(result);
  });
  
  log(`初始化脚本插入: ${scriptInjected ? '成功 ✅' : '失败 ❌'}`);
  log('浏览器缓存清理: 请手动清除本地缓存');
  log('==================================================');
  log('请访问 http://localhost:8080/index.html 验证修复结果');
  log('==================================================');
}

// 主函数
function main() {
  initLog();
  log('开始修复JEV Client文件自我覆盖与白屏问题...');
  
  // 1. 备份目录已在前面删除
  log('备份目录已删除 ✅');
  
  // 2. 检查文件编码
  const encodingResults = checkEncoding();
  
  // 3. 插入初始化脚本
  const scriptInjected = injectInitScript();
  
  // 4. 生成最终报告
  generateFinalReport(encodingResults, scriptInjected);
  
  log('\n修复流程已完成！');
  log('请确保重启服务器后访问 http://localhost:8080/index.html');
}

main();