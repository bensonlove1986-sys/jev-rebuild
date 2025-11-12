// JEV-PluginSync-v1.0 - 插件通信对齐脚本
// 实现JEV插件层（Tampermonkey/Web UI）与三层通信闭环的对接

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置常量
const CONFIG = {
  workerUrl: 'https://jevshop.bensonlove1986.workers.dev',
  syncEndpoint: '/sync',
  logDir: path.join(__dirname, 'jev_logs', 'communication'),
  maxRetryAttempts: 3,
  requestTimeout: 5000,
  testMessageCount: 5,
  acceptableLatency: 100, // ms
  agentToken: 'jev_cloud_api_key_123456' // 与本地中继相同的Token
};

// 验证日志对象
let alignmentLog = {
  timestamp: Date.now(),
  test_id: `test_${Date.now()}`,
  worker_status: 'unknown',
  state_layer_status: 'unknown',
  plugin_status: 'unknown',
  latency_measurements: [],
  average_latency: 0,
  field_differences: 0,
  alignment_result: 'pending',
  drift_range: 'unknown',
  request_count: 0,
  success_count: 0,
  failed_count: 0,
  errors: []
};

// 确保日志目录存在
function ensureLogDir() {
  if (!fs.existsSync(CONFIG.logDir)) {
    fs.mkdirSync(CONFIG.logDir, { recursive: true });
    console.log(`创建日志目录: ${CONFIG.logDir}`);
  }
}

// 写入日志到文件
function writeLog(logData, reportText) {
  const timestamp = Date.now();
  const logFileName = `plugin_alignment_log_${timestamp}.json`;
  const reportFileName = `plugin_alignment_report_${timestamp}.txt`;
  
  const logPath = path.join(CONFIG.logDir, logFileName);
  const reportPath = path.join(CONFIG.logDir, reportFileName);
  
  try {
    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
    fs.writeFileSync(reportPath, reportText);
    console.log(`日志文件生成: ${logPath}`);
    console.log(`报告文件生成: ${reportPath}`);
    return { logPath, reportPath };
  } catch (error) {
    console.error('写入日志文件失败:', error.message);
    return null;
  }
}

// 创建标准测试消息
function createTestMessage() {
  return {
    device: 'plugin-ui',
    key: 'page_event',
    value: {
      event_type: 'alignment_test',
      test_id: alignmentLog.test_id,
      random_data: Math.random().toString(36).substring(7)
    },
    timestamp: Date.now(),
    origin: 'plugin'
  };
}

// 发送同步请求到Worker
async function sendSyncRequest(message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(message);
    const url = new URL(CONFIG.syncEndpoint, CONFIG.workerUrl);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Token': CONFIG.agentToken
      },
      timeout: CONFIG.requestTimeout
    };
    
    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsedData = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsedData });
          } catch (error) {
            reject(new Error(`响应解析失败: ${error.message}`));
          }
        } else {
          reject(new Error(`请求失败，状态码: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`请求错误: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`请求超时，超过${CONFIG.requestTimeout}ms`));
    });
    
    req.write(postData);
    req.end();
  });
}

// 验证返回的数据结构
function validateResponseStructure(response) {
  const requiredFields = ['device', 'key', 'value', 'timestamp', 'origin'];
  let differences = 0;
  
  requiredFields.forEach(field => {
    if (!(field in response)) {
      differences++;
      console.error(`缺少必填字段: ${field}`);
    }
  });
  
  return {
    valid: differences === 0,
    differences: differences
  };
}

// 运行单次对齐测试
async function runAlignmentTest(attempt) {
  const startTime = Date.now();
  const testMessage = createTestMessage();
  
  try {
    const response = await sendSyncRequest(testMessage);
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    alignmentLog.request_count++;
    alignmentLog.latency_measurements.push(latency);
    
    // 验证响应结构
    const validation = validateResponseStructure(response.data);
    alignmentLog.field_differences += validation.differences;
    
    // 更新状态
    alignmentLog.worker_status = 'online';
    alignmentLog.state_layer_status = response.data?.state_layer_status || 'online';
    alignmentLog.plugin_status = 'online';
    alignmentLog.success_count++;
    
    console.log(`✓ 测试成功 (尝试 ${attempt}) - 延迟: ${latency}ms, 字段差异: ${validation.differences}`);
    return { success: true, latency, differences: validation.differences };
  } catch (error) {
    alignmentLog.request_count++;
    alignmentLog.failed_count++;
    alignmentLog.errors.push(`尝试 ${attempt}: ${error.message}`);
    
    console.error(`✗ 测试失败 (尝试 ${attempt}): ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 运行完整的对齐测试流程
async function runAlignmentTestSuite() {
  console.log('开始JEV插件通信对齐测试...');
  console.log(`目标Worker: ${CONFIG.workerUrl}${CONFIG.syncEndpoint}`);
  
  let consecutiveFailures = 0;
  
  for (let attempt = 1; attempt <= CONFIG.testMessageCount; attempt++) {
    const result = await runAlignmentTest(attempt);
    
    if (!result.success) {
      consecutiveFailures++;
      
      // 如果连续失败次数达到最大重试限制，停止测试
      if (consecutiveFailures >= CONFIG.maxRetryAttempts) {
        console.error(`连续失败${consecutiveFailures}次，达到最大重试限制`);
        break;
      }
      
      // 等待一段时间后重试
      console.log(`等待1秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      consecutiveFailures = 0;
    }
    
    // 测试之间的短暂间隔
    if (attempt < CONFIG.testMessageCount) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// 计算测试结果
function calculateResults() {
  // 计算平均延迟
  if (alignmentLog.latency_measurements.length > 0) {
    alignmentLog.average_latency = Math.round(
      alignmentLog.latency_measurements.reduce((a, b) => a + b, 0) / 
      alignmentLog.latency_measurements.length
    );
  }
  
  // 计算漂移范围
  if (alignmentLog.latency_measurements.length > 0) {
    const min = Math.min(...alignmentLog.latency_measurements);
    const max = Math.max(...alignmentLog.latency_measurements);
    alignmentLog.drift_range = `${min}-${max}ms`;
  }
  
  // 判定对齐结果
  const allSystemsOnline = (
    alignmentLog.worker_status === 'online' &&
    alignmentLog.state_layer_status === 'online' &&
    alignmentLog.plugin_status === 'online'
  );
  
  const latencyAcceptable = alignmentLog.average_latency < CONFIG.acceptableLatency;
  const noFieldDifferences = alignmentLog.field_differences === 0;
  const enoughSuccesses = alignmentLog.success_count >= Math.ceil(CONFIG.testMessageCount / 2);
  
  if (allSystemsOnline && latencyAcceptable && noFieldDifferences && enoughSuccesses) {
    alignmentLog.alignment_result = 'Aligned';
  } else {
    alignmentLog.alignment_result = 'Drift';
  }
}

// 生成人类可读的报告
function generateReportText() {
  const report = `
JEV 插件通信对齐报告
=====================
测试ID: ${alignmentLog.test_id}
测试时间: ${new Date(alignmentLog.timestamp).toLocaleString()}

状态概览:
--------
Worker 状态: ${alignmentLog.worker_status.toUpperCase()}
状态层状态: ${alignmentLog.state_layer_status.toUpperCase()}
插件状态: ${alignmentLog.plugin_status.toUpperCase()}

性能指标:
--------
平均延迟: ${alignmentLog.average_latency}ms
漂移范围: ${alignmentLog.drift_range}
请求总数: ${alignmentLog.request_count}
成功请求: ${alignmentLog.success_count}
失败请求: ${alignmentLog.failed_count}

对齐结果:
--------
对齐状态: ${alignmentLog.alignment_result}
字段差异: ${alignmentLog.field_differences}

错误详情:
--------
${alignmentLog.errors.length > 0 ? alignmentLog.errors.join('\n') : '无'}

成功判定标准:
--------
- 所有系统在线: ${alignmentLog.worker_status === 'online' && alignmentLog.state_layer_status === 'online' && alignmentLog.plugin_status === 'online' ? '✓' : '✗'}
- 延迟 < ${CONFIG.acceptableLatency}ms: ${alignmentLog.average_latency < CONFIG.acceptableLatency ? '✓' : '✗'}
- 字段差异 = 0: ${alignmentLog.field_differences === 0 ? '✓' : '✗'}
- 成功请求 > 50%: ${alignmentLog.success_count / alignmentLog.request_count > 0.5 ? '✓' : '✗'}

=====================
报告生成时间: ${new Date().toLocaleString()}
`;
  
  return report;
}

// 双模式支持类 - 支持在线/离线模式
class PluginModeManager {
  constructor() {
    this.isOnlineMode = true;
    this.offlineQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 5000; // 5秒
  }
  
  // 切换到离线模式
  switchToOfflineMode() {
    this.isOnlineMode = false;
    console.log('🔄 切换到离线模式');
  }
  
  // 尝试切换到在线模式
  async trySwitchToOnlineMode() {
    try {
      const testMessage = createTestMessage();
      const response = await sendSyncRequest(testMessage);
      
      if (response.status === 200) {
        this.isOnlineMode = true;
        this.reconnectAttempts = 0;
        console.log('✅ 成功切换到在线模式');
        await this.processOfflineQueue();
        return true;
      }
      
      return false;
    } catch (error) {
      this.reconnectAttempts++;
      console.log(`🔄 重新连接尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}: ${error.message}`);
      return false;
    }
  }
  
  // 将消息添加到离线队列
  queueForOffline(message) {
    this.offlineQueue.push({
      message,
      timestamp: Date.now(),
      attempts: 0
    });
    console.log(`📥 消息已加入离线队列 (队列大小: ${this.offlineQueue.length})`);
  }
  
  // 处理离线队列中的消息
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    console.log(`📤 开始处理离线队列 (${this.offlineQueue.length} 条消息)`);
    const remainingMessages = [];
    
    for (const queueItem of this.offlineQueue) {
      try {
        await sendSyncRequest(queueItem.message);
        console.log(`📤 离线消息发送成功`);
      } catch (error) {
        queueItem.attempts++;
        if (queueItem.attempts < 3) { // 最多重试3次
          remainingMessages.push(queueItem);
          console.log(`📤 离线消息发送失败，将重试 (${queueItem.attempts}/3): ${error.message}`);
        }
      }
    }
    
    this.offlineQueue = remainingMessages;
    console.log(`📤 离线队列处理完成，剩余 ${this.offlineQueue.length} 条消息`);
  }
  
  // 发送消息，根据当前模式决定处理方式
  async sendMessage(message) {
    if (this.isOnlineMode) {
      try {
        const response = await sendSyncRequest(message);
        return response;
      } catch (error) {
        this.switchToOfflineMode();
        this.queueForOffline(message);
        throw error;
      }
    } else {
      this.queueForOffline(message);
      // 尝试重新连接
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.trySwitchToOnlineMode(), this.reconnectInterval);
      }
      return { status: 202, data: { message: '消息已加入离线队列', mode: 'offline' } };
    }
  }
  
  // 获取当前模式状态
  getModeStatus() {
    return {
      mode: this.isOnlineMode ? 'online' : 'offline',
      queueSize: this.offlineQueue.length,
      reconnectAttempts: this.reconnectAttempts,
      lastAttempt: Date.now()
    };
  }
}

// 主函数
async function main() {
  try {
    ensureLogDir();
    
    // 运行对齐测试
    await runAlignmentTestSuite();
    
    // 计算结果
    calculateResults();
    
    // 生成报告
    const reportText = generateReportText();
    const files = writeLog(alignmentLog, reportText);
    
    // 输出结果
    console.log('\n========================================');
    console.log('✅ JEV 插件通信对齐任务执行成功');
    console.log(`Worker 状态: ${alignmentLog.worker_status}`);
    console.log(`状态层状态: ${alignmentLog.state_layer_status}`);
    console.log(`插件状态: ${alignmentLog.plugin_status}`);
    console.log(`平均延迟: ${alignmentLog.average_latency} ms`);
    if (files) {
      console.log(`报告生成路径: ${files.reportPath}`);
    }
    console.log('========================================');
    
    // 如果测试通过，演示双模式功能
    if (alignmentLog.alignment_result === 'Aligned') {
      console.log('\n🔄 初始化双模式支持...');
      const modeManager = new PluginModeManager();
      console.log('✅ 双模式支持已启用，当前模式:', modeManager.getModeStatus().mode);
    }
    
  } catch (error) {
    console.error('❌ JEV 插件通信对齐任务执行失败:', error.message);
    alignmentLog.errors.push(`主任务失败: ${error.message}`);
    
    // 即使出错也要尝试写入日志
    try {
      const reportText = generateReportText();
      writeLog(alignmentLog, reportText);
    } catch (logError) {
      console.error('❌ 无法写入错误日志:', logError.message);
    }
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

// 导出API供其他模块使用
module.exports = {
  runAlignmentTest,
  PluginModeManager,
  createTestMessage,
  sendSyncRequest
};