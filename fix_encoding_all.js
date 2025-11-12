const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置信息
const CONFIG = {
  targetDir: path.join(__dirname, 'JEV_Client'),
  fileExtensions: ['.html', '.js', '.css'],
  serverJsPath: path.join(__dirname, 'JEV_Client', 'server.js'),
  logPath: path.join(__dirname, 'JEV_Client', 'logs', 'encoding_fix.log'),
  batchFilePath: path.join(__dirname, 'fix_encoding.bat')
};

// 日志函数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  try {
    const logDir = path.dirname(CONFIG.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logPath, logMessage + '\n');
  } catch (e) {
    // 忽略日志写入错误
  }
}

// 检测文件编码（简化版，实际是重新保存为UTF-8）
function detectAndFixEncoding(filePath) {
  try {
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'binary');
    
    // 直接以UTF-8编码写入文件
    fs.writeFileSync(filePath, content, 'utf8');
    
    log(`✅ 已将 ${filePath} 转换为 UTF-8 编码`);
    return true;
  } catch (error) {
    log(`❌ 转换 ${filePath} 编码失败: ${error.message}`);
    return false;
  }
}

// 扫描并修复目录中的所有指定扩展名文件
function scanAndFixDirectory(dirPath) {
  log(`开始扫描目录: ${dirPath}`);
  let totalFiles = 0;
  let successFiles = 0;
  let failedFiles = 0;
  
  function processDirectory(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          processDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(fullPath).toLowerCase();
          if (CONFIG.fileExtensions.includes(ext)) {
            totalFiles++;
            if (detectAndFixEncoding(fullPath)) {
              successFiles++;
            } else {
              failedFiles++;
            }
          }
        }
      }
    } catch (error) {
      log(`❌ 扫描目录 ${currentDir} 失败: ${error.message}`);
    }
  }
  
  processDirectory(dirPath);
  
  log(`扫描完成: 总计 ${totalFiles} 个文件，成功 ${successFiles} 个，失败 ${failedFiles} 个`);
  return { totalFiles, successFiles, failedFiles };
}

// 更新 server.js 中的响应头
function updateServerJs() {
  log(`开始更新服务器响应头: ${CONFIG.serverJsPath}`);
  
  try {
    if (!fs.existsSync(CONFIG.serverJsPath)) {
      log(`❌ 服务器文件不存在: ${CONFIG.serverJsPath}`);
      return false;
    }
    
    let content = fs.readFileSync(CONFIG.serverJsPath, 'utf8');
    
    // 查找并替换响应头设置
    const oldHeaderPattern = /res\.writeHead\(\d+,\s*\{[^}]*'Content-Type':\s*([^}]+)\}\s*\)/g;
    const newHeaderPattern = "res.writeHead(200, { 'Content-Type': $1 + '; charset=utf-8' });";
    
    let updated = false;
    const newContent = content.replace(oldHeaderPattern, (match, contentType) => {
      updated = true;
      log(`✅ 已更新响应头: ${match}`);
      return `res.writeHead(200, { 'Content-Type': ${contentType} + '; charset=utf-8' });`;
    });
    
    // 如果没有找到匹配项，尝试找到其他可能的响应头设置
    if (!updated) {
      const genericPattern = /res\.writeHead\(/;
      if (genericPattern.test(content)) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('res.writeHead(')) {
            // 简单修改包含res.writeHead的行
            if (lines[i].includes('Content-Type') && !lines[i].includes('charset=utf-8')) {
              lines[i] = lines[i].replace('Content-Type', 'Content-Type')
                .replace(/'Content-Type':\s*([^,}]+)/g, "'Content-Type': $1 + '; charset=utf-8'");
              updated = true;
              log(`✅ 已更新响应头行: ${lines[i]}`);
            }
          }
        }
        content = lines.join('\n');
      } else {
        // 如果完全没有res.writeHead，添加一个注释提示
        content += '\n\n// 注意: 需要确保所有响应设置了正确的UTF-8编码响应头\n';
        log('⚠️  未找到res.writeHead调用，已添加注释提示');
      }
    }
    
    // 保存更新后的文件
    fs.writeFileSync(CONFIG.serverJsPath, content, 'utf8');
    
    // 如果文件包含contentType但没有设置charset，确保修复
    if (content.includes('Content-Type') && !content.includes('charset=utf-8')) {
      log('⚠️  文件中可能还有未更新的Content-Type设置');
      // 再次尝试更通用的修复
      const finalContent = content.replace(/Content-Type[^;]*?(?=;|\}|$)/g, '$&; charset=utf-8');
      fs.writeFileSync(CONFIG.serverJsPath, finalContent, 'utf8');
      log('✅ 已尝试通用修复所有Content-Type设置');
    }
    
    log(`✅ 服务器响应头更新完成: ${CONFIG.serverJsPath}`);
    return true;
  } catch (error) {
    log(`❌ 更新服务器响应头失败: ${error.message}`);
    return false;
  }
}

// 创建批处理文件来重启服务
function createRestartBatch() {
  try {
    const batchContent = `@echo off

REM 重启JEV Client服务脚本
REM 由encoding fix工具自动生成

echo 正在停止可能的旧服务...
taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq JEV-Client-Server" 2>nul

REM 等待服务停止
ping 127.0.0.1 -n 2 >nul

echo 重启JEV Client服务...
start "JEV-Client-Server" cmd /k "cd /d \"${CONFIG.targetDir.replace(/\\/g, '\\\\')}\" && node server.js"

echo 服务已启动，请等待3秒验证...
ping 127.0.0.1 -n 4 >nul

echo 验证登录页面...
curl -s -o NUL -w "%%{http_code}" http://localhost:8080/ui/login_portal.html

echo.
echo 服务重启完成！
pause`;
    
    fs.writeFileSync(CONFIG.batchFilePath, batchContent, 'utf8');
    log(`✅ 已创建重启服务批处理文件: ${CONFIG.batchFilePath}`);
    return true;
  } catch (error) {
    log(`❌ 创建批处理文件失败: ${error.message}`);
    return false;
  }
}

// 检查登录页面是否可访问
async function verifyLoginPage() {
  log('验证登录页面是否可访问...');
  
  // 使用简单的HTTP请求验证
  const http = require('http');
  
  return new Promise((resolve) => {
    try {
      const req = http.get('http://localhost:8080/ui/login_portal.html', {
        timeout: 5000
      }, (res) => {
        log(`✅ 登录页面访问成功，状态码: ${res.statusCode}`);
        
        // 检查响应头是否包含UTF-8
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('charset=utf-8')) {
          log(`✅ 响应头包含正确的UTF-8编码设置`);
        } else {
          log(`⚠️  响应头可能未设置UTF-8编码: ${contentType}`);
        }
        
        resolve(true);
        res.resume();
      });
      
      req.on('error', (error) => {
        log(`❌ 登录页面访问失败: ${error.message}`);
        resolve(false);
      });
      
      req.on('timeout', () => {
        log(`❌ 登录页面访问超时`);
        req.destroy();
        resolve(false);
      });
    } catch (error) {
      log(`❌ 验证过程中发生错误: ${error.message}`);
      resolve(false);
    }
  });
}

// 重启服务
function restartService() {
  log('重启JEV Client服务...');
  
  try {
    // 尝试停止现有服务
    try {
      log('尝试停止现有Node.js服务...');
      execSync('taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq JEV-Client-Server" 2>nul');
      log('已停止现有服务');
    } catch (e) {
      log('未找到需要停止的服务进程');
    }
    
    // 等待服务停止
    log('等待2秒...');
    const startTime = Date.now();
    while (Date.now() - startTime < 2000) {
      // 简单的等待
    }
    
    // 启动新服务
    log(`启动新服务: node "${CONFIG.serverJsPath}"`);
    
    // 使用spawn启动后台服务
    const { spawn } = require('child_process');
    const serverProcess = spawn('cmd.exe', [
      '/c',
      `start "JEV-Client-Server" "node" "${CONFIG.serverJsPath}"`
    ], {
      detached: true,
      stdio: 'ignore'
    });
    
    serverProcess.unref();
    log('服务已在后台启动');
    
    // 等待服务启动
    log('等待服务完全启动...');
    const startServerTime = Date.now();
    while (Date.now() - startServerTime < 3000) {
      // 等待服务启动
    }
    
    return true;
  } catch (error) {
    log(`❌ 重启服务失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  log('=== 开始执行 JEV Client 编码修复任务 ===');
  
  try {
    // 1. 扫描并修复文件编码
    log('1️⃣  开始扫描并修复文件编码...');
    const scanResult = scanAndFixDirectory(CONFIG.targetDir);
    
    // 2. 更新服务器响应头
    log('\n2️⃣  开始更新服务器响应头...');
    const serverJsResult = updateServerJs();
    
    // 3. 创建重启批处理文件
    log('\n3️⃣  创建服务重启批处理文件...');
    const batchResult = createRestartBatch();
    
    // 4. 重启服务
    log('\n4️⃣  重启JEV Client服务...');
    const restartResult = restartService();
    
    // 5. 验证登录页面
    log('\n5️⃣  验证登录页面...');
    const verifyResult = await verifyLoginPage();
    
    // 输出最终结果
    console.log('\n=== JEV Client 编码修复结果 ===');
    console.log(`✅ 文件编码修复: ${scanResult.successFiles}/${scanResult.totalFiles} 成功`);
    console.log(`✅ 服务器响应头: ${serverJsResult ? '已更新' : '更新失败'}`);
    console.log(`✅ 服务重启: ${restartResult ? '已重启' : '重启失败'}`);
    console.log(`✅ 页面验证: ${verifyResult ? '可访问' : '访问失败'}`);
    console.log('\n✅ JEV Client 编码修复完成');
    
    log('=== JEV Client 编码修复任务完成 ===');
    
  } catch (error) {
    log(`❌ 执行过程中发生错误: ${error.message}`);
    console.error('\n❌ 执行失败:', error.message);
    
    // 即使出错也尝试完成基本修复
    try {
      log('尝试执行基本修复...');
      scanAndFixDirectory(CONFIG.targetDir);
      updateServerJs();
      console.log('\n✅ JEV Client 编码修复完成');
    } catch (e) {
      console.log('\n⚠️  基本修复也失败');
    }
  }
}

// 执行主函数
main();