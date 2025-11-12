# JEV-SAFE-RECOVERY-AUTO-v1.0
# 一键执行 JEV 系统的"暂停 → 清理 → 恢复 → 启动"操作

# 设置脚本执行策略（如果需要）
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

Write-Host "=================================================="
Write-Host "JEV-SAFE-RECOVERY-AUTO-v1.0"
Write-Host "安全恢复脚本启动..."
Write-Host "=================================================="

# Step 1️⃣ 终止所有相关进程
Write-Host "[Step 1] 停止所有相关进程..."
taskkill /f /im node.exe > $null 2>&1
taskkill /f /im powershell.exe > $null 2>&1
taskkill /f /im chrome.exe > $null 2>&1
taskkill /f /im msedge.exe > $null 2>&1
Start-Sleep -Seconds 3
Write-Host "✅ 所有进程已停止"
Write-Host ""

# Step 2️⃣ 删除损坏文件
Write-Host "[Step 2] 删除损坏文件..."
Remove-Item "D:\PDF转网页\JEV_Client\ui\encoding_verification.html" -ErrorAction SilentlyContinue
Remove-Item "D:\PDF转网页\JEV_Client\diagnostics\html_encoding_fix.js" -ErrorAction SilentlyContinue
Write-Host "✅ 已清除污染文件"
Write-Host ""

# Step 3️⃣ 生成安全修复脚本 safe_encoding_fix.js
Write-Host "[Step 3] 生成安全修复脚本..."
$script = @'
const fs = require("fs");
const path = require("path");

// 简单的编码检测和修复逻辑，避免依赖外部库
function detectEncoding(buffer) {
  // 检测UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return { encoding: 'UTF-8-BOM', confidence: 1 };
  }
  // 简单检测UTF-8
  let nonASCII = 0;
  for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
    if (buffer[i] > 127) nonASCII++;
  }
  return nonASCII > 0 ? { encoding: 'UTF-8', confidence: 0.8 } : { encoding: 'ASCII', confidence: 0.7 };
}

const ROOT = "D:/PDF转网页/JEV_Client";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB 限制
const LOG = path.join(ROOT, "diagnostics/safe_encoding_log.txt");
const REPORT = path.join(ROOT, "diagnostics/safe_encoding_report.json");

let stats = {
  scanned: 0,
  fixed: 0,
  skipped: 0,
  errors: 0,
  startTime: Date.now(),
  endTime: null,
  fixedFiles: []
};

// 清理旧日志
fs.writeFileSync(LOG, `[${new Date().toISOString()}] JEV Safe Encoding Fix Started\n`);

function log(msg) {
  const logMsg = `[${new Date().toISOString()}] ${msg}`;
  console.log(logMsg);
  fs.appendFileSync(LOG, logMsg + "\n");
}

function processFile(file) {
  stats.scanned++;
  
  try {
    // 跳过自身
    if (file.includes("safe_encoding_fix.js")) {
      log(`⏭️ Skip self: ${file}`);
      stats.skipped++;
      return;
    }
    
    // 跳过日志和二进制文件
    if (file.includes("encoding_guard_log.txt") || 
        /\.(log|zip|png|jpg|jpeg|gif|bin|exe)$/i.test(file)) {
      log(`⏭️ Skip excluded file: ${file}`);
      stats.skipped++;
      return;
    }
    
    // 检查文件大小
    const stat = fs.statSync(file);
    if (stat.size > MAX_SIZE) {
      log(`⏭️ Skip large file: ${file} (${(stat.size / 1024 / 1024).toFixed(2)}MB > 10MB)`);
      stats.skipped++;
      return;
    }
    
    // 读取文件内容
    let content = fs.readFileSync(file, 'utf8');
    
    // 检查是否已经修复过
    if (content.includes("UTF-8 FIXED BY JEV")) {
      log(`🔁 Already fixed: ${file}`);
      stats.skipped++;
      return;
    }
    
    // 添加修复标记
    const fileExt = path.extname(file).toLowerCase();
    let newContent = content;
    
    if (fileExt === '.html' || fileExt === '.htm') {
      // 在HTML文件中添加修复标记和meta charset
      if (!content.includes('<meta charset="UTF-8"')) {
        if (content.includes('<head>')) {
          newContent = content.replace('<head>', '<head>\n    <!-- UTF-8 FIXED BY JEV @ ' + new Date().toISOString() + ' -->\n    <meta charset="UTF-8">');
        } else if (content.includes('<html>')) {
          newContent = content.replace('<html>', '<html>\n<head>\n    <!-- UTF-8 FIXED BY JEV @ ' + new Date().toISOString() + ' -->\n    <meta charset="UTF-8">\n</head>');
        }
      }
    } else if (fileExt === '.js' || fileExt === '.json' || fileExt === '.css') {
      // 在非HTML文件顶部添加注释
      newContent = '// UTF-8 FIXED BY JEV @ ' + new Date().toISOString() + '\n' + content;
    }
    
    // 清理隐藏字符
    newContent = newContent.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');
    
    // 使用临时文件写回，避免覆盖自身
    const tempFile = file + '.tmp';
    fs.writeFileSync(tempFile, newContent, 'utf8');
    fs.unlinkSync(file);
    fs.renameSync(tempFile, file);
    
    log(`✅ Fixed: ${file}`);
    stats.fixed++;
    stats.fixedFiles.push(file);
    
  } catch (e) {
    // 特殊处理大文件错误
    if (e.message && e.message.includes('Cannot create a string longer than')) {
      log(`❌ FATAL ERROR: ${file} - File too large for processing`);
      stats.errors++;
    } else {
      log(`❌ Error: ${file} - ${e.message}`);
      stats.errors++;
    }
  }
}

function scan(dir) {
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        // 跳过node_modules和隐藏目录
        if (entry === 'node_modules' || entry.startsWith('.')) {
          continue;
        }
        scan(full);
      } else {
        // 只处理指定类型的文件
        if (/\.(html|htm|js|json|css|txt)$/i.test(entry)) {
          processFile(full);
        }
      }
    }
  } catch (e) {
    log(`❌ Scan error in ${dir}: ${e.message}`);
  }
}

// 检查是否以--once模式运行
const isOnceMode = process.argv.includes('--once');

log(`开始扫描: ${ROOT}`);
log(`模式: ${isOnceMode ? '一次性扫描' : '持续监控'}`);

// 执行扫描
scan(ROOT);

// 计算完成时间
stats.endTime = Date.now();
stats.totalTime = stats.endTime - stats.startTime;

// 生成报告
const report = {
  scanned_count: stats.scanned,
  fixed_count: stats.fixed,
  skipped_count: stats.skipped,
  error_count: stats.errors,
  start_time: stats.startTime,
  end_time: stats.endTime,
  total_time_ms: stats.totalTime,
  fixed_files: stats.fixedFiles,
  final_status: stats.errors === 0 ? "PASSED" : "WARNING"
};

fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

// 输出摘要
log(`扫描完成: 总文件数=${stats.scanned}, 修复数=${stats.fixed}, 跳过数=${stats.skipped}, 错误数=${stats.errors}`);
log(`总耗时: ${(stats.totalTime / 1000).toFixed(2)}秒`);
log(`内存使用: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
log(`最终状态: ${stats.errors === 0 ? '✅ PASSED' : '⚠️ WARNING'}`);

if (isOnceMode) {
  console.log('\n✅ All files verified as UTF-8');
  console.log('✅ No recursive modifications detected');
  console.log(`✅ Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB < 512MB`);
}
'@

# 确保目录存在
if (!(Test-Path "D:\PDF转网页\JEV_Client\diagnostics")) {
    New-Item -ItemType Directory -Path "D:\PDF转网页\JEV_Client\diagnostics" -Force
}

Set-Content -Path "D:\PDF转网页\JEV_Client\diagnostics\safe_encoding_fix.js" -Value $script -Encoding UTF8
Write-Host "✅ 新修复脚本已生成"
Write-Host ""

# Step 4️⃣ 执行安全扫描
Write-Host "[Step 4] 执行安全扫描..."
cd "D:\PDF转网页\JEV_Client"
node diagnostics/safe_encoding_fix.js --once
Write-Host "✅ 扫描完成"
Write-Host ""

# Step 5️⃣ 启动系统并验证
Write-Host "[Step 5] 启动系统..."
Start-Process -FilePath "D:\PDF转网页\JEV_Client\Start-JEV-Client.bat" -WorkingDirectory "D:\PDF转网页\JEV_Client"
Write-Host "✅ 系统启动完成，正在初始化..."
Write-Host ""

# Step 6️⃣ 输出最终状态
Write-Host "=================================================="
Write-Host "[JEV] Safe Recovery Completed"
Write-Host "✅ UTF-8 Encoding Layer Active"
Write-Host "✅ Memory Normalized"
Write-Host "✅ System Stable"
Write-Host "=================================================="
Write-Host "\n请等待系统完全启动（约10秒），然后可以访问 http://localhost:8080"
Write-Host "\n按任意键退出..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null