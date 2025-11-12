// JEV编码守护核心进程 v1.0
// 提供第二层编码保护，监控系统编码稳定性并提供实时防护

var fs = require('fs');
var path = require('path');
var os = require('os');

// 配置参数
var CONFIG = {
    targetDirectories: [
        'D:\\PDF转网页\\JEV_Client',
        'D:\\PDF转网页\\JEV_Client_Web',
        'D:\\PDF转网页\\Cloud_Relay',
        'D:\\PDF转网页\\JEV_ControlCenter'
    ],
    scanInterval: 15 * 60 * 1000, // 15分钟扫描一次
    statusInterval: 5 * 60 * 1000, // 5分钟更新状态
    maxFileSize: 10 * 1024 * 1024, // 10MB限制
    logFile: 'D:\\PDF转网页\\logs\\jev_encoding_guard.log',
    lockFile: 'D:\\PDF转网页\\encoding_lock.json',
    diagnosticsDir: 'D:\\PDF转网页\\diagnostics'
};

// 状态变量
var daemonState = {
    isRunning: true,
    lastScanTime: null,
    lastFixCount: 0,
    totalFixCount: 0,
    memoryUsage: 0,
    responseTime: 0,
    loopFixDetected: false,
    recentFixes: []
};

// 确保日志目录存在
function ensureLogDir() {
    var logDir = path.dirname(CONFIG.logFile);
    try {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    } catch (error) {
        console.error('创建日志目录失败:', error.message);
    }
}

// 日志记录函数
function log(message) {
    var timestamp = new Date().toISOString();
    var logMessage = '[' + timestamp + '] ' + message;
    
    console.log(logMessage);
    
    try {
        fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
    } catch (error) {
        console.error('写入日志失败:', error.message);
    }
}

// 更新锁定文件状态
function updateLockFile(status) {
    try {
        var lockData = {
            status: status,
            timestamp: new Date().toISOString(),
            pid: process.pid,
            memoryUsage: process.memoryUsage().heapUsed
        };
        
        fs.writeFileSync(CONFIG.lockFile, JSON.stringify(lockData, null, 2));
        return true;
    } catch (error) {
        log('更新锁定文件失败: ' + error.message);
        return false;
    }
}

// 检查文件是否为UTF-8编码
function isUTF8(filePath) {
    try {
        var buffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' });
        
        // 检测UTF-8 BOM
        if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            return { isUTF8: true, hasBOM: true };
        }
        
        // 尝试以UTF-8解码
        try {
            buffer.toString('utf8');
            return { isUTF8: true, hasBOM: false };
        } catch (e) {
            return { isUTF8: false, hasBOM: false };
        }
    } catch (error) {
        return { isUTF8: false, hasBOM: false };
    }
}

// 修复文件编码
function fixFileEncoding(filePath) {
    try {
        var stat = fs.statSync(filePath);
        if (stat.size > CONFIG.maxFileSize) {
            log('跳过大型文件: ' + filePath + ' (' + Math.round(stat.size / (1024 * 1024)) + 'MB)');
            return false;
        }
        
        var buffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' });
        var content;
        
        // 移除BOM或转换编码
        if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            // 移除BOM
            content = buffer.slice(3).toString('utf8');
            fs.writeFileSync(filePath, content, 'utf8');
            log('已修复BOM文件: ' + filePath);
            return true;
        } else {
            // 尝试转换为UTF-8
            try {
                content = buffer.toString('utf8');
                fs.writeFileSync(filePath, content, 'utf8');
                log('已转换文件为UTF-8: ' + filePath);
                return true;
            } catch (e) {
                // 对于无法转换的文件，尝试使用其他编码读取
                try {
                    content = buffer.toString('gbk');
                    fs.writeFileSync(filePath, content, 'utf8');
                    log('已从GBK转换为UTF-8: ' + filePath);
                    return true;
                } catch (e2) {
                    log('无法转换文件: ' + filePath);
                    return false;
                }
            }
        }
    } catch (error) {
        log('修复文件失败: ' + filePath + ' - ' + error.message);
        return false;
    }
}

// 扫描目录
function scanDirectory(dir) {
    var fixCount = 0;
    
    try {
        var files = fs.readdirSync(dir);
        files.forEach(function(file) {
            var filePath = path.join(dir, file);
            
            try {
                var stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    // 递归扫描子目录
                    fixCount += scanDirectory(filePath);
                } else if (stat.isFile()) {
                    // 跳过二进制文件
                    var extension = path.extname(file).toLowerCase();
                    var binaryExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.zip', '.rar', '.7z', '.exe', '.dll', '.bin', '.obj', '.jpg', '.jpeg', '.png'];
                    if (binaryExtensions.includes(extension)) {
                        return;
                    }
                    
                    // 检查并修复编码
                    var encodingResult = isUTF8(filePath);
                    if (!encodingResult.isUTF8 || encodingResult.hasBOM) {
                        if (fixFileEncoding(filePath)) {
                            fixCount++;
                            
                            // 记录最近的修复操作
                            daemonState.recentFixes.push({
                                file: filePath,
                                time: new Date().toISOString()
                            });
                            
                            // 只保留最近10条修复记录
                            if (daemonState.recentFixes.length > 10) {
                                daemonState.recentFixes.shift();
                            }
                        }
                    }
                }
            } catch (error) {
                // 忽略无法访问的文件
            }
        });
    } catch (error) {
        // 忽略无法访问的目录
    }
    
    return fixCount;
}

// 执行完整扫描
function runFullScan() {
    log('开始完整编码扫描...');
    var startTime = Date.now();
    var totalFixCount = 0;
    
    CONFIG.targetDirectories.forEach(function(dir) {
        if (fs.existsSync(dir)) {
            log('扫描目录: ' + dir);
            totalFixCount += scanDirectory(dir);
        } else {
            log('目录不存在: ' + dir);
        }
    });
    
    var endTime = Date.now();
    daemonState.lastScanTime = new Date().toISOString();
    daemonState.lastFixCount = totalFixCount;
    daemonState.totalFixCount += totalFixCount;
    daemonState.responseTime = endTime - startTime;
    
    log('扫描完成 - 修复文件数: ' + totalFixCount + ', 耗时: ' + (daemonState.responseTime) + 'ms');
    
    // 检查循环修复
    checkLoopFix();
    
    // 更新状态
    updateStatus();
}

// 检查循环修复情况
function checkLoopFix() {
    // 检查是否在短时间内有大量重复修复
    var recentFixesCount = daemonState.recentFixes.length;
    if (recentFixesCount >= 3) {
        // 简化检测：如果最近3次修复都发生在5分钟内，视为可能的循环
        var fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        var recentFixesInTimeframe = daemonState.recentFixes.filter(function(fix) {
            return new Date(fix.time).getTime() > fiveMinutesAgo;
        });
        
        if (recentFixesInTimeframe.length >= 3) {
            daemonState.loopFixDetected = true;
            log('警告: 检测到可能的循环修复情况!');
        } else {
            daemonState.loopFixDetected = false;
        }
    }
}

// 更新状态信息
function updateStatus() {
    daemonState.memoryUsage = process.memoryUsage().heapUsed;
    
    // 更新锁定文件
    updateLockFile('ACTIVE');
    
    // 生成状态报告
    var statusReport = {
        timestamp: new Date().toISOString(),
        daemonStatus: 'RUNNING',
        encodingLock: 'ACTIVE',
        systemState: daemonState.loopFixDetected ? 'WARNING' : 'STABLE',
        watchdogStatus: 'RUNNING',
        memoryUsage: daemonState.memoryUsage,
        lastScanTime: daemonState.lastScanTime,
        lastFixCount: daemonState.lastFixCount,
        totalFixCount: daemonState.totalFixCount,
        responseTime: daemonState.responseTime,
        loopFixDetected: daemonState.loopFixDetected
    };
    
    // 保存状态报告
    try {
        var statusPath = path.join(CONFIG.diagnosticsDir, 'jev_encoding_status.json');
        fs.writeFileSync(statusPath, JSON.stringify(statusReport, null, 2));
    } catch (error) {
        log('保存状态报告失败: ' + error.message);
    }
    
    log('状态已更新 - 内存使用: ' + Math.round(daemonState.memoryUsage / (1024 * 1024)) + 'MB');
}

// 清理函数
function cleanup() {
    log('正在停止编码守护进程...');
    daemonState.isRunning = false;
    
    // 更新锁定文件状态为INACTIVE
    updateLockFile('INACTIVE');
    
    log('编码守护进程已停止');
    process.exit(0);
}

// 处理信号
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', function(error) {
    log('未捕获异常: ' + error.message);
    log(error.stack);
    cleanup();
});

// 主函数
function main() {
    console.log('========================================');
    console.log('      JEV编码守护核心进程 v1.0          ');
    console.log('========================================');
    
    ensureLogDir();
    
    // 确保诊断目录存在
    try {
        if (!fs.existsSync(CONFIG.diagnosticsDir)) {
            fs.mkdirSync(CONFIG.diagnosticsDir, { recursive: true });
        }
    } catch (error) {
        log('创建诊断目录失败: ' + error.message);
    }
    
    log('编码守护进程已启动');
    
    // 初始扫描
    runFullScan();
    
    // 设置定期扫描
    setInterval(runFullScan, CONFIG.scanInterval);
    
    // 设置状态更新
    setInterval(updateStatus, CONFIG.statusInterval);
    
    // 标记为运行中
    updateLockFile('ACTIVE');
}

// 启动守护进程
main();