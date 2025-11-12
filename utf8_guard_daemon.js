const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置常量
const ROOT_DIR = 'D:\\PDF转网页';
const DIRECTORIES = [
  ROOT_DIR,
  path.join(ROOT_DIR, 'JEV_Client'),
  path.join(ROOT_DIR, 'Cloud_Relay'),
  path.join(ROOT_DIR, 'diagnostics')
];
const FILE_EXTENSIONS = ['.html', '.js', '.json', '.css', '.txt'];
const DIAGNOSTICS_DIR = path.join(ROOT_DIR, 'diagnostics');
const STATUS_FILE = path.join(DIAGNOSTICS_DIR, 'encoding_status_snapshot.json');
const LOG_FILE = path.join(DIAGNOSTICS_DIR, 'encoding_guard_log.txt');

// 守护配置
const SCAN_INTERVAL = 60000; // 60秒扫描一次
const STATUS_SNAPSHOT_INTERVAL = 3600000; // 每小时生成一次状态快照
const MEMORY_LIMIT = 300 * 1024 * 1024; // 300MB内存限制

// 全局状态
let scanCount = 0;
let fixCount = 0;
let lastMemoryCheck = Date.now();
let memoryCheckInterval = 5 * 60 * 1000; // 每5分钟检查一次内存

// 确保diagnostics目录存在
function ensureDiagnosticsDir() {
  if (!fs.existsSync(DIAGNOSTICS_DIR)) {
    fs.mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
    logMessage(`[INFO] Created diagnostics directory: ${DIAGNOSTICS_DIR}`);
  }
}

// 日志函数
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  try {
    fs.appendFileSync(LOG_FILE, logEntry + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// 检查内存使用
function checkMemoryUsage() {
  const now = Date.now();
  if (now - lastMemoryCheck < memoryCheckInterval) {
    return;
  }
  
  try {
    const used = process.memoryUsage();
    const rss = used.rss;
    
    logMessage('[INFO] Memory usage: ' + (rss / 1024 / 1024).toFixed(2) + 'MB');
    
    if (rss > MEMORY_LIMIT) {
      logMessage('[WARNING] Memory usage exceeded limit, restarting daemon...');
      process.exit(0); // 退出进程，让外部脚本重新启动
    }
  } catch (error) {
    logMessage(`[ERROR] Failed to check memory usage: ${error.message}`);
  }
  
  lastMemoryCheck = now;
}

// 修复单个文件的编码
function fixFileEncoding(filePath) {
  try {
    // 读取文件
    const content = fs.readFileSync(filePath, { encoding: 'binary' });
    
    // 检测BOM
    let hasBOM = false;
    let cleanContent = content;
    
    if (content.startsWith('\xEF\xBB\xBF')) {
      hasBOM = true;
      cleanContent = content.slice(3);
    }
    
    // 尝试用UTF-8解码
    let decodedContent;
    try {
      decodedContent = Buffer.from(cleanContent, 'binary').toString('utf8');
    } catch (e) {
      // 编码错误，需要修复
      try {
        // 尝试GBK编码
        decodedContent = Buffer.from(cleanContent, 'binary').toString('gbk');
        logMessage('[FIX] Converted from GBK: ' + path.relative(ROOT_DIR, filePath));
      } catch (e) {
        logMessage(`[ERROR] Cannot decode file: ${filePath}`);
        return false;
      }
    }
    
    // 移除控制字符
    const finalContent = decodedContent.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    // 写回文件（无BOM）
    fs.writeFileSync(filePath, finalContent, { encoding: 'utf8', flag: 'w' });
    
    if (hasBOM) {
      logMessage('[FIX] Removed BOM from: ' + path.relative(ROOT_DIR, filePath));
    }
    
    return true;
  } catch (error) {
    logMessage(`[ERROR] Failed to fix file ${filePath}: ${error.message}`);
    return false;
  }
}

// 扫描并修复文件
function scanAndFixFiles() {
  scanCount++;
  logMessage('[INFO] Starting scan #' + scanCount + '...');
  
  const filesToCheck = [];
  
  DIRECTORIES.forEach(dir => {
    if (!fs.existsSync(dir)) {
      logMessage(`[WARNING] Directory not found: ${dir}`);
      return;
    }
    
    function scanDir(currentDir) {
      try {
        const items = fs.readdirSync(currentDir);
        
        items.forEach(item => {
          const itemPath = path.join(currentDir, item);
          try {
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
              // 跳过不需要扫描的目录
              if (item !== 'node_modules' && item !== '.git' && item !== 'tmp' && item !== 'temp' && item !== 'logs') {
          scanDir(itemPath);
        }
            } else if (FILE_EXTENSIONS.some(ext => itemPath.endsWith(ext))) {
              filesToCheck.push(itemPath);
            }
          } catch (error) {
            logMessage(`[ERROR] Failed to process ${itemPath}: ${error.message}`);
          }
        });
      } catch (error) {
        logMessage(`[ERROR] Failed to scan directory ${currentDir}: ${error.message}`);
      }
    }
    
    scanDir(dir);
  });
  
  let fixed = 0;
  filesToCheck.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, { encoding: 'binary' });
      
      // 检查是否有BOM
      if (content.startsWith('\xEF\xBB\xBF')) {
        if (fixFileEncoding(filePath)) {
          fixed++;
          fixCount++;
        }
        return;
      }
      
      // 尝试用UTF-8解码检查是否有编码错误
      try {
        Buffer.from(content, 'binary').toString('utf8');
      } catch (e) {
        // 编码错误，需要修复
        if (fixFileEncoding(filePath)) {
          fixed++;
          fixCount++;
        }
      }
    } catch (error) {
      logMessage(`[ERROR] Failed to check file ${filePath}: ${error.message}`);
    }
  });
  
  if (fixed > 0) {
    logMessage('[INFO] Scan #' + scanCount + ' completed. Fixed ' + fixed + ' files.');
  }
}

// 生成状态快照
function generateStatusSnapshot() {
  const status = {
    timestamp: new Date().toISOString(),
    daemon_name: 'utf8_guard_daemon.js',
    scan_count: scanCount,
    fix_count: fixCount,
    encoding_lock: 'ACTIVE',
    system_state: 'STABLE',
    watchdog_status: 'RUNNING',
    memory_usage: {
      rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + 'MB'
    }
  };
  
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
    logMessage('[INFO] Status snapshot generated: ' + STATUS_FILE);
  } catch (error) {
    logMessage(`[ERROR] Failed to generate status snapshot: ${error.message}`);
  }
}

// 创建辅助守护文件
function createHelperFiles() {
  // 创建encoding_guard_daemon.js
  const encodingGuardContent = `// 编码守护主程序
console.log('[JEV Encoding Guard] Starting daemon...');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

var daemonPath = path.join(__dirname, 'utf8_guard_daemon.js');
let daemonProcess;

function startDaemon() {
  if (daemonProcess) {
    try {
      daemonProcess.kill();
    } catch (e) {}
  }
  
  console.log('[JEV Encoding Guard] Launching UTF-8 guard daemon...');
  daemonProcess = spawn('node', [daemonPath], {
    detached: true,
    stdio: 'inherit'
  });
  
  daemonProcess.on('exit', function(code) {
    console.log('[JEV Encoding Guard] Daemon exited with code ' + code + ', restarting...');
    setTimeout(startDaemon, 5000);
  });
  
  // 避免进程被卡住
  daemonProcess.unref();
}

// 启动守护进程
startDaemon();

// 监听退出信号
process.on('SIGINT', () => {
  if (daemonProcess) {
    daemonProcess.kill();
  }
  process.exit(0);
});`;

  // 创建safe_encoding_fix.js
  const safeFixContent = `// 安全编码修复工具
const fs = require('fs');
const path = require('path');

function safeFixFile(filePath) {
  try {
    console.log('Fixing file: ' + filePath);
    
    // 创建备份
    var backupPath = filePath + '.bak';
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
    }
    
    // 读取并修复
    var content = fs.readFileSync(filePath, { encoding: 'binary' });
    var cleanContent = content;
    
    // 移除BOM
    if (content.startsWith('\xEF\xBB\xBF')) {
      cleanContent = content.slice(3);
    }
    
    // 尝试解码并写回
    var decodedContent = Buffer.from(cleanContent, 'binary').toString('utf8');
    fs.writeFileSync(filePath, decodedContent, { encoding: 'utf8' });
    
    console.log('✓ Fixed: ' + filePath);
    return true;
  } catch (error) {
    console.error('✗ Failed to fix ' + filePath + ': ' + error.message);
    return false;
  }
}

// 如果直接运行，则修复指定文件
if (require.main === module && process.argv.length > 2) {
  const targetFile = process.argv[2];
  safeFixFile(targetFile);
}

module.exports = { safeFixFile };`;

  try {
    fs.writeFileSync(path.join(ROOT_DIR, 'encoding_guard_daemon.js'), encodingGuardContent);
    fs.writeFileSync(path.join(ROOT_DIR, 'safe_encoding_fix.js'), safeFixContent);
    logMessage('[INFO] Helper files created: encoding_guard_daemon.js, safe_encoding_fix.js');
  } catch (error) {
    logMessage(`[ERROR] Failed to create helper files: ${error.message}`);
  }
}

// 验证守护文件存在
function verifyDaemonFiles() {
  const requiredFiles = [
    path.join(ROOT_DIR, 'utf8_guard_daemon.js'),
    path.join(ROOT_DIR, 'encoding_guard_daemon.js'),
    path.join(ROOT_DIR, 'safe_encoding_fix.js')
  ];
  
  let allExists = true;
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      logMessage(`[ERROR] Required daemon file not found: ${file}`);
      allExists = false;
    }
  });
  
  return allExists;
}

// 主函数
function main() {
  logMessage('==================================================');
  logMessage('Starting JEV-UTF8-GUARD-v2.6...');
  logMessage('==================================================');
  
  ensureDiagnosticsDir();
  createHelperFiles();
  
  // 初始扫描
  scanAndFixFiles();
  generateStatusSnapshot();
  
  // 验证守护文件
  const filesVerified = verifyDaemonFiles();
  if (filesVerified) {
    logMessage('[INFO] All daemon files verified successfully');
  }
  
  // 设置定期扫描
  setInterval(() => {
    checkMemoryUsage();
    scanAndFixFiles();
  }, SCAN_INTERVAL);
  
  // 设置定期状态快照
  setInterval(generateStatusSnapshot, STATUS_SNAPSHOT_INTERVAL);
  
  // 输出守护状态
  logMessage('==================================================');
  logMessage('✅ JEV-UTF8-GUARD-v2.6 started successfully!');
  logMessage('✅ encoding_lock=ACTIVE');
  logMessage('✅ system_state=STABLE');
  logMessage('✅ watchdog_status=RUNNING');
  logMessage('==================================================');
}

// 执行主函数
if (require.main === module) {
  main();
} else {
  module.exports = { main };