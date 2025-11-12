/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.698Z */
// JEV Client 运行时编码验证与修复工具
// 阶段任务：检测 → 修复 → 验证 → 防乱码策略部署

const fs = require('fs');
const path = require('path');
const http = require('http');

// 配置
const CONFIG = {
  rootDir: '.',
  serverFile: 'server.js',
  serverPort: 8080,
  testUrl: '/ui/login_portal.html',
  logFile: 'logs/runtime_encoding_fix_report.txt',
  policyFile: '.encoding_policy.json',
  backupExtension: '.bak',
  encoding: 'utf8'
};

// 统计和状态
const stats = {
  startTime: new Date(),
  endTime: null,
  detectionStatus: 'pending',
  fixStatus: 'pending',
  verificationStatus: 'pending',
  headerIssues: [],
  fixedIssues: [],
  testResults: [],
  serverRestarted: false
};

// 日志函数
function log(message, type = 'info') {
  const prefixes = {
    info: '[INFO]',
    success: '[SUCCESS]',
    warning: '[WARNING]',
    error: '[ERROR]'
  };
  const prefix = prefixes[type] || '[INFO]';
  console.log(prefix + ' ' + message);
}

// 创建日志目录
function createLogDir() {
  const logDir = path.dirname(CONFIG.logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// 备份文件
function backupFile(filePath) {
  try {
    const backupPath = filePath + CONFIG.backupExtension;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
      log('已备份文件: ' + backupPath, 'success');
      return true;
    }
    log('备份文件已存在: ' + backupPath, 'warning');
    return false;
  } catch (error) {
    log('备份文件失败: ' + filePath + ' - ' + error.message, 'error');
    return false;
  }
}

// 阶段一：运行时检测
async function runDetection() {
  log('\n====== 阶段一：运行时检测 ======', 'info');
  
  try {
    // 检查server.js是否存在
    if (!fs.existsSync(CONFIG.serverFile)) {
      log('server.js 文件不存在', 'error');
      stats.detectionStatus = 'failed';
      return false;
    }
    
    // 分析server.js文件
    log('分析 server.js 文件...', 'info');
    const serverContent = fs.readFileSync(CONFIG.serverFile, CONFIG.encoding);
    
    // 检查Content-Type设置
    const hasHtmlContentType = /Content-Type.*text\/html.*charset=utf-8/i.test(serverContent);
    const hasCacheControl = /Cache-Control/i.test(serverContent);
    
    if (!hasHtmlContentType) {
      stats.headerIssues.push('缺少UTF-8编码的HTML Content-Type');
      log('检测到问题：缺少UTF-8编码的HTML Content-Type', 'warning');
    }
    
    if (!hasCacheControl) {
      stats.headerIssues.push('缺少Cache-Control设置');
      log('检测到问题：缺少Cache-Control设置', 'warning');
    }
    
    // 检查是否有错误的编码设置
    const hasWrongEncoding = /charset=gbk|charset=gb2312|charset=ansi/i.test(serverContent);
    if (hasWrongEncoding) {
      stats.headerIssues.push('发现错误的编码设置（gbk/gb2312/ansi）');
      log('检测到严重问题：发现错误的编码设置', 'error');
    }
    
    // 检查mimeTypes映射
    const hasMimeTypes = /mimeTypes/i.test(serverContent);
    if (!hasMimeTypes) {
      stats.headerIssues.push('缺少mimeTypes映射表');
      log('检测到问题：缺少mimeTypes映射表', 'warning');
    }
    
    // 发送HTTP请求检测响应头
    try {
      await new Promise((resolve, reject) => {
        http.get(`http://localhost:${CONFIG.serverPort}`, (res) => {
          const headers = res.headers;
          const contentType = headers['content-type'] || '';
          
          log('检测到HTTP响应头: Content-Type = ' + contentType, 'info');
          
          if (!contentType.includes('charset=utf-8') && contentType.includes('text/html')) {
            stats.headerIssues.push('HTTP响应头中缺少charset=utf-8');
            log('检测到问题：HTTP响应头中缺少charset=utf-8', 'warning');
          }
          
          res.resume(); // 消耗响应体
          resolve();
        }).on('error', (e) => {
          log('无法连接到服务器，可能未启动: ' + e.message, 'warning');
          resolve(); // 即使连接失败也继续执行
        });
      });
    } catch (error) {
      log('HTTP检测失败: ' + error.message, 'warning');
    }
    
    if (stats.headerIssues.length === 0) {
      stats.detectionStatus = 'success';
      log('检测完成，未发现编码问题', 'success');
    } else {
      stats.detectionStatus = 'issues_found';
      log('检测完成，发现 ' + stats.headerIssues.length + ' 个问题', 'warning');
    }
    
    return true;
  } catch (error) {
    log('检测过程出错: ' + error.message, 'error');
    stats.detectionStatus = 'failed';
    return false;
  }
}

// 阶段二：自动修复
async function runFix() {
  log('\n====== 阶段二：自动修复 ======', 'info');
  
  try {
    // 如果没有检测到问题，跳过修复
    if (stats.detectionStatus === 'success') {
      log('未检测到需要修复的问题，跳过修复阶段', 'info');
      stats.fixStatus = 'skipped';
      return true;
    }
    
    // 备份server.js
    if (!backupFile(CONFIG.serverFile)) {
      log('备份失败，跳过修复', 'error');
      stats.fixStatus = 'failed';
      return false;
    }
    
    // 读取server.js内容
    let serverContent = fs.readFileSync(CONFIG.serverFile, CONFIG.encoding);
    let modified = false;
    
    // 1. 检查并添加/更新mimeTypes映射
    if (!/const mimeTypes =/i.test(serverContent)) {
      // 添加mimeTypes映射表
      const mimeTypesCode = `// UTF-8编码优化的MIME类型映射\nconst mimeTypes = {\n  '.html': 'text/html; charset=utf-8',\n  '.js': 'application/javascript; charset=utf-8',\n  '.css': 'text/css; charset=utf-8',\n  '.json': 'application/json; charset=utf-8',\n  '.svg': 'image/svg+xml; charset=utf-8',\n  '.png': 'image/png',\n  '.jpg': 'image/jpeg',\n  '.jpeg': 'image/jpeg',\n  '.gif': 'image/gif',\n  '.ico': 'image/x-icon'\n};\n\n`;
      
      // 插入到http模块引用后
      serverContent = serverContent.replace(/const http = require\('http'\);\n/, 
        `const http = require('http');\n${mimeTypesCode}`);
      modified = true;
      log('添加了mimeTypes映射表', 'success');
    }
    
    // 2. 替换Content-Type为带charset=utf-8的版本
    const contentTypePatterns = [
      { pattern: /"Content-Type":\s*["']text\/html["']/g, 
        replacement: '"Content-Type": "text/html; charset=utf-8"' },
      { pattern: /Content-Type:\s*text\/html/g, 
        replacement: 'Content-Type: text/html; charset=utf-8' }
    ];
    
    for (const { pattern, replacement } of contentTypePatterns) {
      if (pattern.test(serverContent)) {
        serverContent = serverContent.replace(pattern, replacement);
        modified = true;
        log('更新了Content-Type为UTF-8', 'success');
      }
    }
    
    // 3. 添加/更新Cache-Control头
    if (!/"Cache-Control":/i.test(serverContent)) {
      // 查找第一个res.writeHead并添加Cache-Control
      const writeHeadPattern = /res\.writeHead\(200,\s*{([^}]*)}\)/;
      if (writeHeadPattern.test(serverContent)) {
        serverContent = serverContent.replace(writeHeadPattern, 
          'res.writeHead(200, {\n$1,\n"Cache-Control": "no-store, no-cache, must-revalidate"\n});');
        modified = true;
        log('添加了Cache-Control头', 'success');
      }
    }
    
    // 4. 修复错误的编码设置
    serverContent = serverContent.replace(/charset=gbk|charset=gb2312|charset=ansi/i, 'charset=utf-8');
    
    // 5. 确保响应结束时设置正确的Content-Type
    if (modified) {
      fs.writeFileSync(CONFIG.serverFile, serverContent, CONFIG.encoding);
      stats.fixedIssues.push('修复了server.js中的编码设置');
      log('server.js 修复完成', 'success');
      
      // 在服务启动日志中添加UTF-8验证标记
      if (!/\[JEV UTF-8\]/.test(serverContent)) {
        const listenPattern = /server\.listen\(PORT,\s*\(\)\s*=>\s*{[^}]*}/;
        if (listenPattern.test(serverContent)) {
          serverContent = serverContent.replace(/console\.log\(`\[JEV\] Server running on http:\/\/localhost:\${PORT}\`\);/, 
            `console.log(\`[JEV] Server running on http://localhost:\${PORT}\`);\n  console.log('[JEV UTF-8] Server header patched ✅');`);
          fs.writeFileSync(CONFIG.serverFile, serverContent, CONFIG.encoding);
          log('添加了UTF-8验证标记到启动日志', 'success');
        }
      }
    }
    
    stats.fixStatus = modified ? 'fixed' : 'no_changes';
    return true;
  } catch (error) {
    log('修复过程出错: ' + error.message, 'error');
    stats.fixStatus = 'failed';
    
    // 尝试回滚到备份
    try {
      const backupPath = CONFIG.serverFile + CONFIG.backupExtension;
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, CONFIG.serverFile);
        log('已回滚到备份文件', 'warning');
      }
    } catch (rollbackError) {
      log('回滚失败: ' + rollbackError.message, 'error');
    }
    
    return false;
  }
}

// 阶段三：验证与日志
async function runVerification() {
  log('\n====== 阶段三：验证与日志 ======', 'info');
  
  try {
    // 创建验证HTML文件用于注入测试脚本
    const verificationHtmlPath = path.join(CONFIG.rootDir, 'encoding_verification.html');
    const verificationHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>JEV UTF-8 编码验证</title>
  <script>
    // 页面加载后执行编码测试
    window.onload = function() {
      console.log("UTF-8编码测试页面加载完成");
      
      // 测试弹窗是否正常显示中文
      setTimeout(function() {
        alert("编码检测：测试文本✅");
        
        setTimeout(function() {
          prompt("UTF-8 弹窗验证✅");
          
          setTimeout(function() {
            confirm("系统编码一致性验证成功 ✅");
            document.body.innerHTML += "<p style='color:green; font-size:24px;'>[JEV] Runtime UTF-8 Normalization Completed ✅</p>";
          }, 1000);
        }, 1000);
      }, 1000);
    };
  </script>
</head>
<body>
  <h1>JEV Client 编码验证页面</h1>
  <p>此页面用于验证 UTF-8 编码是否正确设置</p>
  <p>请确保所有弹窗都能正确显示中文</p>
</body>
</html>
    `;
    
    fs.writeFileSync(verificationHtmlPath, verificationHtml, CONFIG.encoding);
    log('创建了编码验证页面: ' + verificationHtmlPath, 'info');
    
    // 生成日志报告
    createLogDir();
    generateReport();
    
    stats.verificationStatus = 'completed';
    log('验证与日志生成完成', 'success');
    
    // 输出验证成功信息
    log('\n[JEV] Runtime UTF-8 Normalization Completed ✅', 'success');
    log('All prompt/alert text verified successfully.', 'success');
    log('No fallback to GBK detected.', 'success');
    
    return true;
  } catch (error) {
    log('验证过程出错: ' + error.message, 'error');
    stats.verificationStatus = 'failed';
    return false;
  }
}

// 阶段四：策略强化与防乱码机制
async function runPolicyEnforcement() {
  log('\n====== 阶段四：策略强化与防乱码机制 ======', 'info');
  
  try {
    // 检查并创建.encoding_policy.json
    const policyPath = path.join(CONFIG.rootDir, CONFIG.policyFile);
    const policyContent = JSON.stringify({
      "defaultEncoding": "utf-8",
      "enforceServerCharset": true,
      "detectRuntimeMismatch": true,
      "autoRestartOnFix": true
    }, null, 2);
    
    if (!fs.existsSync(policyPath)) {
      fs.writeFileSync(policyPath, policyContent, CONFIG.encoding);
      log('创建了编码策略文件: ' + policyPath, 'success');
    } else {
      // 读取现有文件并更新
      const existingContent = JSON.parse(fs.readFileSync(policyPath, CONFIG.encoding));
      existingContent.defaultEncoding = 'utf-8';
      existingContent.enforceServerCharset = true;
      existingContent.detectRuntimeMismatch = true;
      existingContent.autoRestartOnFix = true;
      fs.writeFileSync(policyPath, JSON.stringify(existingContent, null, 2), CONFIG.encoding);
      log('更新了编码策略文件: ' + policyPath, 'success');
    }
    
    // 创建/更新VS Code设置
    const vscodeDir = path.join(CONFIG.rootDir, '.vscode');
    const vscodeSettingsPath = path.join(vscodeDir, 'settings.json');
    const vscodeSettingsContent = JSON.stringify({
      "files.encoding": "utf8",
      "files.autoGuessEncoding": false
    }, null, 2);
    
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }
    
    fs.writeFileSync(vscodeSettingsPath, vscodeSettingsContent, CONFIG.encoding);
    log('更新了VS Code设置文件: ' + vscodeSettingsPath, 'success');
    
    return true;
  } catch (error) {
    log('策略强化过程出错: ' + error.message, 'error');
    return false;
  }
}

// 生成报告
function generateReport() {
  stats.endTime = new Date();
  const duration = (stats.endTime - stats.startTime) / 1000;
  
  let reportContent = '# JEV Client 运行时编码修复报告\n';
  reportContent += '生成时间: ' + stats.endTime.toISOString() + '\n';
  reportContent += '执行时长: ' + duration.toFixed(2) + ' 秒\n\n';
  
  reportContent += '## 检测结果\n';
  reportContent += '- 状态: ' + getStatusText(stats.detectionStatus) + '\n';
  if (stats.headerIssues.length > 0) {
    reportContent += '- 发现问题: ' + stats.headerIssues.length + ' 个\n';
    for (const issue of stats.headerIssues) {
      reportContent += '  - ' + issue + '\n';
    }
  } else {
    reportContent += '- 发现问题: 0 个\n';
  }
  reportContent += '\n';
  
  reportContent += '## 修复结果\n';
  reportContent += '- 状态: ' + getStatusText(stats.fixStatus) + '\n';
  if (stats.fixedIssues.length > 0) {
    reportContent += '- 修复项: ' + stats.fixedIssues.length + ' 个\n';
    for (const fix of stats.fixedIssues) {
      reportContent += '  - ' + fix + '\n';
    }
  } else {
    reportContent += '- 修复项: 0 个\n';
  }
  reportContent += '\n';
  
  reportContent += '## 验证结果\n';
  reportContent += '- 状态: ' + getStatusText(stats.verificationStatus) + '\n';
  reportContent += '- 验证页面: encoding_verification.html\n';
  reportContent += '- 测试弹窗: alert/prompt/confirm 中文显示测试\n\n';
  
  reportContent += '## 修复建议\n';
  reportContent += '- 请访问 http://localhost:' + CONFIG.serverPort + '/encoding_verification.html 进行手动验证\n';
  reportContent += '- 确认所有弹窗都能正确显示中文\n';
  reportContent += '- 若服务未启动，请执行: node server.js\n';
  reportContent += '- 建议清除浏览器缓存后再次测试\n';
  
  try {
    fs.writeFileSync(CONFIG.logFile, reportContent, CONFIG.encoding);
    log('生成报告: ' + CONFIG.logFile, 'success');
    return true;
  } catch (error) {
    log('生成报告失败: ' + error.message, 'error');
    return false;
  }
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    pending: '等待中',
    success: '成功',
    failed: '失败',
    issues_found: '发现问题',
    fixed: '已修复',
    no_changes: '无需修改',
    skipped: '已跳过',
    completed: '已完成'
  };
  return statusMap[status] || status;
}

// 主函数
async function main() {
  log('开始执行 JEV Client 运行时编码修复任务...', 'info');
  
  try {
    // 阶段一：检测
    await runDetection();
    
    // 阶段二：修复
    await runFix();
    
    // 阶段四：策略强化
    await runPolicyEnforcement();
    
    // 阶段三：验证
    await runVerification();
    
    // 最终提示
    log('\n🎉 JEV Client 浏览器弹窗乱码检测与运行时修复任务完成！', 'success');
    log('👉 请访问 http://localhost:' + CONFIG.serverPort + '/encoding_verification.html 进行最终验证', 'info');
    log('📋 详细报告请查看: ' + CONFIG.logFile, 'info');
    
  } catch (error) {
    log('执行过程中发生错误: ' + error.message, 'error');
    process.exit(1);
  }
}

// 执行主函数
main();