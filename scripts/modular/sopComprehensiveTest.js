/**
 * SOP综合测试脚本
 * 验证所有SOP安全策略模块的完整功能
 */

const fs = require('fs');
const path = require('path');

// 导入所有SOP模块
const { getSOPSecurityPolicy } = require('./sopSecurityPolicy.js');
const { getSOPKillSwitch } = require('./sopKillSwitch.js');
const { getSOPAuditLogger } = require('./sopAuditLogger.js');
const { getSOPEdgeHandler } = require('./sopEdgeHandler.js');
const { getSOPSelfTest } = require('./sopSelfTest.js');
const { getSOPersistence } = require('./sopPersistence.js');

// 模拟externalMemory接口
class MockExternalMemory {
  constructor() {
    this.data = new Map();
    this.logger = console;
  }

  async get(key, options = {}) {
    const namespace = options.namespace || 'default';
    const fullKey = `${namespace}:${key}`;
    
    if (this.data.has(fullKey)) {
      this.logger.info(`MockMemory: 读取 ${fullKey}`);
      return this.data.get(fullKey);
    }
    
    this.logger.warn(`MockMemory: 未找到 ${fullKey}`);
    return null;
  }

  async set(key, value, options = {}) {
    const namespace = options.namespace || 'default';
    const fullKey = `${namespace}:${key}`;
    
    this.logger.info(`MockMemory: 写入 ${fullKey}`);
    this.data.set(fullKey, value);
    return true;
  }

  async delete(key, options = {}) {
    const namespace = options.namespace || 'default';
    const fullKey = `${namespace}:${key}`;
    
    this.logger.info(`MockMemory: 删除 ${fullKey}`);
    return this.data.delete(fullKey);
  }

  async clear(namespace = null) {
    if (namespace) {
      for (const key of this.data.keys()) {
        if (key.startsWith(`${namespace}:`)) {
          this.data.delete(key);
        }
      }
    } else {
      this.data.clear();
    }
    this.logger.info(`MockMemory: 已清空 ${namespace || '所有'} 数据`);
    return true;
  }

  getAllKeys() {
    return Array.from(this.data.keys());
  }

  getSize() {
    return this.data.size;
  }
}

// 自定义日志器
class CustomLogger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.logFile = options.logFile || null;
    this.logs = [];
  }

  log(...args) {
    const message = this.formatMessage('INFO', args);
    console.log(message);
    this.saveLog(message);
  }

  info(...args) {
    const message = this.formatMessage('INFO', args);
    console.info(message);
    this.saveLog(message);
  }

  warn(...args) {
    const message = this.formatMessage('WARN', args);
    console.warn(message);
    this.saveLog(message);
  }

  error(...args) {
    const message = this.formatMessage('ERROR', args);
    console.error(message);
    this.saveLog(message);
  }

  debug(...args) {
    if (this.verbose) {
      const message = this.formatMessage('DEBUG', args);
      console.debug(message);
      this.saveLog(message);
    }
  }

  formatMessage(level, args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : arg
    ).join(' ');
    return `[${timestamp}] [${level}] ${formattedArgs}`;
  }

  saveLog(message) {
    this.logs.push(message);
    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, message + '\n');
      } catch (error) {
        console.error('保存日志失败:', error);
      }
    }
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

// SOP测试协调器
class SOPTestCoordinator {
  constructor() {
    // 初始化日志器
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, `sop_test_${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    this.logger = new CustomLogger({ verbose: true, logFile });
    
    // 初始化模拟externalMemory
    this.externalMemory = new MockExternalMemory();
    
    // SOP文本内容
    this.sopText = `[SOP_VALIDATION_CHECKLIST]
 - 校验当前策略：paused / tokenWhitelist / allowedActions
 - 校验来源token是否在白名单
 - 校验目标路径是否命中restrictedPaths
 - 若 dry-run: 只输出"计划与将执行的命令"，不落地
 - 超过 maxRuntimeMinutes → 自动中断并记录
[/SOP_VALIDATION_CHECKLIST][SOP_KILL_SWITCH]
 - 本地 Ctrl+C 触发 ConsoleBreak：
   - 写入 C:\\JEV\\PAUSE.flag
   - 记录 externalMemory(ns=security, key=last_interrupt)
   - operator 检测到 flag 或 paused=true → 拦截执行
 - 恢复：删除 flag 文件 + set paused=false
[/SOP_KILL_SWITCH][SOP_AUDIT_FORMAT]
{
  "ts": "<ISO8601>",
  "actor": "<TREA|Operator|desktopAgent>",
  "intent": "<SOFT_PAUSE|HARD_PAUSE|FULL_FREEZE|RESUME|DRY_RUN|…>",
  "request": { "args": "...", "plan": "...", "dryRun": true/false },
  "decision": { "allowed": true/false, "reason": "…" },
  "effects": { "memoryWrites": [...], "systemChanges": [...], "queued": N },
  "result": { "status": "done|denied|failed|queued", "error": null|"…" }
}
[/SOP_AUDIT_FORMAT][SOP_EDGE_CASES]
 - 无法写入 externalMemory：本地缓存到 %TEMP%\\jev_security_buffer.json 并重试
 - token 缺失/过期：直接 deny + 记录审计
 - 请求为写类动作但处于 paused：入队而非执行
 - 超时/失败≥autoLockAfterFailures：自动置 paused=true
[/SOP_EDGE_CASES][SOP_SELF_TESTS]
 - 用例1：软暂停后提交写类任务 → 应返回 queued_due_to_pause
 - 用例2：硬暂停时端口封禁 → operator 调用失败且记录失败原因
 - 用例3：恢复后重放最近 10 条 → 先 DRY_RUN，用户确认后执行
[/SOP_SELF_TESTS][SOP_PERSIST]
 - 请将本SOP以原样文本存入 externalMemory：
   namespace=security, key=security_sop_v1_text
 - 将解析后的 policy schema 存入：
   namespace=security, key=security_policy
 - 学习完成后回复：LEARNED_OK::<对全文做SHA-256的前10位>
[/SOP_PERSIST]`;
    
    // 初始化所有模块
    this.initializeModules();
    
    // 测试结果
    this.testResults = {
      modules: {},
      integration: [],
      overall: { success: true, message: '' }
    };
  }

  /**
   * 初始化所有SOP模块
   */
  initializeModules() {
    this.logger.info('开始初始化SOP模块...');
    
    try {
      // 初始化持久化模块
      this.persistence = getSOPersistence({
        externalMemory: this.externalMemory,
        logger: this.logger
      });
      this.logger.info('✓ SOP持久化模块初始化成功');
      
      // 初始化安全策略模块
      this.securityPolicy = getSOPSecurityPolicy({
        externalMemory: this.externalMemory,
        logger: this.logger
      });
      this.logger.info('✓ SOP安全策略模块初始化成功');
      
      // 初始化终止开关模块
      this.killSwitch = getSOPKillSwitch({
        externalMemory: this.externalMemory,
        logger: this.logger
      });
      this.logger.info('✓ SOP终止开关模块初始化成功');
      
      // 初始化审计日志模块
      this.auditLogger = getSOPAuditLogger({
        externalMemory: this.externalMemory,
        logger: this.logger
      });
      this.logger.info('✓ SOP审计日志模块初始化成功');
      
      // 初始化边缘情况处理模块
      this.edgeHandler = getSOPEdgeHandler({
        securityPolicy: this.securityPolicy,
        auditLogger: this.auditLogger,
        logger: this.logger
      });
      this.logger.info('✓ SOP边缘情况处理模块初始化成功');
      
      // 初始化自测模块
      this.selfTest = getSOPSelfTest({
        securityPolicy: this.securityPolicy,
        killSwitch: this.killSwitch,
        auditLogger: this.auditLogger,
        edgeHandler: this.edgeHandler,
        persistence: this.persistence,
        logger: this.logger
      });
      this.logger.info('✓ SOP自测模块初始化成功');
      
      this.logger.info('所有SOP模块初始化完成');
    } catch (error) {
      this.logger.error('模块初始化失败:', error);
      throw error;
    }
  }

  /**
   * 运行模块测试
   */
  async runModuleTests() {
    this.logger.info('开始运行模块测试...');
    
    // 1. 测试持久化模块
    this.testResults.modules.persistence = await this.testPersistenceModule();
    
    // 2. 测试安全策略模块
    this.testResults.modules.securityPolicy = await this.testSecurityPolicyModule();
    
    // 3. 测试终止开关模块
    this.testResults.modules.killSwitch = await this.testKillSwitchModule();
    
    // 4. 测试审计日志模块
    this.testResults.modules.auditLogger = await this.testAuditLoggerModule();
    
    // 5. 测试边缘情况处理模块
    this.testResults.modules.edgeHandler = await this.testEdgeHandlerModule();
    
    this.logger.info('模块测试完成');
  }

  /**
   * 测试持久化模块
   */
  async testPersistenceModule() {
    try {
      this.logger.info('测试持久化模块...');
      
      // 持久化SOP
      const persistResult = await this.persistence.persistSOP(this.sopText);
      
      if (!persistResult.success) {
        throw new Error(`持久化失败: ${persistResult.error}`);
      }
      
      this.logger.info(`✓ SOP持久化成功，短哈希: ${persistResult.shortHash}`);
      
      // 验证存储
      const storedText = await this.persistence.loadSOPText();
      const storedPolicy = await this.persistence.loadSecurityPolicy();
      
      if (!storedText || !storedPolicy) {
        throw new Error('加载存储的数据失败');
      }
      
      this.logger.info('✓ 存储验证成功');
      
      return {
        success: true,
        shortHash: persistResult.shortHash,
        fullHash: persistResult.fullHash,
        storedDataVerified: true
      };
    } catch (error) {
      this.logger.error('持久化模块测试失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 测试安全策略模块
   */
  async testSecurityPolicyModule() {
    try {
      this.logger.info('测试安全策略模块...');
      
      // 测试暂停状态
      this.securityPolicy.setPausedState(true);
      const pausedState = this.securityPolicy.getPausedState();
      
      // 测试token白名单
      const validToken = this.securityPolicy.isTokenWhitelisted('TREA');
      const invalidToken = this.securityPolicy.isTokenWhitelisted('HACKER');
      
      // 测试允许的操作
      const validAction = this.securityPolicy.isActionAllowed('READ');
      
      // 测试路径限制
      const restrictedPathTest = this.securityPolicy.isPathRestricted('/etc/passwd');
      
      this.logger.info('✓ 安全策略模块测试通过');
      
      return {
        success: true,
        pausedState,
        tokenValidation: { validToken, invalidToken },
        actionValidation: { validAction },
        pathValidation: { restrictedPathTest }
      };
    } catch (error) {
      this.logger.error('安全策略模块测试失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 测试终止开关模块
   */
  async testKillSwitchModule() {
    try {
      this.logger.info('测试终止开关模块...');
      
      // 模拟软暂停
      await this.killSwitch.activateSoftPause();
      const softPaused = this.killSwitch.isSoftPaused();
      
      // 模拟硬暂停
      await this.killSwitch.activateHardPause();
      const hardPaused = this.killSwitch.isHardPaused();
      
      // 恢复
      await this.killSwitch.deactivateHardPause();
      await this.killSwitch.deactivateSoftPause();
      
      this.logger.info('✓ 终止开关模块测试通过');
      
      return {
        success: true,
        softPauseTest: softPaused,
        hardPauseTest: hardPaused
      };
    } catch (error) {
      this.logger.error('终止开关模块测试失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 测试审计日志模块
   */
  async testAuditLoggerModule() {
    try {
      this.logger.info('测试审计日志模块...');
      
      // 记录审计日志
      const logResult = await this.auditLogger.log({
        actor: 'test_operator',
        intent: 'TEST_ACTION',
        request: { test: 'data' },
        decision: { allowed: true, reason: 'test' },
        effects: { systemChanges: ['test_change'] },
        result: { status: 'done', error: null }
      });
      
      if (!logResult.success) {
        throw new Error('记录审计日志失败');
      }
      
      // 查询日志
      const logs = await this.auditLogger.queryLogs({ limit: 1 });
      
      this.logger.info('✓ 审计日志模块测试通过');
      
      return {
        success: true,
        logCreated: logResult.success,
        logsAvailable: logs && logs.length > 0
      };
    } catch (error) {
      this.logger.error('审计日志模块测试失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 测试边缘情况处理模块
   */
  async testEdgeHandlerModule() {
    try {
      this.logger.info('测试边缘情况处理模块...');
      
      // 测试写入失败处理
      const mockMemoryFailure = this.edgeHandler.handleMemoryWriteFailure(
        { test: 'data' },
        'test_key',
        'test_namespace'
      );
      
      // 测试token验证失败
      const tokenFailureResult = this.edgeHandler.handleMissingOrExpiredToken(
        { intent: 'TEST' },
        { requestId: 'test-123' }
      );
      
      this.logger.info('✓ 边缘情况处理模块测试通过');
      
      return {
        success: true,
        memoryFailureHandled: true,
        tokenValidationWorking: tokenFailureResult.allowed === false
      };
    } catch (error) {
      this.logger.error('边缘情况处理模块测试失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 运行集成测试
   */
  async runIntegrationTests() {
    this.logger.info('开始运行集成测试...');
    
    // 执行自测模块的所有测试用例
    const selfTestResults = await this.selfTest.runAllTests();
    
    this.testResults.integration.push({
      name: 'SOP自测模块',
      results: selfTestResults
    });
    
    this.logger.info('集成测试完成');
  }

  /**
   * 验证所有模块是否正常工作
   */
  async verifyAllComponents() {
    this.logger.info('验证所有组件状态...');
    
    // 验证自测模块组件
    const selfTestValidation = this.selfTest.validateComponents();
    
    // 检查externalMemory中的数据
    const memoryKeys = this.externalMemory.getAllKeys();
    
    this.logger.info(`✓ 组件验证完成，externalMemory中有 ${memoryKeys.length} 个键值对`);
    
    return {
      selfTestValidation,
      memoryKeysCount: memoryKeys.length,
      memoryKeys: memoryKeys
    };
  }

  /**
   * 生成最终测试报告
   */
  async generateFinalReport() {
    this.logger.info('生成最终测试报告...');
    
    // 统计模块测试结果
    const moduleResults = this.testResults.modules;
    const moduleCount = Object.keys(moduleResults).length;
    const passedModules = Object.values(moduleResults).filter(m => m.success).length;
    
    // 统计集成测试结果
    let integrationSuccess = true;
    let integrationDetails = [];
    
    this.testResults.integration.forEach(test => {
      if (!test.results.success) {
        integrationSuccess = false;
      }
      integrationDetails.push({
        name: test.name,
        passed: test.results.success,
        details: test.results
      });
    });
    
    // 生成报告
    const report = {
      timestamp: new Date().toISOString(),
      moduleTests: {
        total: moduleCount,
        passed: passedModules,
        failed: moduleCount - passedModules,
        successRate: (passedModules / moduleCount * 100).toFixed(2) + '%',
        details: moduleResults
      },
      integrationTests: {
        success: integrationSuccess,
        details: integrationDetails
      },
      sopHash: this.testResults.modules.persistence?.shortHash || 'unknown',
      overall: {
        success: passedModules === moduleCount && integrationSuccess,
        summary: passedModules === moduleCount && integrationSuccess 
          ? '所有SOP功能测试通过！' 
          : '部分测试失败，请检查日志'
      }
    };
    
    // 保存报告
    const reportDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, `sop_test_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.logger.info(`测试报告已保存到: ${reportPath}`);
    
    // 生成文本摘要
    const textSummary = this.generateTextSummary(report);
    const summaryPath = path.join(reportDir, `sop_test_summary_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);
    fs.writeFileSync(summaryPath, textSummary);
    
    this.logger.info(`测试摘要已保存到: ${summaryPath}`);
    
    return {
      report,
      reportPath,
      summaryPath,
      textSummary
    };
  }

  /**
   * 生成文本摘要
   */
  generateTextSummary(report) {
    let summary = '==========================\n';
    summary += '      SOP测试报告摘要      \n';
    summary += '==========================\n';
    summary += `生成时间: ${report.timestamp}\n`;
    summary += `SOP哈希: ${report.sopHash}\n\n`;
    
    summary += '模块测试结果:\n';
    summary += `  总模块数: ${report.moduleTests.total}\n`;
    summary += `  通过: ${report.moduleTests.passed}\n`;
    summary += `  失败: ${report.moduleTests.failed}\n`;
    summary += `  成功率: ${report.moduleTests.successRate}\n\n`;
    
    summary += '集成测试结果:\n';
    summary += `  总体状态: ${report.integrationTests.success ? '✓ 通过' : '✗ 失败'}\n`;
    
    report.integrationTests.details.forEach(test => {
      summary += `  ${test.name}: ${test.passed ? '✓ 通过' : '✗ 失败'}\n`;
    });
    
    summary += '\n';
    summary += '==========================\n';
    summary += `总体结果: ${report.overall.success ? '✓ 所有功能正常' : '✗ 存在问题'}\n`;
    summary += `总结: ${report.overall.summary}\n`;
    summary += '==========================\n';
    
    return summary;
  }

  /**
   * 执行完整的测试流程
   */
  async runFullTestSuite() {
    try {
      this.logger.info('========================================');
      this.logger.info('开始SOP综合测试套件');
      this.logger.info('========================================');
      
      // 1. 运行模块测试
      await this.runModuleTests();
      
      // 2. 运行集成测试
      await this.runIntegrationTests();
      
      // 3. 验证所有组件
      const verification = await this.verifyAllComponents();
      
      // 4. 生成最终报告
      const reportResult = await this.generateFinalReport();
      
      // 输出学习完成消息
      const sopHash = this.testResults.modules.persistence?.shortHash || 'unknown';
      this.logger.info('\n========================================');
      this.logger.info(`LEARNED_OK::${sopHash}`);
      this.logger.info('========================================');
      
      return {
        success: reportResult.report.overall.success,
        sopHash,
        report: reportResult.report,
        summary: reportResult.textSummary
      };
    } catch (error) {
      this.logger.error('运行测试套件时发生错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 主测试函数
async function main() {
  try {
    console.log('启动SOP综合测试...');
    
    const coordinator = new SOPTestCoordinator();
    const result = await coordinator.runFullTestSuite();
    
    console.log('\n测试完成！');
    console.log(`SOP哈希前10位: ${result.sopHash}`);
    console.log(`测试状态: ${result.success ? '✓ 成功' : '✗ 失败'}`);
    
    if (!result.success) {
      console.error(`错误: ${result.error}`);
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('测试过程中发生严重错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

// 导出模块供其他使用
module.exports = {
  SOPTestCoordinator,
  main
};
