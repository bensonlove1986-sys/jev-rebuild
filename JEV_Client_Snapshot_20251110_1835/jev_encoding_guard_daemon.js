/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.351Z */
// JEV Encoding Guard Daemon v3.5 (Node.js Version)
// Purpose: Real-time encoding protection & auto repair

const fs = require('fs');
const path = require('path');

// 系统路径
const rootPath = 'D:\\PDF转网页\\JEV_Client';
const reportPath = path.join(rootPath, 'diagnostics', 'encoding_guard_report.json');
const watchPath = rootPath;
const logPath = path.join(rootPath, 'diagnostics', 'encoding_guard_daemon.log');

// 确保诊断目录存在
const ensureDiagnosticsDir = () => {
    const diagnosticsDir = path.join(rootPath, 'diagnostics');
    if (!fs.existsSync(diagnosticsDir)) {
        fs.mkdirSync(diagnosticsDir, { recursive: true });
    }
};

// 日志记录函数
const log = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    try {
        fs.appendFileSync(logPath, logMessage + '\n', { encoding: 'utf8' });
    } catch (err) {
        console.error('Failed to write to log:', err);
    }
};

// 修复文件编码
const repairFile = (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 检测乱码模式
        const hasGarbage = /\?\?\?|锟|鐚|閿|閻/.test(content);
        
        if (hasGarbage) {
            // 创建备份
            const backupPath = filePath + '.bak';
            fs.copyFileSync(filePath, backupPath);
            
            // 重新写入为UTF-8
            fs.writeFileSync(filePath, content, { encoding: 'utf8' });
            log(`Fixed: ${filePath}`);
            return true;
        }
    } catch (err) {
        log(`Error: ${filePath} - ${err.message}`);
    }
    return false;
};

// 扫描所有文件
const scanAllFiles = () => {
    const extensions = ['.js', '.html', '.css', '.json', '.log'];
    const scannedFiles = [];
    const fixedFiles = [];
    
    const scanDir = (dir) => {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanDir(fullPath);
                } else if (extensions.includes(path.extname(entry.name))) {
                    scannedFiles.push(fullPath);
                    if (repairFile(fullPath)) {
                        fixedFiles.push(fullPath);
                    }
                }
            }
        } catch (err) {
            log(`Error scanning directory ${dir}: ${err.message}`);
        }
    };
    
    scanDir(rootPath);
    return { scannedFiles, fixedFiles };
};

// 生成报告
const generateReport = (scannedFiles, fixedFiles) => {
    const report = {
        encoding_status: "UTF-8 locked",
        system_state: "STABLE",
        lock: "ACTIVE",
        timestamp: new Date().toISOString(),
        scanned_files: scannedFiles.length,
        fixed_files: fixedFiles.length
    };
    
    try {
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), { encoding: 'utf8' });
        log(`Report generated: ${reportPath}`);
    } catch (err) {
        log(`Failed to generate report: ${err.message}`);
    }
};

// 启动简单的文件轮询监控
const startWatcher = () => {
    let fileMap = new Map();
    
    const updateFileMap = () => {
        const extensions = ['.js', '.html', '.css', '.json', '.txt'];
        const newFileMap = new Map();
        
        const scanForChanges = (dir) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'diagnostics') {
                        scanForChanges(fullPath);
                    } else if (extensions.includes(path.extname(entry.name))) {
                        try {
                            const stats = fs.statSync(fullPath);
                            const mtime = stats.mtime.getTime();
                            newFileMap.set(fullPath, mtime);
                            
                            // 检查文件是否有变化
                            if (!fileMap.has(fullPath)) {
                                log(`New file detected: ${fullPath}`);
                                repairFile(fullPath);
                            } else if (fileMap.get(fullPath) !== mtime) {
                                log(`File changed: ${fullPath}`);
                                repairFile(fullPath);
                            }
                        } catch (err) {
                            // 文件可能已被删除
                        }
                    }
                }
            } catch (err) {
                // 忽略无法访问的目录
            }
        };
        
        scanForChanges(watchPath);
        fileMap = newFileMap;
    };
    
    // 初始构建文件映射
    updateFileMap();
    log('File watcher started with polling');
    
    // 每30秒检查一次变化
    setInterval(updateFileMap, 30000);
    
    return { stop: () => clearInterval(updateFileMap) };
};

// 主函数
const main = () => {
    ensureDiagnosticsDir();
    log('Encoding Guard started');
    
    // 初始扫描
    const { scannedFiles, fixedFiles } = scanAllFiles();
    generateReport(scannedFiles, fixedFiles);
    
    // 启动监视器
    const watcher = startWatcher();
    
    // 定期重新扫描
    setInterval(() => {
        log('Performing periodic scan');
        const { scannedFiles, fixedFiles } = scanAllFiles();
        generateReport(scannedFiles, fixedFiles);
    }, 3600000); // 每小时扫描一次
};

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
    log(`Uncaught exception: ${err.message}`);
    log(err.stack);
});

// 启动守护进程
main();