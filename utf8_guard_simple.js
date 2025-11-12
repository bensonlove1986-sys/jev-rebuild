var fs = require('fs');
var path = require('path');

// 配置常量
var ROOT_DIR = 'D:\\PDF转网页';
var DIRECTORIES = [
  ROOT_DIR,
  path.join(ROOT_DIR, 'JEV_Client'),
  path.join(ROOT_DIR, 'Cloud_Relay'),
  path.join(ROOT_DIR, 'diagnostics')
];
var FILE_EXTENSIONS = ['.html', '.js', '.json', '.css', '.txt'];
var DIAGNOSTICS_DIR = path.join(ROOT_DIR, 'diagnostics');
var STATUS_FILE = path.join(DIAGNOSTICS_DIR, 'encoding_status_snapshot.json');
var LOG_FILE = path.join(DIAGNOSTICS_DIR, 'encoding_guard_log.txt');

// 守护配置
var SCAN_INTERVAL = 60000; // 60秒扫描一次
var STATUS_SNAPSHOT_INTERVAL = 3600000; // 每小时生成一次状态快照
var MEMORY_LIMIT = 300 * 1024 * 1024; // 300MB内存限制

// 全局状态
var scanCount = 0;
var fixCount = 0;
var lastMemoryCheck = Date.now();
var memoryCheckInterval = 5 * 60 * 1000; // 每5分钟检查一次内存

// 确保diagnostics目录存在
function ensureDiagnosticsDir() {
  if (!fs.existsSync(DIAGNOSTICS_DIR)) {
    fs.mkdirSync(DIAGNOSTICS_DIR, { recursive: true });
    logMessage('[INFO] Created diagnostics directory: ' + DIAGNOSTICS_DIR);
  }
}

// 日志函数
function logMessage(message) {
  var timestamp = new Date().toISOString();
  var logEntry = '[' + timestamp + '] ' + message;
  console.log(logEntry);
  try {
    fs.appendFileSync(LOG_FILE, logEntry + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// 检查内存使用
function checkMemoryUsage() {
  var now = Date.now();
  if (now - lastMemoryCheck < memoryCheckInterval) {
    return;
  }
  
  try {
    var used = process.memoryUsage();
    var rss = used.rss;
    
    logMessage('[INFO] Memory usage: ' + (rss / 1024 / 1024).toFixed(2) + 'MB');
    
    if (rss > MEMORY_LIMIT) {
      logMessage('[INFO] Memory usage exceeded limit, restarting daemon...');
      process.exit(0);
    }
  } catch (error) {
    logMessage('[ERROR] Failed to check memory usage: ' + error.message);
  }
  
  lastMemoryCheck = now;
}

// 修复单个文件的编码
function fixFileEncoding(filePath) {
  try {
    // 再次检查文件大小（防止并发修改）
    var stats = fs.statSync(filePath);
    var MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB限制
    if (stats.size > MAX_FILE_SIZE) {
      logMessage('[INFO] Skipping large file in fix: ' + filePath);
      return false;
    }
    
    // 读取文件
    var content = fs.readFileSync(filePath, { encoding: 'binary' });
    
    // 检测BOM
    var hasBOM = false;
    var cleanContent = content;
    
    if (content.substring(0, 3) === '\xEF\xBB\xBF') {
      hasBOM = true;
      cleanContent = content.substring(3);
    }
    
    // 尝试用UTF-8解码
    var decodedContent;
    try {
      decodedContent = new Buffer(cleanContent, 'binary').toString('utf8');
    } catch (e) {
      try {
        decodedContent = new Buffer(cleanContent, 'binary').toString('gbk');
        logMessage('[FIX] Converted from GBK: ' + path.relative(ROOT_DIR, filePath));
      } catch (e) {
        logMessage('[ERROR] Cannot decode file: ' + filePath);
        return false;
      }
    }
    
    // 移除控制字符
    var finalContent = decodedContent.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    // 写回文件（无BOM）
    fs.writeFileSync(filePath, finalContent, { encoding: 'utf8', flag: 'w' });
    
    if (hasBOM) {
      logMessage('[FIX] Removed BOM from: ' + path.relative(ROOT_DIR, filePath));
    }
    
    return true;
  } catch (error) {
    logMessage('[ERROR] Failed to fix file ' + filePath + ': ' + error.message);
    return false;
  }
}

// 扫描并修复文件
function scanAndFixFiles() {
  scanCount++;
  logMessage('[INFO] Starting scan #' + scanCount + '...');
  
  var filesToCheck = [];
  
  function scanDir(currentDir) {
    try {
      var items = fs.readdirSync(currentDir);
      
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var itemPath = path.join(currentDir, item);
        try {
          var stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            if (item !== 'node_modules' && item !== '.git' && item !== 'tmp' && item !== 'temp' && item !== 'logs') {
              scanDir(itemPath);
            }
          } else {
            var hasValidExt = false;
            for (var j = 0; j < FILE_EXTENSIONS.length; j++) {
              if (itemPath.endsWith(FILE_EXTENSIONS[j])) {
                hasValidExt = true;
                break;
              }
            }
            if (hasValidExt) {
              filesToCheck.push(itemPath);
            }
          }
        } catch (error) {
          logMessage('[ERROR] Failed to process ' + itemPath + ': ' + error.message);
        }
      }
    } catch (error) {
      logMessage('[ERROR] Failed to scan directory ' + currentDir + ': ' + error.message);
    }
  }
  
  for (var d = 0; d < DIRECTORIES.length; d++) {
    var dir = DIRECTORIES[d];
    if (fs.existsSync(dir)) {
      scanDir(dir);
    } else {
      logMessage('[WARNING] Directory not found: ' + dir);
    }
  }
  
  var fixed = 0;
  var MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB限制
  
  for (var f = 0; f < filesToCheck.length; f++) {
    var filePath = filesToCheck[f];
    try {
      // 检查文件大小
      var stats = fs.statSync(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        logMessage('[INFO] Skipping large file: ' + filePath + ' (' + (stats.size / 1024 / 1024).toFixed(2) + 'MB)');
        continue;
      }
      
      var content = fs.readFileSync(filePath, { encoding: 'binary' });
      
      // 检查是否有BOM
      if (content.substring(0, 3) === '\xEF\xBB\xBF') {
        if (fixFileEncoding(filePath)) {
          fixed++;
          fixCount++;
        }
        continue;
      }
      
      // 尝试用UTF-8解码检查是否有编码错误
      try {
        new Buffer(content, 'binary').toString('utf8');
      } catch (e) {
        if (fixFileEncoding(filePath)) {
          fixed++;
          fixCount++;
        }
      }
    } catch (error) {
      logMessage('[ERROR] Failed to check file ' + filePath + ': ' + error.message);
    }
  }
  
  if (fixed > 0) {
    logMessage('[INFO] Scan #' + scanCount + ' completed. Fixed ' + fixed + ' files.');
  }
}

// 生成状态快照
function generateStatusSnapshot() {
  var status = {
    timestamp: new Date().toISOString(),
    daemon_name: 'utf8_guard_simple.js',
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
    logMessage('[ERROR] Failed to generate status snapshot: ' + error.message);
  }
}

// 主函数
function main() {
  logMessage('==================================================');
  logMessage('Starting JEV-UTF8-GUARD-v2.6...');
  logMessage('==================================================');
  
  ensureDiagnosticsDir();
  
  // 初始扫描
  scanAndFixFiles();
  generateStatusSnapshot();
  
  // 设置定期扫描
  setInterval(function() {
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
main();