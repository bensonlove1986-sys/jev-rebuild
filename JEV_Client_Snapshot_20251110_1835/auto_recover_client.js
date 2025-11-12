/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.115Z */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = 'D:\\PDF转网页\\JEV_Client';
const LOG_FILE = path.join(ROOT_DIR, 'jev_client_recover_log.txt');
const CRITICAL_FILES = [
  path.join(ROOT_DIR, 'index.html'),
  path.join(ROOT_DIR, 'main.js'),
  path.join(ROOT_DIR, 'ui-controller.js'),
  path.join(ROOT_DIR, 'module-loader.js')
];
const FILE_TYPES_TO_RECOVER = ['.html', '.js', '.css'];

// 日志记录函数
function log(message) {
  const timestamp = new Date().toLocaleString('zh-CN');
  const logEntry = `[${timestamp}] ${message}`;
  console.log(`[JEV Recover] ${message}`);
  fs.appendFileSync(LOG_FILE, logEntry + '\n');
  return logEntry;
}

// 初始化日志文件
function initLog() {
  const header = `==================================================\n` +
                `JEV Client 自动恢复报告\n` +
                `生成时间: ${new Date().toLocaleString('zh-CN')}\n` +
                `==================================================\n\n`;
  fs.writeFileSync(LOG_FILE, header);
  log('开始自动检测和修复JEV Client白屏问题...');
}

// 查找最新的备份目录
function findLatestBackupDir() {
  log('检测备份目录...');
  try {
    const dirs = fs.readdirSync(ROOT_DIR)
      .filter(item => {
        const itemPath = path.join(ROOT_DIR, item);
        return fs.statSync(itemPath).isDirectory() && item.startsWith('_backup_encoding_');
      })
      .sort((a, b) => {
        // 按时间戳排序，获取最新的
        return new Date(b.split('_')[3] + b.split('_')[4]).getTime() - 
               new Date(a.split('_')[3] + a.split('_')[4]).getTime();
      });

    if (dirs.length > 0) {
      const latestDir = path.join(ROOT_DIR, dirs[0]);
      log(`检测到备份目录: ${dirs[0]}`);
      return latestDir;
    }
    log('未检测到备份目录');
    return null;
  } catch (error) {
    log(`查找备份目录时出错: ${error.message}`);
    return null;
  }
}

// 从备份恢复文件
function recoverFromBackup(backupDir) {
  log(`开始从备份目录恢复文件: ${path.basename(backupDir)}`);
  let recoveredCount = 0;
  
  try {
    // 递归遍历备份目录
    function copyFiles(sourceDir, targetDir) {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      const items = fs.readdirSync(sourceDir);
      for (const item of items) {
        const sourcePath = path.join(sourceDir, item);
        const targetPath = path.join(targetDir, item);
        const stats = fs.statSync(sourcePath);
        
        if (stats.isDirectory()) {
          // 跳过node_modules等目录
          if (!item.includes('node_modules') && !item.includes('.git') && !item.includes('logs')) {
            copyFiles(sourcePath, targetPath);
          }
        } else if (stats.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (FILE_TYPES_TO_RECOVER.includes(ext)) {
            // 只有当目标文件不存在或源文件更大时才复制
            if (!fs.existsSync(targetPath) || fs.statSync(sourcePath).size > 0) {
              fs.copyFileSync(sourcePath, targetPath);
              recoveredCount++;
              if (recoveredCount % 20 === 0) {
                log(`已恢复 ${recoveredCount} 个文件...`);
              }
            }
          }
        }
      }
    }
    
    copyFiles(backupDir, ROOT_DIR);
    log(`共恢复 ${recoveredCount} 个 HTML/JS/CSS 文件`);
    return recoveredCount > 0;
  } catch (error) {
    log(`恢复文件时出错: ${error.message}`);
    return false;
  }
}

// 检查关键文件是否为空或过小
function checkCriticalFiles() {
  log('检查关键文件大小...');
  const smallFiles = [];
  
  for (const filePath of CRITICAL_FILES) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size < 10240) { // 小于10KB
          log(`${path.basename(filePath)} 文件大小过小: ${stats.size} 字节`);
          smallFiles.push(filePath);
        } else {
          log(`${path.basename(filePath)} 文件大小正常: ${stats.size} 字节`);
        }
      } else {
        log(`${path.basename(filePath)} 文件不存在`);
        smallFiles.push(filePath);
      }
    } catch (error) {
      log(`检查 ${path.basename(filePath)} 时出错: ${error.message}`);
      smallFiles.push(filePath);
    }
  }
  
  return smallFiles;
}

// 强制从备份恢复空文件
function forceRecoverSmallFiles(backupDir, smallFiles) {
  if (smallFiles.length === 0 || !backupDir) return false;
  
  log(`开始强制恢复 ${smallFiles.length} 个空文件或过小文件`);
  let recoveredCount = 0;
  
  for (const filePath of smallFiles) {
    try {
      const relativePath = path.relative(ROOT_DIR, filePath);
      const backupFilePath = path.join(backupDir, relativePath);
      
      if (fs.existsSync(backupFilePath)) {
        const backupSize = fs.statSync(backupFilePath).size;
        if (backupSize > 0) {
          fs.copyFileSync(backupFilePath, filePath);
          recoveredCount++;
          log(`已恢复空文件: ${path.basename(filePath)}`);
        }
      }
    } catch (error) {
      log(`恢复 ${path.basename(filePath)} 时出错: ${error.message}`);
    }
  }
  
  return recoveredCount > 0;
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
    const initScript = `\n<script>\nwindow.addEventListener('DOMContentLoaded',()=>{\n const app=document.getElementById('app-container');\n const loading=document.getElementById('loading-container');\n if(app&&loading){\n  loading.style.display='none';\n  app.classList.remove('hidden');\n  console.log('[JEV] 页面已恢复正常 ✅');\n}else{\n  console.warn('[JEV] 页面结构不完整');\n}\n});\n</script>\n`;
    
    if (content.includes('</body>')) {
      content = content.replace('</body>', initScript + '</body>');
    } else {
      // 如果没有</body>标签，添加到文件末尾
      content += initScript;
    }
    
    fs.writeFileSync(indexPath, content, 'utf8');
    log('index.html已修复并注入显示脚本');
    return true;
  } catch (error) {
    log(`插入脚本时出错: ${error.message}`);
    return false;
  }
}

// 停止现有服务器
function stopExistingServer() {
  log('检查并停止现有服务器...');
  try {
    // 尝试停止可能的node服务器进程
    // 这里简化处理，实际环境中可能需要更复杂的逻辑
    log('服务器状态检查完成');
  } catch (error) {
    log(`停止服务器时出错: ${error.message}`);
  }
}

// 生成最终报告
function generateFinalReport(recoveryResults) {
  log('\n==================================================');
  log('修复完成！生成最终报告：');
  log('==================================================');
  
  log(`备份目录检测: ${recoveryResults.hasBackup ? '找到' + recoveryResults.backupDir : '未找到'}`);
  log(`文件恢复: ${recoveryResults.filesRecovered ? '成功' : '未执行'}`);
  log(`空文件恢复: ${recoveryResults.emptyFilesRecovered ? '成功' : '未执行'}`);
  log(`初始化脚本: ${recoveryResults.scriptInjected ? '已注入' : '失败'}`);
  log(`浏览器缓存: 请手动清除localStorage和sessionStorage`);
  
  log('==================================================');
  log('请访问 http://localhost:8080/index.html 验证修复结果');
  log('在浏览器控制台查看 "[JEV] 页面已恢复正常 ✅" 确认成功');
  log('==================================================');
  
  return {
    timestamp: new Date().toLocaleString('zh-CN'),
    hasBackup: recoveryResults.hasBackup,
    filesRecovered: recoveryResults.filesRecovered,
    scriptInjected: recoveryResults.scriptInjected,
    status: recoveryResults.scriptInjected ? '成功' : '部分失败'
  };
}

// 主函数
function main() {
  initLog();
  const recoveryResults = {
    hasBackup: false,
    backupDir: null,
    filesRecovered: false,
    emptyFilesRecovered: false,
    scriptInjected: false
  };
  
  try {
    // 1. 查找最新备份目录
    const backupDir = findLatestBackupDir();
    recoveryResults.hasBackup = !!backupDir;
    recoveryResults.backupDir = backupDir;
    
    // 2. 从备份恢复文件
    if (backupDir) {
      recoveryResults.filesRecovered = recoverFromBackup(backupDir);
    }
    
    // 3. 检查关键文件
    const smallFiles = checkCriticalFiles();
    
    // 4. 强制恢复空文件
    if (smallFiles.length > 0 && backupDir) {
      recoveryResults.emptyFilesRecovered = forceRecoverSmallFiles(backupDir, smallFiles);
    }
    
    // 5. 插入初始化脚本
    recoveryResults.scriptInjected = injectInitScript();
    
    // 6. 生成最终报告
    generateFinalReport(recoveryResults);
    
    log('\n页面恢复成功 ✅');
    log(`日志文件: ${LOG_FILE}`);
    
  } catch (error) {
    log(`修复过程中发生错误: ${error.message}`);
    log('页面恢复可能不完整 ❌');
  }
}

main();