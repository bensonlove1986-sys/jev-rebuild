// JEV-MULTI-LAYER-SCAN-SCHEDULER v3.5 - Layer 4: 控制台仪表层 (Dashboard Sync)
// 功能：汇总三层扫描日志，绘制健康度趋势图

var fs = require('fs');
var path = require('path');

var basePath = 'D:\\PDF转网页';
var watchdogLog = path.join(basePath, 'diagnostics', 'watchdog_repair_log.txt');
var globalReport = path.join(basePath, 'diagnostics', 'global_encoding_fix_report.json');
var healthReport = path.join(basePath, 'diagnostics', 'JEV_SYSTEM_HEALTH_REPORT.json');
var chartOutput = path.join(basePath, 'diagnostics', 'utf8_health_chart.json');

var dashboardData = {
    taskId: 'JEV-ENCODING-DASHBOARD-v3.5',
    timestamp: new Date().toISOString(),
    systemOverview: {
        lastUpdated: null,
        totalWatchdogRepairs: 0,
        lastGlobalScan: null,
        lastHealthScore: 0,
        encodingLock: 'ACTIVE',
        systemState: 'STABLE'
    },
    trendData: {
        healthScores: [],
        repairCounts: [],
        errorCounts: []
    },
    componentStatus: {
        watchdog: {
            status: 'UNKNOWN',
            lastActivity: null
        },
        globalScan: {
            status: 'UNKNOWN',
            lastRun: null,
            totalScanned: 0,
            totalFixed: 0
        },
        healthMonitor: {
            status: 'UNKNOWN',
            lastEvaluation: null,
            consecutiveHealthyDays: 0
        }
    },
    alerts: [],
    rawStats: {
        watchdogLogLines: 0,
        globalReportsAvailable: 0,
        healthReportsAvailable: 0
    }
};

// 日志函数
function logMessage(message) {
    var timestamp = new Date().toISOString();
    var logEntry = '[' + timestamp + '] ' + message;
    console.log(logEntry);
}

// 读取并分析Watchdog日志
function analyzeWatchdogLog() {
    try {
        if (!fs.existsSync(watchdogLog)) {
            logMessage('警告: Watchdog日志不存在 - ' + watchdogLog);
            dashboardData.componentStatus.watchdog.status = 'NOT_FOUND';
            return;
        }
        
        var content = fs.readFileSync(watchdogLog, 'utf8');
        var lines = content.split('\n').filter(function(line) { return line.trim() !== ''; });
        dashboardData.rawStats.watchdogLogLines = lines.length;
        
        // 计算修复次数
        var repairCount = 0;
        var lastActivity = null;
        
        lines.forEach(function(line) {
            if (line.includes('FIXED:')) {
                repairCount++;
            }
            // 提取时间戳
            var timestampMatch = line.match(/\[(.*?)\]/);
            if (timestampMatch && timestampMatch[1]) {
                var timestamp = new Date(timestampMatch[1]);
                if (!lastActivity || timestamp > lastActivity) {
                    lastActivity = timestamp;
                }
            }
        });
        
        dashboardData.systemOverview.totalWatchdogRepairs = repairCount;
        
        if (lastActivity) {
            dashboardData.componentStatus.watchdog.lastActivity = lastActivity.toISOString();
            
            // 检查是否活跃（30分钟内有活动）
            var minutesSinceLastActivity = (new Date() - lastActivity) / (1000 * 60);
            if (minutesSinceLastActivity < 30) {
                dashboardData.componentStatus.watchdog.status = 'ACTIVE';
            } else {
                dashboardData.componentStatus.watchdog.status = 'INACTIVE';
                dashboardData.alerts.push('Watchdog超过30分钟未活动');
            }
        }
        
    } catch (e) {
        logMessage('错误: 分析Watchdog日志失败 - ' + e.message);
        dashboardData.componentStatus.watchdog.status = 'ERROR';
    }
}

// 分析全局编码修复报告
function analyzeGlobalReport() {
    try {
        if (!fs.existsSync(globalReport)) {
            logMessage('警告: 全局编码修复报告不存在 - ' + globalReport);
            dashboardData.componentStatus.globalScan.status = 'NOT_FOUND';
            return;
        }
        
        var content = fs.readFileSync(globalReport, 'utf8');
        var report = JSON.parse(content);
        dashboardData.rawStats.globalReportsAvailable = 1;
        
        // 更新系统概览
        dashboardData.systemOverview.lastGlobalScan = report.timestamp;
        
        // 更新组件状态
        if (report.scanStats) {
            dashboardData.componentStatus.globalScan.lastRun = report.timestamp;
            dashboardData.componentStatus.globalScan.totalScanned = report.scanStats.totalFiles || 0;
            dashboardData.componentStatus.globalScan.totalFixed = report.scanStats.fixedFiles || 0;
            
            // 添加到趋势数据
            dashboardData.trendData.repairCounts.push({
                timestamp: report.timestamp,
                value: report.scanStats.fixedFiles || 0
            });
            
            dashboardData.trendData.errorCounts.push({
                timestamp: report.timestamp,
                value: report.scanStats.errorFiles || 0
            });
        }
        
        dashboardData.componentStatus.globalScan.status = 'COMPLETED';
        
    } catch (e) {
        logMessage('错误: 分析全局报告失败 - ' + e.message);
        dashboardData.componentStatus.globalScan.status = 'ERROR';
    }
}

// 分析健康报告
function analyzeHealthReport() {
    try {
        if (!fs.existsSync(healthReport)) {
            logMessage('警告: 健康报告不存在 - ' + healthReport);
            dashboardData.componentStatus.healthMonitor.status = 'NOT_FOUND';
            return;
        }
        
        var content = fs.readFileSync(healthReport, 'utf8');
        var report = JSON.parse(content);
        dashboardData.rawStats.healthReportsAvailable = 1;
        
        // 更新系统概览
        dashboardData.systemOverview.lastHealthScore = report.currentHealth ? report.currentHealth.healthScore : 0;
        dashboardData.systemOverview.systemState = report.systemState || 'UNKNOWN';
        
        // 更新组件状态
        dashboardData.componentStatus.healthMonitor.lastEvaluation = report.timestamp;
        dashboardData.componentStatus.healthMonitor.consecutiveHealthyDays = 
            report.historicalAnalysis ? report.historicalAnalysis.consecutiveHealthyDays || 0 : 0;
        
        // 添加到趋势数据
        if (report.currentHealth) {
            dashboardData.trendData.healthScores.push({
                timestamp: report.timestamp,
                value: report.currentHealth.healthScore
            });
        }
        
        dashboardData.componentStatus.healthMonitor.status = 'COMPLETED';
        
        // 检查是否需要生成警报
        if (report.systemState === 'CRITICAL') {
            dashboardData.alerts.push('系统状态为CRITICAL，需要立即处理');
        } else if (report.systemState === 'WARNING') {
            dashboardData.alerts.push('系统状态为WARNING，建议检查');
        }
        
    } catch (e) {
        logMessage('错误: 分析健康报告失败 - ' + e.message);
        dashboardData.componentStatus.healthMonitor.status = 'ERROR';
    }
}

// 读取历史健康报告生成完整趋势
function generateCompleteTrend() {
    var historyDir = path.join(basePath, 'diagnostics', 'history');
    try {
        if (!fs.existsSync(historyDir)) {
            return;
        }
        
        var files = fs.readdirSync(historyDir).filter(function(file) {
            return file.startsWith('health_report_') && file.endsWith('.json');
        });
        
        files.forEach(function(file) {
            try {
                var content = fs.readFileSync(path.join(historyDir, file), 'utf8');
                var report = JSON.parse(content);
                
                if (report.currentHealth && report.currentHealth.healthScore) {
                    dashboardData.trendData.healthScores.push({
                        timestamp: report.timestamp,
                        value: report.currentHealth.healthScore
                    });
                }
                
            } catch (e) {
                logMessage('警告: 读取历史报告 ' + file + ' 失败');
            }
        });
        
        // 按时间戳排序
        dashboardData.trendData.healthScores.sort(function(a, b) {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
    } catch (e) {
        logMessage('错误: 生成趋势数据失败 - ' + e.message);
    }
}

// 验证所有组件状态
function validateSystemStatus() {
    var activeComponents = 0;
    var totalComponents = 3; // watchdog, globalScan, healthMonitor
    
    if (dashboardData.componentStatus.watchdog.status === 'ACTIVE') activeComponents++;
    if (dashboardData.componentStatus.globalScan.status === 'COMPLETED') activeComponents++;
    if (dashboardData.componentStatus.healthMonitor.status === 'COMPLETED') activeComponents++;
    
    // 如果组件状态不佳，更新系统状态
    if (activeComponents < 2) {
        dashboardData.systemOverview.systemState = 'DEGRADED';
        dashboardData.alerts.push('系统组件状态降级，请检查各层服务');
    }
    
    // 更新最后更新时间
    dashboardData.systemOverview.lastUpdated = new Date().toISOString();
}

// 保存仪表板数据
function saveDashboardData() {
    try {
        fs.writeFileSync(chartOutput, JSON.stringify(dashboardData, null, 2), 'utf8');
        logMessage('仪表板数据已生成: ' + chartOutput);
        
        // 输出摘要
        logMessage('\n=== 仪表板摘要 ===');
        logMessage('系统状态: ' + dashboardData.systemOverview.systemState);
        logMessage('健康分数: ' + dashboardData.systemOverview.lastHealthScore);
        logMessage('Watchdog修复数: ' + dashboardData.systemOverview.totalWatchdogRepairs);
        logMessage('全局扫描文件数: ' + dashboardData.componentStatus.globalScan.totalScanned);
        logMessage('连续健康天数: ' + dashboardData.componentStatus.healthMonitor.consecutiveHealthyDays);
        logMessage('警报数: ' + dashboardData.alerts.length);
        
        if (dashboardData.alerts.length > 0) {
            logMessage('\n=== 警报信息 ===');
            dashboardData.alerts.forEach(function(alert, index) {
                logMessage((index + 1) + '. ' + alert);
            });
        }
        
    } catch (e) {
        logMessage('错误: 保存仪表板数据失败 - ' + e.message);
    }
}

// 主函数
function main() {
    logMessage('JEV-MULTI-LAYER-SCAN-SCHEDULER v3.5 - Layer 4 仪表板同步启动');
    
    // 分析各层数据
    analyzeWatchdogLog();
    analyzeGlobalReport();
    analyzeHealthReport();
    generateCompleteTrend();
    
    // 验证系统状态
    validateSystemStatus();
    
    // 保存仪表板数据
    saveDashboardData();
    
    logMessage('仪表板同步完成');
}

// 启动程序
main();