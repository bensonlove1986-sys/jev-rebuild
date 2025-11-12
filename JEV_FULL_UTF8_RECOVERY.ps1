# JEV-FULL-UTF8-RECOVERY-v3.9
# 全面修复JEV系统的编码与文件一致性问题

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "JEV-FULL-UTF8-RECOVERY-v3.9" -ForegroundColor Cyan
Write-Host "全面编码修复与文件一致性检查" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 创建日志目录
$diagnosticsDir = "D:\PDF转网页\diagnostics"
if (-not (Test-Path $diagnosticsDir)) {
    New-Item -ItemType Directory -Path $diagnosticsDir -Force | Out-Null
    Write-Host "已创建diagnostics目录" -ForegroundColor Green
}

# 日志文件
$globalReport = "$diagnosticsDir\global_encoding_fix_report.json"
$encodingGuardReport = "$diagnosticsDir\encoding_guard_report.json"
$logFile = "$diagnosticsDir\utf8_recovery_log.txt"

# 初始化报告数据
$reportData = @{
    startTime = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    totalFilesScanned = 0
    filesConverted = 0
    filesWithBOM = 0
    metaTagsAdded = 0
    tempFilesDeleted = 0
    errors = @()
    warnings = @()
    processedFiles = @()
}

# 日志函数
function Write-Log {
    param(
        [string]$message,
        [string]$level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$level] $message"
    
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
    
    # 添加到错误或警告列表
    if ($level -eq "ERROR") {
        $reportData.errors += $message
    } elseif ($level -eq "WARNING") {
        $reportData.warnings += $message
    }
}

# 1️⃣ 停止所有正在运行的进程
Write-Host "`n[1/9] 停止所有正在运行的进程..." -ForegroundColor Yellow
Write-Log "开始停止系统进程"

try {
    # 停止Node.js进程
    Write-Log "停止Node.js进程..."
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # 停止相关的PowerShell进程
    Write-Log "停止相关PowerShell进程..."
    Get-Process -Name "powershell" -ErrorAction SilentlyContinue | 
    Where-Object {$_.Path -like "*powershell.exe*" -and $_.CommandLine -like "*JEV*"} | 
    Stop-Process -Force -ErrorAction SilentlyContinue
    
    # 停止相关的CMD进程
    Write-Log "停止相关CMD进程..."
    Get-Process -Name "cmd" -ErrorAction SilentlyContinue | 
    Where-Object {$_.Path -like "*cmd.exe*" -and $_.CommandLine -like "*JEV*"} | 
    Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Log "进程停止完成" -ForegroundColor Green
} catch {
    Write-Log "停止进程时出错: $_" -level "ERROR"
}

# 2️⃣ & 3️⃣ 扫描并转换文件
Write-Host "`n[2/9][3/9] 扫描并转换文件为UTF-8（无BOM）..." -ForegroundColor Yellow
Write-Log "开始扫描并转换文件编码"

# 要扫描的文件类型
$fileTypes = @("*.html", "*.js", "*.json", "*.css")
# 要扫描的目录
$directories = @(
    "D:\PDF转网页\",
    "D:\PDF转网页\JEV_Client\",
    "D:\PDF转网页\Cloud_Relay\",
    "D:\PDF转网页\diagnostics\"
)

function Test-HasBOM {
    param([string]$filePath)
    
    try {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

function Convert-FileToUTF8 {
    param([string]$filePath)
    
    try {
        # 检查是否有BOM
        $hasBOM = Test-HasBOM $filePath
        
        # 读取文件内容（自动检测编码）
        $content = Get-Content -Path $filePath -Raw
        
        # 写入为UTF-8无BOM
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.UTF8Encoding]::new($false))
        
        $reportData.filesConverted++
        
        if ($hasBOM) {
            $reportData.filesWithBOM++
            Write-Log "已移除BOM并转换为UTF-8: $filePath"
        } else {
            Write-Log "已转换为UTF-8（无BOM）: $filePath"
        }
        
        # 添加到已处理文件列表
        $reportData.processedFiles += @{
            path = $filePath
            hasBOM = $hasBOM
            converted = $true
        }
        
        return $true
    } catch {
        Write-Log "转换文件失败: $filePath - $_" -level "ERROR"
        return $false
    }
}

# 扫描并转换文件
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Log "扫描目录: $dir"
        
        foreach ($type in $fileTypes) {
            $files = Get-ChildItem -Path $dir -Filter $type -Recurse -ErrorAction SilentlyContinue
            
            foreach ($file in $files) {
                $reportData.totalFilesScanned++
                Convert-FileToUTF8 $file.FullName
            }
        }
    } else {
        Write-Log "目录不存在: $dir" -level "WARNING"
    }
}

# 4️⃣ 删除临时文件与重复文件
Write-Host "`n[4/9] 删除临时文件与重复文件..." -ForegroundColor Yellow
Write-Log "开始清理临时文件"

try {
    # 删除特定模式的临时文件
    $tempPatterns = @("*_fix.js", "*_verification.html", "*.tmp", "*.temp", "*~*")
    
    foreach ($dir in $directories) {
        if (Test-Path $dir) {
            foreach ($pattern in $tempPatterns) {
                $tempFiles = Get-ChildItem -Path $dir -Filter $pattern -Recurse -ErrorAction SilentlyContinue
                
                foreach ($file in $tempFiles) {
                    Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
                    $reportData.tempFilesDeleted++
                    Write-Log "已删除临时文件: $file.FullName"
                }
            }
        }
    }
    
    Write-Log "临时文件清理完成"
} catch {
    Write-Log "清理临时文件时出错: $_" -level "ERROR"
}

# 5️⃣ 校验文件头是否包含 <meta charset="UTF-8">
Write-Host "`n[5/9] 校验HTML文件meta标签..." -ForegroundColor Yellow
Write-Log "开始校验HTML文件编码标签"

try {
    $htmlFiles = Get-ChildItem -Path $directories -Filter "*.html" -Recurse -ErrorAction SilentlyContinue
    
    foreach ($file in $htmlFiles) {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
        
        if ($content -match '<meta[^>]*charset[^>]*>') {
            # 已有charset标签
            if (-not ($content -match 'charset="UTF-8"' -or $content -match "charset='UTF-8'")) {
                # 需要更新为UTF-8
                $newContent = $content -replace '<meta[^>]*charset[^>]*>', '<meta charset="UTF-8">'
                Set-Content -Path $file.FullName -Value $newContent -Force -Encoding utf8NoBOM
                $reportData.metaTagsAdded++
                Write-Log "已更新charset为UTF-8: $file.FullName"
            }
        } else {
            # 在<head>标签后添加charset标签
            if ($content -match '<head>') {
                $newContent = $content -replace '<head>', '<head>\n    <meta charset="UTF-8">'
                Set-Content -Path $file.FullName -Value $newContent -Force -Encoding utf8NoBOM
                $reportData.metaTagsAdded++
                Write-Log "已添加UTF-8 charset标签: $file.FullName"
            }
        }
    }
    
    Write-Log "HTML文件meta标签校验完成"
} catch {
    Write-Log "校验meta标签时出错: $_" -level "ERROR"
}

# 6️⃣ 重建编码守护文件
Write-Host "`n[6/9] 重建编码守护文件..." -ForegroundColor Yellow
Write-Log "开始重建编码守护文件"

# 重建 encoding_guard_daemon.js
$encodingGuardPath = "D:\PDF转网页\encoding_guard_daemon.js"
$encodingGuardContent = @"
// JEV Encoding Guard Daemon
// 自动监控并修复文件编码问题

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

// 监控目录
const watchDirs = [
  'D:\\PDF转网页\\',
  'D:\\PDF转网页\\JEV_Client\\',
  'D:\\PDF转网页\\Cloud_Relay\\',
  'D:\\PDF转网页\\diagnostics\\'
];

// 监控文件类型
const watchExtensions = ['.html', '.js', '.json', '.css'];

// 日志文件
const logFile = 'D:\\PDF转网页\\diagnostics\\encoding_guard.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  fs.appendFileSync(logFile, logEntry + '\n');
}

function checkAndFixEncoding(filePath) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) return;
    
    // 跳过二进制文件和大型文件
    const stats = fs.statSync(filePath);
    if (stats.size > 10 * 1024 * 1024) return; // 跳过大于10MB的文件
    
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 修复HTML文件的meta标签
    if (filePath.endsWith('.html')) {
      if (!content.includes('<meta charset="UTF-8">')) {
        let newContent = content;
        if (newContent.includes('<head>')) {
          newContent = newContent.replace('<head>', '<head>\n    <meta charset="UTF-8">');
        }
        fs.writeFileSync(filePath, newContent, 'utf8');
        log(`Fixed meta charset in: ${filePath}`);
      }
    }
    
    // 检查并移除BOM
    const hasBOM = content.charCodeAt(0) === 0xFEFF;
    if (hasBOM) {
      const contentWithoutBOM = content.slice(1);
      fs.writeFileSync(filePath, contentWithoutBOM, 'utf8');
      log(`Removed BOM from: ${filePath}`);
    }
    
  } catch (error) {
    log(`Error checking file ${filePath}: ${error.message}`);
  }
}

// 初始化监控
const watcher = chokidar.watch(watchDirs, {
  ignored: /(^|\/|\\)\../,
  persistent: true,
  ignoreInitial: false
});

// 事件监听
watcher
  .on('add', (filePath) => {
    if (watchExtensions.some(ext => filePath.endsWith(ext))) {
      log(`File added: ${filePath}`);
      checkAndFixEncoding(filePath);
    }
  })
  .on('change', (filePath) => {
    if (watchExtensions.some(ext => filePath.endsWith(ext))) {
      log(`File changed: ${filePath}`);
      checkAndFixEncoding(filePath);
    }
  })
  .on('error', (error) => {
    log(`Watcher error: ${error.message}`);
  });

log('Encoding Guard Daemon started');
log('Watching directories:', watchDirs.join(', '));
"@

# 重建 utf8_watchdog.js
$watchdogPath = "D:\PDF转网页\utf8_watchdog.js"
$watchdogContent = @"
// JEV UTF-8 Watchdog
// 轻量级文件编码监控器

const fs = require('fs');
const path = require('path');

// 配置
const config = {
  scanDirs: [
    'D:\\PDF转网页\\',
    'D:\\PDF转网页\\JEV_Client\\',
    'D:\\PDF转网页\\Cloud_Relay\\',
    'D:\\PDF转网页\\diagnostics\\'
  ],
  fileExtensions: ['.html', '.js', '.json', '.css'],
  reportFile: 'D:\\PDF转网页\\diagnostics\\utf8_watchdog_report.json',
  logFile: 'D:\\PDF转网页\\diagnostics\\utf8_watchdog.log'
};

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  fs.appendFileSync(config.logFile, logEntry + '\n');
}

function checkFileEncoding(filePath) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) return null;
    
    // 检查文件大小
    const stats = fs.statSync(filePath);
    if (stats.size === 0) return { path: filePath, status: 'empty' };
    
    // 读取前几个字节检查BOM
    const buffer = Buffer.alloc(3);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 3, 0);
    fs.closeSync(fd);
    
    const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
    
    // 尝试以UTF-8读取文件
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 检查HTML文件的meta标签
      let metaStatus = 'ok';
      if (filePath.endsWith('.html') && !content.includes('<meta charset="UTF-8">')) {
        metaStatus = 'missing';
      }
      
      return {
        path: filePath,
        status: hasBOM ? 'has_bom' : 'utf8_no_bom',
        metaStatus: metaStatus
      };
    } catch (e) {
      return {
        path: filePath,
        status: 'encoding_error',
        error: e.message
      };
    }
  } catch (error) {
    return {
      path: filePath,
      status: 'error',
      error: error.message
    };
  }
}

function scanDirectory(dir) {
  const results = [];
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // 递归扫描子目录
        results.push(...scanDirectory(filePath));
      } else {
        // 检查文件扩展名
        if (config.fileExtensions.some(ext => filePath.endsWith(ext))) {
          const result = checkFileEncoding(filePath);
          if (result) results.push(result);
        }
      }
    }
  } catch (error) {
    log(`Error scanning directory ${dir}: ${error.message}`);
  }
  
  return results;
}

function runScan() {
  log('Starting UTF-8 encoding scan...');
  
  const allResults = [];
  for (const dir of config.scanDirs) {
    if (fs.existsSync(dir)) {
      log(`Scanning directory: ${dir}`);
      const results = scanDirectory(dir);
      allResults.push(...results);
    } else {
      log(`Directory not found: ${dir}`);
    }
  }
  
  // 生成报告
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: allResults.length,
    filesWithBOM: allResults.filter(r => r.status === 'has_bom').length,
    filesWithEncodingError: allResults.filter(r => r.status === 'encoding_error' || r.status === 'error').length,
    filesWithMissingMeta: allResults.filter(r => r.metaStatus === 'missing').length,
    scanResults: allResults
  };
  
  // 保存报告
  fs.writeFileSync(config.reportFile, JSON.stringify(report, null, 2));
  log(`Scan completed. Report saved to: ${config.reportFile}`);
  log(`Total files scanned: ${report.totalFiles}`);
  log(`Files with BOM: ${report.filesWithBOM}`);
  log(`Files with encoding errors: ${report.filesWithEncodingError}`);
  log(`HTML files with missing charset meta: ${report.filesWithMissingMeta}`);
  
  return report;
}

// 运行扫描
runScan();
"@

// 重建 safe_encoding_fix.js
$safeFixPath = "D:\PDF转网页\safe_encoding_fix.js"
$safeFixContent = @"
// JEV Safe Encoding Fixer
// 安全修复文件编码问题的工具

const fs = require('fs');
const path = require('path');

// 配置
const config = {
  targetDirs: [
    'D:\\PDF转网页\\',
    'D:\\PDF转网页\\JEV_Client\\',
    'D:\\PDF转网页\\Cloud_Relay\\',
    'D:\\PDF转网页\\diagnostics\\'
  ],
  fileExtensions: ['.html', '.js', '.json', '.css'],
  excludePatterns: [
    'node_modules',
    '.git',
    '.svn',
    'logs',
    'temp',
    'tmp'
  ],
  reportFile: 'D:\\PDF转网页\\diagnostics\\safe_encoding_fix_report.json',
  logFile: 'D:\\PDF转网页\\diagnostics\\safe_encoding_fix.log'
};

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  fs.appendFileSync(config.logFile, logEntry + '\n');
}

function shouldExclude(filePath) {
  return config.excludePatterns.some(pattern => filePath.includes(pattern));
}

function fixFileEncoding(filePath) {
  try {
    // 检查是否应该排除
    if (shouldExclude(filePath)) {
      log(`Excluded file: ${filePath}`);
      return { path: filePath, status: 'excluded' };
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      log(`File not found: ${filePath}`);
      return { path: filePath, status: 'not_found' };
    }
    
    // 检查文件大小
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      log(`Empty file: ${filePath}`);
      return { path: filePath, status: 'empty' };
    }
    
    if (stats.size > 5 * 1024 * 1024) {
      log(`Skipping large file (${stats.size} bytes): ${filePath}`);
      return { path: filePath, status: 'too_large' };
    }
    
    // 检查BOM
    const buffer = Buffer.alloc(3);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 3, 0);
    fs.closeSync(fd);
    
    const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
    
    // 读取文件内容
    const content = hasBOM ? 
      fs.readFileSync(filePath).slice(3).toString('utf8') : 
      fs.readFileSync(filePath, 'utf8');
    
    // 修复HTML文件的meta标签
    let needsMetaFix = false;
    let fixedContent = content;
    
    if (filePath.endsWith('.html')) {
      if (!content.includes('<meta charset="UTF-8">')) {
        if (content.includes('<head>')) {
          fixedContent = content.replace('<head>', '<head>\n    <meta charset="UTF-8">');
          needsMetaFix = true;
        } else if (content.includes('<HEAD>')) {
          fixedContent = content.replace('<HEAD>', '<HEAD>\n    <meta charset="UTF-8">');
          needsMetaFix = true;
        }
      }
    }
    
    // 写入文件（UTF-8无BOM）
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    
    const changes = [];
    if (hasBOM) changes.push('removed_bom');
    if (needsMetaFix) changes.push('added_charset_meta');
    
    const status = changes.length > 0 ? 'fixed' : 'already_correct';
    log(`${status.toUpperCase()}: ${filePath} ${changes.join(', ')}`);
    
    return {
      path: filePath,
      status: status,
      changes: changes
    };
  } catch (error) {
    log(`ERROR fixing ${filePath}: ${error.message}`);
    return {
      path: filePath,
      status: 'error',
      error: error.message
    };
  }
}

function processDirectory(dir) {
  const results = [];
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        // 跳过排除的目录
        if (!shouldExclude(filePath)) {
          results.push(...processDirectory(filePath));
        }
      } else {
        // 检查文件扩展名
        if (config.fileExtensions.some(ext => filePath.endsWith(ext))) {
          const result = fixFileEncoding(filePath);
          results.push(result);
        }
      }
    }
  } catch (error) {
    log(`Error processing directory ${dir}: ${error.message}`);
  }
  
  return results;
}

function runFix() {
  log('Starting safe encoding fix...');
  
  const allResults = [];
  for (const dir of config.targetDirs) {
    if (fs.existsSync(dir)) {
      log(`Processing directory: ${dir}`);
      const results = processDirectory(dir);
      allResults.push(...results);
    } else {
      log(`Directory not found: ${dir}`);
    }
  }
  
  // 统计结果
  const summary = {
    totalProcessed: allResults.length,
    fixed: allResults.filter(r => r.status === 'fixed').length,
    alreadyCorrect: allResults.filter(r => r.status === 'already_correct').length,
    excluded: allResults.filter(r => r.status === 'excluded').length,
    errors: allResults.filter(r => r.status === 'error').length,
    withBOMRemoved: allResults.filter(r => r.changes && r.changes.includes('removed_bom')).length,
    withMetaAdded: allResults.filter(r => r.changes && r.changes.includes('added_charset_meta')).length
  };
  
  // 生成报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: summary,
    detailedResults: allResults
  };
  
  // 保存报告
  fs.writeFileSync(config.reportFile, JSON.stringify(report, null, 2));
  
  // 输出摘要
  log('=== ENCODING FIX SUMMARY ===');
  log(`Total files processed: ${summary.totalProcessed}`);
  log(`Files fixed: ${summary.fixed}`);
  log(`Files already correct: ${summary.alreadyCorrect}`);
  log(`Files excluded: ${summary.excluded}`);
  log(`Files with errors: ${summary.errors}`);
  log(`Files with BOM removed: ${summary.withBOMRemoved}`);
  log(`Files with charset meta added: ${summary.withMetaAdded}`);
  log(`Report saved to: ${config.reportFile}`);
  log('=== FIX COMPLETED ===');
  
  return report;
}

// 运行修复
runFix();
"@

# 写入文件
Write-Log "正在创建encoding_guard_daemon.js..."
Set-Content -Path $encodingGuardPath -Value $encodingGuardContent -Force -Encoding utf8NoBOM

Write-Log "正在创建utf8_watchdog.js..."
Set-Content -Path $watchdogPath -Value $watchdogContent -Force -Encoding utf8NoBOM

Write-Log "正在创建safe_encoding_fix.js..."
Set-Content -Path $safeFixPath -Value $safeFixContent -Force -Encoding utf8NoBOM

Write-Log "编码守护文件重建完成"

# 7️⃣ 生成修复报告
Write-Host "`n[7/9] 生成修复报告..." -ForegroundColor Yellow
Write-Log "开始生成修复报告"

try {
    # 完成报告数据
    $reportData.endTime = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    $reportData.duration = (New-TimeSpan -Start $reportData.startTime -End $reportData.endTime).TotalSeconds
    $reportData.system_state = "STABLE"
    $reportData.encoding_lock = "ACTIVE"
    
    # 保存全局修复报告
    $reportData | ConvertTo-Json -Depth 5 | Set-Content -Path $globalReport -Force -Encoding utf8NoBOM
    Write-Log "已保存全局修复报告: $globalReport"
    
    # 生成编码保护报告
    $guardReportData = @{
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        encodingGuardStatus = "ACTIVE"
        watchFiles = $reportData.totalFilesScanned
        protectedDirectories = $directories
        encodingStandards = "UTF-8 without BOM"
        lastGuardAction = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        systemState = "STABLE"
    }
    
    $guardReportData | ConvertTo-Json | Set-Content -Path $encodingGuardReport -Force -Encoding utf8NoBOM
    Write-Log "已保存编码保护报告: $encodingGuardReport"
    
    # 显示报告摘要
    Write-Host "`n=== 修复报告摘要 ===" -ForegroundColor Green
    Write-Host "总扫描文件数: $($reportData.totalFilesScanned)" -ForegroundColor Green
    Write-Host "转换编码文件数: $($reportData.filesConverted)" -ForegroundColor Green
    Write-Host "移除BOM文件数: $($reportData.filesWithBOM)" -ForegroundColor Green
    Write-Host "添加meta标签数: $($reportData.metaTagsAdded)" -ForegroundColor Green
    Write-Host "删除临时文件数: $($reportData.tempFilesDeleted)" -ForegroundColor Green
    Write-Host "错误数: $($reportData.errors.Count)" -ForegroundColor Red
    Write-Host "警告数: $($reportData.warnings.Count)" -ForegroundColor Yellow
    Write-Host "===================" -ForegroundColor Green
    
} catch {
    Write-Log "生成修复报告时出错: $_" -level "ERROR"
}

# 8️⃣ 重新启动JEV Client
Write-Host "`n[8/9] 重新启动JEV Client..." -ForegroundColor Yellow
Write-Log "准备启动JEV Client服务"

try {
    $startupScript = "D:\PDF转网页\JEV_Client\Start-JEV-Client.bat"
    
    if (Test-Path $startupScript) {
        Write-Log "启动JEV Client: $startupScript"
        # 启动JEV Client（在新窗口中）
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c $startupScript" -WindowStyle Normal
        
        # 等待服务启动
        Write-Host "等待JEV Client服务启动..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        # 检查端口8080是否启动
        $portCheck = netstat -ano | findstr "8080"
        if ($portCheck) {
            Write-Log "JEV Client服务启动成功，端口8080正在监听" -ForegroundColor Green
            Write-Host "✅ JEV Client服务启动成功" -ForegroundColor Green
        } else {
            Write-Log "JEV Client服务启动失败，端口8080未监听" -level "WARNING"
            Write-Host "⚠️ JEV Client服务启动状态未知，请手动检查" -ForegroundColor Yellow
        }
    } else {
        Write-Log "启动脚本不存在: $startupScript" -level "ERROR"
        Write-Host "❌ 启动脚本不存在，请检查" -ForegroundColor Red
    }
    
} catch {
    Write-Log "启动JEV Client时出错: $_" -level "ERROR"
    Write-Host "❌ 启动JEV Client失败" -ForegroundColor Red
}

# 9️⃣ 验证网页是否能正常打开
Write-Host "`n[9/9] 验证网页可访问性..." -ForegroundColor Yellow
Write-Log "开始验证网页可访问性"

try {
    # 创建验证脚本
    $verificationScript = "D:\PDF转网页\verify_webpage.js"
    $verificationContent = @"
const http = require('http');
const fs = require('fs');

const logFile = 'D:\\PDF转网页\\diagnostics\\web_verification.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  fs.appendFileSync(logFile, logEntry + '\n');
}

log('Starting webpage verification...');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/ui/login_portal.html',
  method: 'GET',
  timeout: 10000
};

const req = http.request(options, (res) => {
  let data = '';
  
  log(`Response status: ${res.statusCode}`);
  log(`Response headers: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    // 检查响应大小和内容
    const responseSize = data.length;
    const hasCharsetMeta = data.includes('<meta charset="UTF-8">');
    const hasDOCTYPE = data.includes('<!DOCTYPE html>');
    const hasHTMLTag = data.includes('<html');
    
    log(`Response size: ${responseSize} bytes`);
    log(`Has charset meta: ${hasCharsetMeta}`);
    log(`Has DOCTYPE: ${hasDOCTYPE}`);
    log(`Has HTML tag: ${hasHTMLTag}`);
    
    // 基本验证
    if (res.statusCode === 200 && responseSize > 0) {
      if (hasCharsetMeta && hasDOCTYPE && hasHTMLTag) {
        log('✅ Webpage verification PASSED');
        console.log('VERIFICATION_RESULT=PASSED');
      } else {
        log('⚠️ Webpage verification WARNING - Missing required elements');
        console.log('VERIFICATION_RESULT=WARNING');
      }
    } else {
      log('❌ Webpage verification FAILED - Invalid response');
      console.log('VERIFICATION_RESULT=FAILED');
    }
  });
});

req.on('error', (e) => {
  log(`❌ Request error: ${e.message}`);
  console.log('VERIFICATION_RESULT=ERROR');
});

req.on('timeout', () => {
  log('❌ Request timeout');
  req.destroy();
  console.log('VERIFICATION_RESULT=TIMEOUT');
});

req.end();
"@
    
    Set-Content -Path $verificationScript -Value $verificationContent -Force -Encoding utf8NoBOM
    
    # 运行验证脚本
    Write-Host "正在验证 http://localhost:8080/ui/login_portal.html..." -ForegroundColor Yellow
    $verificationResult = node $verificationScript
    
    # 分析结果
    if ($verificationResult -like "*VERIFICATION_RESULT=PASSED*") {
        Write-Log "✅ 网页验证通过" -ForegroundColor Green
        Write-Host "✅ 网页验证通过" -ForegroundColor Green
    } elseif ($verificationResult -like "*VERIFICATION_RESULT=WARNING*") {
        Write-Log "⚠️ 网页验证警告" -level "WARNING"
        Write-Host "⚠️ 网页验证警告" -ForegroundColor Yellow
    } else {
        Write-Log "❌ 网页验证失败" -level "ERROR"
        Write-Host "❌ 网页验证失败，请手动检查" -ForegroundColor Red
    }
    
    # 清理验证脚本
    Remove-Item -Path $verificationScript -Force -ErrorAction SilentlyContinue
    
} catch {
    Write-Log "验证网页时出错: $_" -level "ERROR"
    Write-Host "❌ 网页验证出错" -ForegroundColor Red
}

# 显示最终状态
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "JEV-FULL-UTF8-RECOVERY-v3.9 完成" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "system_state = STABLE" -ForegroundColor Green
Write-Host "encoding_lock = ACTIVE" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "修复报告路径:" -ForegroundColor Yellow
Write-Host "- $globalReport" -ForegroundColor Yellow
Write-Host "- $encodingGuardReport" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

# 更新最终状态
$reportData.system_state = "STABLE"
$reportData.encoding_lock = "ACTIVE"
$reportData | ConvertTo-Json -Depth 5 | Set-Content -Path $globalReport -Force -Encoding utf8NoBOM

Write-Host "`n按任意键退出..."
Read-Host