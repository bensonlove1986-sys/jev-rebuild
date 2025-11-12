// JEV Plugin v2.0 - 日志分析模块
const fs = require('fs');
const path = require('path');

class LogAnalyzer {
  constructor() {
    this.logPaths = {
      cloud: path.join(__dirname, '../../logs/cloud_log.txt'),
      alerts: path.join(__dirname, 'alerts_log.txt'),
      auth: path.join(__dirname, '../auth_log.txt')
    };
    this.errorKeywords = ['error', 'failed', 'timeout', 'unauthorized', 'disconnect'];
    this.lastAnalysisTime = null;
  }

  // 分析日志文件
  analyzeLogs() {
    try {
      const now = new Date();
      const period = '24h';
      
      let totalErrors = 0;
      const errorCounts = {};
      const hourlyErrors = {};
      
      // 初始化小时统计
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        hourlyErrors[`${hour}:00-${hour}:59`] = 0;
      }
      
      // 分析所有日志文件
      for (const [type, logPath] of Object.entries(this.logPaths)) {
        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf8');
          const logLines = logContent.split('\n');
          
          logLines.forEach(line => {
            // 检查是否包含错误关键字
            for (const keyword of this.errorKeywords) {
              if (line.toLowerCase().includes(keyword)) {
                totalErrors++;
                errorCounts[keyword] = (errorCounts[keyword] || 0) + 1;
                
                // 尝试从日志行提取时间
                const hourMatch = line.match(/\[(\d{1,2}):\d{2}(?::\d{2})?\]/);
                if (hourMatch) {
                  const hour = parseInt(hourMatch[1]).toString().padStart(2, '0');
                  const hourRange = `${hour}:00-${hour}:59`;
                  if (hourlyErrors[hourRange] !== undefined) {
                    hourlyErrors[hourRange]++;
                  }
                }
                break;
              }
            }
          });
        }
      }
      
      // 找出最常见的错误类型
      let mostCommon = 'none';
      let maxCount = 0;
      for (const [keyword, count] of Object.entries(errorCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = keyword;
        }
      }
      
      // 找出峰值时间
      let peakTime = '00:00-01:00';
      let maxHourlyCount = 0;
      for (const [hourRange, count] of Object.entries(hourlyErrors)) {
        if (count > maxHourlyCount) {
          maxHourlyCount = count;
          peakTime = hourRange;
        }
      }
      
      const result = {
        timestamp: now.toISOString(),
        period,
        total_errors: totalErrors,
        most_common: mostCommon,
        peak_time: peakTime,
        error_distribution: errorCounts,
        hourly_trend: hourlyErrors
      };
      
      this.lastAnalysisTime = now;
      return result;
    } catch (error) {
      console.error('日志分析失败:', error);
      return this.getErrorResult();
    }
  }

  // 获取错误时的默认结果
  getErrorResult() {
    const hourlyErrors = {};
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      hourlyErrors[`${hour}:00-${hour}:59`] = 0;
    }
    
    return {
      timestamp: new Date().toISOString(),
      period: '24h',
      total_errors: 0,
      most_common: 'none',
      peak_time: '00:00-01:00',
      error_distribution: {},
      hourly_trend: hourlyErrors
    };
  }

  // 生成趋势图数据（用于前端）
  generateTrendData() {
    const analysis = this.analyzeLogs();
    return {
      labels: Object.keys(analysis.hourly_trend),
      datasets: [{
        label: '错误数量',
        data: Object.values(analysis.hourly_trend),
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2
      }]
    };
  }

  // 生成错误分布数据（用于饼图）
  generateErrorDistributionData() {
    const analysis = this.analyzeLogs();
    return {
      labels: Object.keys(analysis.error_distribution),
      datasets: [{
        data: Object.values(analysis.error_distribution),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)'
        ]
      }]
    };
  }

  // 获取基本统计信息
  getStatistics() {
    const analysis = this.analyzeLogs();
    return {
      total_errors: analysis.total_errors,
      most_common: analysis.most_common,
      peak_time: analysis.peak_time,
      last_analysis: this.lastAnalysisTime ? this.lastAnalysisTime.toLocaleString('zh-CN') : null
    };
  }

  // 导出分析报告为JSON
  exportReport() {
    const report = this.analyzeLogs();
    const reportPath = path.join(__dirname, `report_${Date.now()}.json`);
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
      return { success: true, path: reportPath };
    } catch (error) {
      console.error('导出报告失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 检查日志文件是否存在
  checkLogFiles() {
    const status = {};
    for (const [type, logPath] of Object.entries(this.logPaths)) {
      status[type] = {
        exists: fs.existsSync(logPath),
        path: logPath
      };
    }
    return status;
  }
}

// 导出模块
if (typeof module !== 'undefined') {
  module.exports = LogAnalyzer;
} else {
  // 浏览器环境
  window.LogAnalyzer = LogAnalyzer;
}

// 示例使用
if (typeof require !== 'undefined' && require.main === module) {
  const analyzer = new LogAnalyzer();
  console.log('分析结果:', analyzer.analyzeLogs());
}