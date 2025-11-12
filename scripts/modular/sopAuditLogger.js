/**
 * SOP审计日志系统
 * 实现安全操作审计记录的生成、存储和查询
 */

const fs = require('fs');
const path = require('path');

class SOPAuditLogger {
  constructor(options = {}) {
    this.externalMemory = options.externalMemory || null;
    this.bufferPath = options.bufferPath || path.join(process.env.TEMP || '/tmp', 'jev_security_buffer.json');
    this.logger = options.logger || console;
    this.bufferSize = options.bufferSize || 100; // 缓冲区大小
    this.flushInterval = options.flushInterval || 5000; // 5秒自动刷新
    this.auditRecords = [];
    this.flushTimer = null;
    this.isInitialized = false;
  }

  /**
   * 初始化审计日志系统
   */
  initialize() {
    try {
      // 确保临时目录存在
      const tempDir = path.dirname(this.bufferPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // 加载之前缓存的审计记录
      this.loadBufferedRecords();

      // 启动自动刷新定时器
      this.startAutoFlush();

      // 注册进程退出事件，确保缓冲区数据被写入
      process.on('exit', () => {
        this.flushBufferSync();
      });

      // 注册未捕获异常处理器
      process.on('uncaughtException', (error) => {
        this.logAuditRecord({
          intent: 'ERROR_HANDLER',
          request: { error: error.message },
          decision: { allowed: false, reason: '未捕获异常' },
          result: { status: 'failed', error: error.message }
        });
        this.flushBufferSync();
      });

      this.isInitialized = true;
      this.logger.info('SOP审计日志系统初始化完成');
      return true;
    } catch (error) {
      this.logger.error('SOP审计日志系统初始化失败', error);
      return false;
    }
  }

  /**
   * 生成审计记录
   */
  createAuditRecord(data) {
    const {
      actor = 'desktopAgent',
      intent = 'UNKNOWN',
      request = {},
      decision = {},
      effects = {},
      result = {}
    } = data;

    return {
      ts: new Date().toISOString(),
      actor,
      intent,
      request: { 
        args: request.args || {}, 
        plan: request.plan || '', 
        dryRun: request.dryRun || false 
      },
      decision: {
        allowed: decision.allowed !== undefined ? decision.allowed : false,
        reason: decision.reason || ''
      },
      effects: {
        memoryWrites: effects.memoryWrites || [],
        systemChanges: effects.systemChanges || [],
        queued: effects.queued || 0
      },
      result: {
        status: result.status || 'unknown',
        error: result.error || null
      }
    };
  }

  /**
   * 记录审计日志
   */
  logAuditRecord(auditData) {
    try {
      const record = this.createAuditRecord(auditData);
      
      // 添加到内存缓冲区
      this.auditRecords.push(record);
      
      // 输出到控制台
      this.logger.info('[审计日志]', {
        ts: record.ts,
        actor: record.actor,
        intent: record.intent,
        status: record.result.status
      });

      // 如果缓冲区达到阈值，触发刷新
      if (this.auditRecords.length >= this.bufferSize) {
        this.flushBuffer();
      }

      return record;
    } catch (error) {
      this.logger.error('记录审计日志失败', error);
      return null;
    }
  }

  /**
   * 将审计记录存储到externalMemory
   */
  async storeAuditRecord(record) {
    if (!this.externalMemory) {
      this.logger.warn('未配置externalMemory，无法存储审计记录');
      return false;
    }

    try {
      const key = `audit_${record.ts.replace(/[:.]/g, '_')}`;
      await this.externalMemory.set(key, record, { namespace: 'security' });
      return true;
    } catch (error) {
      this.logger.error('存储审计记录到externalMemory失败', error);
      // 失败时，确保记录被添加到本地缓冲区
      this.saveToBuffer([record]);
      return false;
    }
  }

  /**
   * 将审计记录保存到本地缓冲区
   */
  saveToBuffer(records) {
    try {
      // 读取现有缓冲区
      let bufferContent = [];
      if (fs.existsSync(this.bufferPath)) {
        const existing = fs.readFileSync(this.bufferPath, 'utf8');
        bufferContent = JSON.parse(existing);
      }

      // 添加新记录
      bufferContent = [...bufferContent, ...records];

      // 写入缓冲区文件
      fs.writeFileSync(this.bufferPath, JSON.stringify(bufferContent, null, 2));
      this.logger.info(`已将 ${records.length} 条审计记录保存到本地缓冲区`);
      return true;
    } catch (error) {
      this.logger.error('保存审计记录到本地缓冲区失败', error);
      return false;
    }
  }

  /**
   * 加载本地缓冲区中的审计记录
   */
  loadBufferedRecords() {
    try {
      if (fs.existsSync(this.bufferPath)) {
        const content = fs.readFileSync(this.bufferPath, 'utf8');
        const records = JSON.parse(content);
        this.auditRecords = [...this.auditRecords, ...records];
        this.logger.info(`已从本地缓冲区加载 ${records.length} 条审计记录`);
        
        // 清空缓冲区文件
        fs.unlinkSync(this.bufferPath);
        
        // 尝试将加载的记录写入externalMemory
        this.flushBuffer();
      }
    } catch (error) {
      this.logger.error('加载本地缓冲区审计记录失败', error);
    }
  }

  /**
   * 刷新内存缓冲区
   */
  async flushBuffer() {
    if (this.auditRecords.length === 0) {
      return true;
    }

    try {
      const recordsToFlush = [...this.auditRecords];
      this.auditRecords = [];

      // 批量存储到externalMemory
      let successCount = 0;
      let failCount = 0;

      for (const record of recordsToFlush) {
        const success = await this.storeAuditRecord(record);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (failCount > 0) {
        this.logger.warn(`审计记录刷新结果: 成功 ${successCount}, 失败 ${failCount}`);
      } else {
        this.logger.info(`已成功刷新 ${successCount} 条审计记录到externalMemory`);
      }

      return successCount > 0;
    } catch (error) {
      this.logger.error('刷新审计记录缓冲区失败', error);
      // 确保数据不会丢失，重新添加到缓冲区
      this.saveToBuffer(this.auditRecords);
      this.auditRecords = [];
      return false;
    }
  }

  /**
   * 同步刷新缓冲区（用于进程退出）
   */
  flushBufferSync() {
    try {
      if (this.auditRecords.length > 0) {
        this.saveToBuffer(this.auditRecords);
        this.auditRecords = [];
        this.logger.info('审计记录缓冲区已同步刷新到本地文件');
      }
    } catch (error) {
      this.logger.error('同步刷新审计记录失败', error);
    }
  }

  /**
   * 启动自动刷新定时器
   */
  startAutoFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);

    this.logger.info(`已启动审计记录自动刷新，间隔: ${this.flushInterval}ms`);
  }

  /**
   * 停止自动刷新
   */
  stopAutoFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
      this.logger.info('已停止审计记录自动刷新');
    }
  }

  /**
   * 查询审计记录
   */
  async queryAuditRecords(filters = {}, limit = 100) {
    if (!this.externalMemory) {
      this.logger.warn('未配置externalMemory，无法查询审计记录');
      return [];
    }

    try {
      // 这里实现查询逻辑，需要根据externalMemory的API来实现
      // 暂时返回内存中的记录作为示例
      let results = [...this.auditRecords];

      // 应用过滤条件
      if (filters.actor) {
        results = results.filter(r => r.actor === filters.actor);
      }
      if (filters.intent) {
        results = results.filter(r => r.intent === filters.intent);
      }
      if (filters.status) {
        results = results.filter(r => r.result.status === filters.status);
      }
      if (filters.fromDate) {
        const fromDate = new Date(filters.fromDate);
        results = results.filter(r => new Date(r.ts) >= fromDate);
      }
      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        results = results.filter(r => new Date(r.ts) <= toDate);
      }

      // 按时间排序（最新的在前）
      results.sort((a, b) => new Date(b.ts) - new Date(a.ts));

      // 限制返回数量
      return results.slice(0, limit);
    } catch (error) {
      this.logger.error('查询审计记录失败', error);
      return [];
    }
  }

  /**
   * 获取最近的审计记录
   */
  async getRecentRecords(count = 10) {
    return this.queryAuditRecords({}, count);
  }

  /**
   * 生成审计报告
   */
  async generateAuditReport(filters = {}) {
    const records = await this.queryAuditRecords(filters, 1000);
    
    // 统计分析
    const stats = {
      total: records.length,
      byStatus: {},
      byActor: {},
      byIntent: {},
      timeRange: {
        first: records.length > 0 ? records[records.length - 1].ts : null,
        last: records.length > 0 ? records[0].ts : null
      }
    };

    // 计算统计信息
    records.forEach(record => {
      // 按状态统计
      stats.byStatus[record.result.status] = (stats.byStatus[record.result.status] || 0) + 1;
      
      // 按执行者统计
      stats.byActor[record.actor] = (stats.byActor[record.actor] || 0) + 1;
      
      // 按意图统计
      stats.byIntent[record.intent] = (stats.byIntent[record.intent] || 0) + 1;
    });

    return {
      generatedAt: new Date().toISOString(),
      filters,
      stats,
      sampleRecords: records.slice(0, 10) // 返回前10条作为示例
    };
  }

  /**
   * 清理旧的审计记录
   */
  async cleanupOldRecords(retentionDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      this.logger.info(`开始清理 ${retentionDays} 天前的审计记录`);
      // 这里需要实现具体的清理逻辑
      // 暂时只记录操作
      
      return { success: true, message: '清理操作已记录' };
    } catch (error) {
      this.logger.error('清理旧审计记录失败', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      bufferSize: this.auditRecords.length,
      maxBufferSize: this.bufferSize,
      flushInterval: this.flushInterval,
      bufferPath: this.bufferPath,
      hasExternalMemory: !!this.externalMemory
    };
  }
}

// 导出单例实例和类
let instance = null;

function getAuditLogger(options) {
  if (!instance) {
    instance = new SOPAuditLogger(options);
  }
  return instance;
}

module.exports = {
  SOPAuditLogger,
  getAuditLogger
};
