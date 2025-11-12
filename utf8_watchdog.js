// JEV-MULTI-LAYER-SCAN-SCHEDULER v3.5 - Layer 1: 实时监测层 (Watchdog)
// 周期：每 5 分钟
// 功能：监听JEV_Client与JEV_Client_Web文件变化，检测并修复非UTF-8文件

var fs = require('fs');
var path = require('path');
var chokidar = require('chokidar');
var iconv = require('iconv-lite');

var basePath = 'D:\\PDF转网页';
var watchdogLogPath = path.join(basePath, 'diagnostics', 'watchdog_repair_log.txt');
var monitoredDirs = [
    path.join(basePath, 'JEV_Client'),
    path.join(basePath, 'JEV_Client_Web')
];

// 确保日志文件存在
if (!fs.existsSync(watchdogLogPath)) {
    fs.writeFileSync(watchdogLogPath, '=== JEV UTF-8 Watchdog Log ===\n', 'utf8');
}

// 日志函数
function logMessage(message) {
    var timestamp = new Date().toISOString();
    var logEntry = '[' + timestamp + '] ' + message + '\n';
    console.log(logEntry.trim());
    fs.appendFileSync(watchdogLogPath, logEntry, 'utf8');
}

// 检查文件是否为UTF-8编码
function isUTF8(filename) {
    try {
        var content = fs.readFileSync(filename, 'utf8');
        // 尝试解析JSON文件，确保内容有效
        if (filename.endsWith('.json')) {
            JSON.parse(content);
        }
        return true;
    } catch (e) {
        return false;
    }
}

// 修复文件编码为UTF-8
function fixFileEncoding(filePath) {
    try {
        // 检查文件大小（限制10MB）
        var stats = fs.statSync(filePath);
        if (stats.size > 10 * 1024 * 1024) {
            logMessage('SKIP: 文件过大 (' + (stats.size / 1024 / 1024).toFixed(2) + 'MB) - ' + filePath);
            return false;
        }

        // 尝试用GBK读取并转换为UTF-8
        var buffer = fs.readFileSync(filePath);
        var content;
        
        try {
            // 首先尝试直接读取为UTF-8
            content = buffer.toString('utf8');
        } catch (e) {
            // 如果失败，尝试GBK编码
            try {
                content = iconv.decode(buffer, 'gbk');
                logMessage('FIX: GBK转换为UTF-8 - ' + filePath);
            } catch (e2) {
                // 如果都失败，尝试检测编码
                content = iconv.decode(buffer, 'utf8');
                logMessage('FIX: 未知编码修复 - ' + filePath);
            }
        }

        // 移除BOM
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
            logMessage('FIX: 移除BOM - ' + filePath);
        }

        // 写回文件（UTF-8无BOM）
        fs.writeFileSync(filePath, content, { encoding: 'utf8', flag: 'w' });
        logMessage('FIXED: 文件已修复为UTF-8 - ' + filePath);
        return true;
    } catch (e) {
        logMessage('ERROR: 修复文件失败 - ' + filePath + ' - ' + e.message);
        return false;
    }
}

// 扫描目录下的所有文件
function scanDirectory(dirPath) {
    try {
        var files = fs.readdirSync(dirPath);
        files.forEach(function(file) {
            var filePath = path.join(dirPath, file);
            var stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                // 递归扫描子目录
                scanDirectory(filePath);
            } else if (stats.isFile()) {
                // 跳过二进制文件
                var ext = path.extname(file).toLowerCase();
                if (['.js', '.html', '.css', '.json', '.txt', '.md', '.log', '.xml'].includes(ext)) {
                    if (!isUTF8(filePath)) {
                        fixFileEncoding(filePath);
                    }
                }
            }
        });
    } catch (e) {
        logMessage('ERROR: 扫描目录失败 - ' + dirPath + ' - ' + e.message);
    }
}

// 初始化监听
function startWatcher() {
    logMessage('JEV UTF-8 Watchdog 启动');
    logMessage('开始监听目录: ' + monitoredDirs.join(', '));

    // 初始扫描
    monitoredDirs.forEach(function(dir) {
        if (fs.existsSync(dir)) {
            logMessage('初始扫描目录: ' + dir);
            scanDirectory(dir);
        }
    });

    // 设置文件监听
    var watcher = chokidar.watch(monitoredDirs, {
        ignored: /(^|\/|\\)\../, // 忽略隐藏文件
        persistent: true,
        usePolling: true,
        interval: 100,
        binaryInterval: 300
    });

    watcher
        .on('add', function(path) {
            logMessage('检测到新文件: ' + path);
            setTimeout(function() {
                if (!isUTF8(path)) {
                    fixFileEncoding(path);
                }
            }, 1000);
        })
        .on('change', function(path) {
            logMessage('检测到文件修改: ' + path);
            setTimeout(function() {
                if (!isUTF8(path)) {
                    fixFileEncoding(path);
                }
            }, 1000);
        })
        .on('error', function(error) {
            logMessage('监听错误: ' + error);
        });

    logMessage('监听已启动，按 Ctrl+C 停止');
}

// 检查是否安装了必要的依赖
function checkDependencies() {
    try {
        require('chokidar');
        require('iconv-lite');
        return true;
    } catch (e) {
        logMessage('警告: 缺少依赖包，请先安装: npm install chokidar iconv-lite');
        return false;
    }
}

// 启动程序
logMessage('JEV-MULTI-LAYER-SCAN-SCHEDULER v3.5 - Layer 1 Watchdog 初始化');
if (checkDependencies()) {
    startWatcher();
} else {
    logMessage('启动失败，请安装依赖后重试');
}

// 设置内存限制检查
setInterval(function() {
    var memUsage = process.memoryUsage();
    var rssMB = (memUsage.rss / 1024 / 1024).toFixed(2);
    if (rssMB > 300) {
        logMessage('警告: 内存使用过高 (' + rssMB + 'MB)，建议重启服务');
    }
}, 60000);