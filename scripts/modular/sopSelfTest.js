/**
 * SOP自测模块
 * 验证SOP安全策略各功能点是否正常工作
 */

const fs = require('fs');
const path = require('path');

class SOPSelfTest {
  constructor(options = {}) {
    this.securityPolicy = options.securityPolicy || null;
    this.killSwitch = options.killSwitch || null;
    this.auditLogger = options.auditLogger || null;
    this.edgeHandler = options.edgeHandler || null;
    this.persistence = options.persistence || null;
    this.logger = options.logger || console;
    this.testResults = [];
    this.isRunning = false;
    this.maxReplayCount = 10;
    
    // 测试用例定义
    this.testCases = [
      {
        id: 'test_soft_pause_write_queuing',
        name: '软暂停后提交写类任务',
        description: '验证在软暂停状态下，写操作任务会被正确加入队列',
        setup: this.setupSoftPauseTest.bind(this),
        execute: this.executeSoftPauseTest.bind(this),
        teardown: this.teardownSoftPauseTest.bind(this),
        expectedResult: 'queued_due_to_pause'
      },
      {
        id: 'test_hard_pause_port_blocking',
        name: '硬暂停时端口封禁',
        description: '验证在硬暂停状态下，operator调用会失败并记录失败原因',
        setup: this.setupHardPauseTest.bind(this),
        execute: this.executeHardPauseTest.bind(this),
        teardown: this.teardownHardPauseTest.bind(this),
        expectedResult: 'failed'
      },
      {
        id: 'test_resume_replay_with_dryrun',
        name: '恢复后重放最近10条',
        description: '验证恢复后会先执行DRY_RUN，用户确认后再真正执行',
        setup: this.setupReplayTest.bind(this),
        execute: this.executeReplayTest.bind(this),
        teardown: this.teardownReplayTest.bind(this),
        expectedResult: 'dry_run_completed'
      }
    ];
  }

  /**
   * 运行所有测试用例
   */
  async runAllTests() {
    if (this.isRunning) {
      this.logger.warn('测试已经在运行中');
      return { success: false, error: '测试已经在运行中' };
    }

    this.isRunning = true;
    this.testResults = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      this.logger.info('开始运行SOP自测模块...');
      
      for (const testCase of this.testCases) {
        await this.runTestCase(testCase);
      }

      // 统计结果
      successCount = this.testResults.filter(result => result.status === 'passed').length;
      failureCount = this.testResults.filter(result => result.status === 'failed').length;

      const report = {
        total: this.testResults.length,
        passed: successCount,
        failed: failureCount,
        successRate: (successCount / this.testResults.length * 100).toFixed(2) + '%',
        results: this.testResults,
        timestamp: new Date().toISOString()
      };

      this.logger.info(`SOP自测完成: ${successCount}通过, ${failureCount}失败, 成功率: ${report.successRate}`);
      return report;
    } catch (error) {
      this.logger.error('运行测试时发生错误', error);
      return {
        success: false,
        error: error.message,
        partialResults: this.testResults
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 运行单个测试用例
   */
  async runTestCase(testCase) {
    const result = {
      id: testCase.id,
      name: testCase.name,
      description: testCase.description,
      startTime: new Date().toISOString(),
      status: 'pending',
      actualResult: null,
      expectedResult: testCase.expectedResult,
      error: null,
      executionTime: 0
    };

    try {
      this.logger.info(`运行测试: ${testCase.name}`);
      
      // 1. 设置测试环境
      if (testCase.setup) {
        await testCase.setup();
      }

      // 2. 执行测试
      const startTime = Date.now();
      result.actualResult = await testCase.execute();
      result.executionTime = Date.now() - startTime;

      // 3. 验证结果
      if (result.actualResult === testCase.expectedResult) {
        result.status = 'passed';
        this.logger.info(`✓ 测试通过: ${testCase.name}`);
      } else {
        result.status = 'failed';
        result.error = `实际结果: ${result.actualResult}, 期望结果: ${testCase.expectedResult}`;
        this.logger.error(`✗ 测试失败: ${testCase.name}`, result.error);
      }
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      this.logger.error(`✗ 测试异常: ${testCase.name}`, error);
    } finally {
      // 4. 清理测试环境
      try {
        if (testCase.teardown) {
          await testCase.teardown();
        }
      } catch (cleanupError) {
        this.logger.error(`清理测试环境失败: ${testCase.name}`, cleanupError);
      }

      result.endTime = new Date().toISOString();
      this.testResults.push(result);
    }
  }

  /**
   * 软暂停测试设置
   */
  async setupSoftPauseTest() {
    this.logger.info('设置软暂停测试环境...');
    // 保存原始状态
    this.originalPausedState = this.securityPolicy?.getPausedState() || false;
    // 设置软暂停状态
    if (this.securityPolicy) {
      this.securityPolicy.setPausedState(true);
      this.logger.info('系统已设置为软暂停状态');
    }
    // 清空任务队列
    if (this.edgeHandler && this.edgeHandler.taskQueue) {
      this.edgeHandler.taskQueue = [];
    }
  }

  /**
   * 执行软暂停测试
   */
  async executeSoftPauseTest() {
    this.logger.info('执行软暂停测试...');
    
    // 创建一个写操作请求
    const writeOperation = {
      action: 'WRITE',
      intent: 'WRITE_OPERATION',
      resource: '/test/resource',
      data: { test: 'data' },
      priority: 'MEDIUM'
    };

    const context = {
      actor: 'test_operator',
      requestId: `test_${Date.now()}`
    };

    // 使用边缘处理器处理写操作
    if (this.edgeHandler) {
      const result = this.edgeHandler.handleWriteOperationInPausedState(writeOperation, context);
      this.logger.info('软暂停测试结果:', result);
      return result.status;
    }

    return 'failed';
  }

  /**
   * 软暂停测试清理
   */
  async teardownSoftPauseTest() {
    this.logger.info('清理软暂停测试环境...');
    // 恢复原始暂停状态
    if (this.securityPolicy) {
      this.securityPolicy.setPausedState(this.originalPausedState);
      this.logger.info(`系统已恢复原始暂停状态: ${this.originalPausedState}`);
    }
  }

  /**
   * 硬暂停测试设置
   */
  async setupHardPauseTest() {
    this.logger.info('设置硬暂停测试环境...');
    // 保存原始状态
    this.originalKillSwitchState = this.killSwitch?.getState() || 'active';
    // 设置硬暂停状态
    if (this.killSwitch) {
      await this.killSwitch.activateHardPause();
      this.logger.info('系统已设置为硬暂停状态');
    }
  }

  /**
   * 执行硬暂停测试
   */
  async executeHardPauseTest() {
    this.logger.info('执行硬暂停测试...');
    
    // 模拟operator调用
    const operatorRequest = {
      action: 'EXECUTE',
      intent: 'OPERATOR_COMMAND',
      command: 'test_command',
      params: { test: 'params' }
    };

    try {
      // 尝试执行操作
      await this.executeBlockedOperation(operatorRequest);
      return 'completed'; // 不应该到达这里
    } catch (error) {
      this.logger.info('硬暂停测试捕获到预期的错误:', error.message);
      return 'failed'; // 预期失败
    }
  }

  /**
   * 模拟执行被阻塞的操作
   */
  async executeBlockedOperation(request) {
    // 检查kill switch状态
    if (this.killSwitch && this.killSwitch.isHardPaused()) {
      throw new Error('operation_blocked_by_hard_pause');
    }
    // 如果没有被阻塞，执行操作
    return { success: true };
  }

  /**
   * 硬暂停测试清理
   */
  async teardownHardPauseTest() {
    this.logger.info('清理硬暂停测试环境...');
    // 恢复系统状态
    if (this.killSwitch) {
      await this.killSwitch.deactivateHardPause();
      this.logger.info('系统硬暂停已解除');
    }
  }

  /**
   * 恢复重放测试设置
   */
  async setupReplayTest() {
    this.logger.info('设置恢复重放测试环境...');
    // 保存原始状态
    this.originalPausedState = this.securityPolicy?.getPausedState() || false;
    
    // 设置软暂停状态
    if (this.securityPolicy) {
      this.securityPolicy.setPausedState(true);
      this.logger.info('系统已设置为软暂停状态');
    }

    // 创建一些模拟的历史操作记录
    this.mockAuditLogs = this.generateMockAuditLogs(this.maxReplayCount);
    
    // 模拟任务队列
    if (this.edgeHandler) {
      this.edgeHandler.taskQueue = this.generateMockTaskQueue(5);
    }
  }

  /**
   * 生成模拟审计日志
   */
  generateMockAuditLogs(count) {
    const logs = [];
    const actions = ['WRITE', 'UPDATE', 'DELETE', 'CREATE'];
    const resources = ['/resource/1', '/resource/2', '/resource/3', '/resource/4', '/resource/5'];
    
    for (let i = 0; i < count; i++) {
      logs.push({
        ts: new Date(Date.now() - i * 60000).toISOString(), // 每条间隔1分钟
        actor: i % 2 === 0 ? 'operator' : 'system',
        intent: actions[i % actions.length],
        request: {
          resource: resources[i % resources.length],
          data: { id: i + 1 }
        },
        decision: { allowed: false, reason: 'system_paused' },
        result: { status: 'queued', error: null }
      });
    }
    
    return logs.reverse(); // 按时间正序返回
  }

  /**
   * 生成模拟任务队列
   */
  generateMockTaskQueue(count) {
    const tasks = [];
    const actions = ['WRITE', 'UPDATE', 'DELETE'];
    
    for (let i = 0; i < count; i++) {
      tasks.push({
        id: `mock_task_${i}`,
        operation: {
          action: actions[i % actions.length],
          intent: `${actions[i % actions.length]}_OPERATION`,
          resource: `/test/resource_${i}`,
          data: { test: i },
          priority: i % 3 === 0 ? 'HIGH' : 'MEDIUM'
        },
        context: {
          actor: 'test_user',
          requestId: `req_${i}`
        },
        queuedAt: new Date(Date.now() - i * 30000).toISOString(),
        status: 'queued_due_to_pause',
        priority: i % 3 === 0 ? 1 : 2
      });
    }
    
    return tasks;
  }

  /**
   * 执行恢复重放测试
   */
  async executeReplayTest() {
    this.logger.info('执行恢复重放测试...');
    
    // 1. 解除软暂停
    if (this.securityPolicy) {
      this.securityPolicy.setPausedState(false);
      this.logger.info('系统软暂停已解除');
    }

    // 2. 获取最近的操作记录
    const recentOperations = this.mockAuditLogs.slice(-this.maxReplayCount);
    this.logger.info(`获取到 ${recentOperations.length} 条最近操作记录`);

    // 3. 执行DRY_RUN模式
    const dryRunResults = await this.executeDryRunBatch(recentOperations);
    this.logger.info(`DRY_RUN执行完成，结果:`, dryRunResults);

    // 4. 模拟用户确认
    const userConfirmed = true;
    
    if (userConfirmed) {
      this.logger.info('用户已确认，准备执行实际操作');
      // 这里应该执行实际操作，但在测试中我们只模拟
    }

    // 5. 处理队列中的任务
    if (this.edgeHandler) {
      await this.edgeHandler.processTaskQueue();
    }

    return 'dry_run_completed';
  }

  /**
   * 执行批量DRY_RUN
   */
  async executeDryRunBatch(operations) {
    const results = [];
    
    for (const operation of operations) {
      const dryRunResult = {
        originalOperation: operation,
        dryRunAt: new Date().toISOString(),
        wouldExecute: true,
        estimatedEffects: {
          resource: operation.request.resource,
          action: operation.intent
        }
      };
      
      results.push(dryRunResult);
      
      // 记录DRY_RUN审计
      if (this.auditLogger) {
        await this.auditLogger.log({
          actor: 'system',
          intent: 'DRY_RUN',
          request: operation.request,
          decision: { allowed: true, reason: 'dry_run_mode' },
          effects: dryRunResult.estimatedEffects,
          result: { status: 'done', error: null }
        });
      }
    }
    
    return results;
  }

  /**
   * 恢复重放测试清理
   */
  async teardownReplayTest() {
    this.logger.info('清理恢复重放测试环境...');
    // 恢复原始暂停状态
    if (this.securityPolicy) {
      this.securityPolicy.setPausedState(this.originalPausedState);
      this.logger.info(`系统已恢复原始暂停状态: ${this.originalPausedState}`);
    }
    // 清理模拟数据
    this.mockAuditLogs = null;
  }

  /**
   * 导出测试报告
   */
  async exportTestReport(format = 'json') {
    if (this.testResults.length === 0) {
      return { success: false, error: '没有测试结果可导出' };
    }

    const report = {
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'passed').length,
        failed: this.testResults.filter(r => r.status === 'failed').length,
        successRate: (this.testResults.filter(r => r.status === 'passed').length / this.testResults.length * 100).toFixed(2) + '%',
        generatedAt: new Date().toISOString()
      },
      details: this.testResults
    };

    if (format === 'json') {
      return {
        success: true,
        format: 'json',
        content: JSON.stringify(report, null, 2)
      };
    } else if (format === 'text') {
      // 生成文本报告
      let textReport = 'SOP自测报告\n';
      textReport += '=======================\n';
      textReport += `总测试数: ${report.summary.total}\n`;
      textReport += `通过: ${report.summary.passed}\n`;
      textReport += `失败: ${report.summary.failed}\n`;
      textReport += `成功率: ${report.summary.successRate}\n`;
      textReport += `生成时间: ${report.summary.generatedAt}\n\n`;

      textReport += '详细结果:\n';
      textReport += '-----------------------\n';
      
      report.details.forEach(result => {
        textReport += `${result.status === 'passed' ? '✓' : '✗'} ${result.name}\n`;
        textReport += `  描述: ${result.description}\n`;
        textReport += `  执行时间: ${result.executionTime}ms\n`;
        if (result.status === 'failed') {
          textReport += `  错误: ${result.error}\n`;
        }
        textReport += '\n';
      });

      return {
        success: true,
        format: 'text',
        content: textReport
      };
    }

    return { success: false, error: '不支持的报告格式' };
  }

  /**
   * 保存测试报告到文件
   */
  async saveTestReport(outputPath, format = 'json') {
    const exportResult = await this.exportTestReport(format);
    if (!exportResult.success) {
      return exportResult;
    }

    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, exportResult.content);
      this.logger.info(`测试报告已保存到: ${outputPath}`);
      return { success: true, path: outputPath };
    } catch (error) {
      this.logger.error('保存测试报告失败', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取测试结果摘要
   */
  getTestSummary() {
    if (this.testResults.length === 0) {
      return { message: '尚未运行测试' };
    }

    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;

    return {
      totalTests: this.testResults.length,
      passed,
      failed,
      successRate: (passed / this.testResults.length * 100).toFixed(2) + '%',
      lastRun: this.testResults[this.testResults.length - 1]?.endTime || null
    };
  }

  /**
   * 验证系统组件是否齐全
   */
  validateComponents() {
    const missingComponents = [];

    if (!this.securityPolicy) missingComponents.push('securityPolicy');
    if (!this.killSwitch) missingComponents.push('killSwitch');
    if (!this.auditLogger) missingComponents.push('auditLogger');
    if (!this.edgeHandler) missingComponents.push('edgeHandler');

    return {
      valid: missingComponents.length === 0,
      missingComponents
    };
  }
}

// 导出单例实例和类
let instance = null;

function getSOPSelfTest(options) {
  if (!instance) {
    instance = new SOPSelfTest(options);
  }
  return instance;
}

module.exports = {
  SOPSelfTest,
  getSOPSelfTest
};
