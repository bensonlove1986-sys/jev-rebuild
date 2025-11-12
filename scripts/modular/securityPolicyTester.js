const path = require('path');
const fs = require('fs').promises;

// 导入所有安全模块
const { securityPolicy } = require('./advancedSecurityPolicy');
const { pauseResumeController } = require('./pauseResumeController');
const { operationManager } = require('./operationConfirmation');
const { pathRuntimeController } = require('./pathRuntimeController');
const { failSafeController } = require('./failSafeController');
const { loggingQueueManager } = require('./loggingQueueManager');

/**
 * 安全策略测试器
 * 用于验证所有安全策略功能模块的完整性和正确性
 */
class SecurityPolicyTester {
  constructor() {
    // 测试结果记录
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    
    // 测试配置
    this.config = {
      mockDelay: 100, // 模拟操作延迟
      testTimeout: 5000, // 测试超时时间
      printResults: true // 是否打印结果
    };
    
    // 初始化所有安全模块
    this.initializeModules();
    
    console.log('===== JEV 安全策略测试框架 =====');
    console.log('测试环境初始化完成，开始执行测试...');
  }
  
  /**
   * 初始化所有安全模块
   */
  initializeModules() {
    // 使用导入的securityPolicy实例
    this.securityPolicy = securityPolicy;
    this.pauseResumeController = pauseResumeController;
    this.operationManager = operationManager;
    this.pathController = pathRuntimeController;
    this.failSafeController = failSafeController;
    this.loggingManager = loggingQueueManager;
    
    console.log('✅ 所有安全模块初始化完成');
  }
  
  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('\n📋 开始执行测试套件...');
    
    try {
      // 运行各个测试模块
      await this.testPauseResumeFunctionality();
      await this.testOperationConfirmation();
      await this.testPathRestrictions();
      await this.testRuntimeLimits();
      await this.testFailSafeMechanism();
      await this.testLoggingAndQueue();
      
      // 生成测试报告
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ 测试执行过程中发生错误:', error.message);
      this.recordTestResult('测试框架', 'failed', error.message);
    }
  }
  
  /**
   * 测试暂停/恢复功能
   */
  async testPauseResumeFunctionality() {
    console.log('\n🔄 测试暂停/恢复功能...');
    
    try {
      // 初始状态检查
      const initialState = this.pauseResumeController.getStatus();
      this.recordTestResult('初始状态检查', initialState.paused === false ? 'passed' : 'failed');
      
      // 测试暂停命令
      const pauseResult = this.pauseResumeController.executePause('测试暂停');
      this.recordTestResult('执行暂停', pauseResult.success ? 'passed' : 'failed', pauseResult.message);
      
      // 检查暂停状态
      const pausedState = this.pauseResumeController.getStatus();
      this.recordTestResult('暂停状态检查', pausedState.paused === true ? 'passed' : 'failed');
      
      // 测试恢复命令
      const resumeResult = this.pauseResumeController.executeResume('测试恢复');
      this.recordTestResult('执行恢复', resumeResult.success ? 'passed' : 'failed', resumeResult.message);
      
      // 检查恢复状态
      const resumedState = this.pauseResumeController.getStatus();
      this.recordTestResult('恢复状态检查', resumedState.paused === false ? 'passed' : 'failed');
      
      console.log('✅ 暂停/恢复功能测试完成');
    } catch (error) {
      console.error('❌ 暂停/恢复测试失败:', error.message);
      this.recordTestResult('暂停/恢复测试', 'failed', error.message);
    }
  }
  
  /**
   * 测试操作确认机制
   */
  async testOperationConfirmation() {
    console.log('\n✅ 测试操作确认机制...');
    
    try {
      // 测试白名单令牌验证
      const validToken = this.operationManager.validateToken('TREA_MAIN');
      this.recordTestResult('有效令牌验证', validToken ? 'passed' : 'failed');
      
      const invalidToken = this.operationManager.validateToken('INVALID_TOKEN');
      this.recordTestResult('无效令牌验证', !invalidToken ? 'passed' : 'failed');
      
      // 模拟确认操作（使用模拟模式）
      this.operationManager.setMockMode(true);
      
      // 测试自动确认
      this.operationManager.setAutoConfirm(true);
      const autoConfirmResult = await this.operationManager.requestConfirmation('测试操作', 'TREA_MAIN');
      this.recordTestResult('自动确认测试', autoConfirmResult.approved ? 'passed' : 'failed');
      
      // 测试手动确认（在模拟模式下）
      this.operationManager.setAutoConfirm(false);
      const manualConfirmResult = await this.operationManager.requestConfirmation('测试操作', 'TREA_MAIN', true);
      this.recordTestResult('手动确认测试', manualConfirmResult.approved ? 'passed' : 'failed');
      
      this.operationManager.setMockMode(false);
      
      console.log('✅ 操作确认机制测试完成');
    } catch (error) {
      console.error('❌ 操作确认测试失败:', error.message);
      this.recordTestResult('操作确认测试', 'failed', error.message);
    }
  }
  
  /**
   * 测试路径限制功能
   */
  async testPathRestrictions() {
    console.log('\n🛑 测试路径限制功能...');
    
    try {
      // 测试受限路径
      const restrictedPath = this.pathController.validatePathAccess('C:\\Windows\\System32');
      this.recordTestResult('受限路径检查', !restrictedPath.allowed ? 'passed' : 'failed');
      
      // 测试通配符路径
      const wildcardPath = this.pathController.validatePathAccess('C:\\Users\\admin\\AppData\\Roaming');
      this.recordTestResult('通配符路径检查', !wildcardPath.allowed ? 'passed' : 'failed');
      
      // 测试允许的路径
      const allowedPath = this.pathController.validatePathAccess('D:\\PDF转网页');
      this.recordTestResult('允许路径检查', allowedPath.allowed ? 'passed' : 'failed');
      
      // 测试空路径
      const emptyPath = this.pathController.validatePathAccess('');
      this.recordTestResult('空路径检查', !emptyPath.allowed ? 'passed' : 'failed');
      
      console.log('✅ 路径限制功能测试完成');
    } catch (error) {
      console.error('❌ 路径限制测试失败:', error.message);
      this.recordTestResult('路径限制测试', 'failed', error.message);
    }
  }
  
  /**
   * 测试运行时限制功能
   */
  async testRuntimeLimits() {
    console.log('\n⏱️  测试运行时限制功能...');
    
    try {
      // 创建测试操作
      const operationId = 'test_operation_runtime';
      this.pathController.startOperation(operationId, '测试运行时');
      
      // 获取操作状态
      const status = this.pathController.getOperationStatus(operationId);
      this.recordTestResult('操作状态跟踪', status && status.isRunning ? 'passed' : 'failed');
      
      // 模拟操作完成
      this.pathController.stopOperation(operationId, '测试完成');
      const finalStatus = this.pathController.getOperationStatus(operationId);
      this.recordTestResult('操作停止跟踪', !finalStatus.isRunning ? 'passed' : 'failed');
      
      // 检查操作列表
      const activeOps = this.pathController.getActiveOperations();
      this.recordTestResult('活动操作列表', Array.isArray(activeOps) ? 'passed' : 'failed');
      
      console.log('✅ 运行时限制功能测试完成');
    } catch (error) {
      console.error('❌ 运行时限制测试失败:', error.message);
      this.recordTestResult('运行时限制测试', 'failed', error.message);
    }
  }
  
  /**
   * 测试故障保护机制
   */
  async testFailSafeMechanism() {
    console.log('\n🛡️  测试故障保护机制...');
    
    try {
      // 重置失败计数
      this.failSafeController.resetFailureCount();
      
      // 测试单次失败记录
      const singleFailure = this.failSafeController.recordFailure('测试操作', new Error('测试错误'));
      this.recordTestResult('单次失败记录', !singleFailure ? 'passed' : 'failed');
      
      // 检查失败计数
      const status = this.failSafeController.getStatus();
      this.recordTestResult('失败计数检查', status.failureCount === 1 ? 'passed' : 'failed');
      
      // 手动锁定测试
      this.failSafeController.lockSystem('测试锁定');
      const lockedStatus = this.failSafeController.getStatus();
      this.recordTestResult('手动锁定测试', lockedStatus.isLocked ? 'passed' : 'failed');
      
      // 手动解锁测试
      this.failSafeController.unlockSystem('测试解锁');
      const unlockedStatus = this.failSafeController.getStatus();
      this.recordTestResult('手动解锁测试', !unlockedStatus.isLocked ? 'passed' : 'failed');
      
      console.log('✅ 故障保护机制测试完成');
    } catch (error) {
      console.error('❌ 故障保护测试失败:', error.message);
      this.recordTestResult('故障保护测试', 'failed', error.message);
    }
  }
  
  /**
   * 测试日志和队列功能
   */
  async testLoggingAndQueue() {
    console.log('\n📝 测试日志和队列功能...');
    
    try {
      // 测试日志记录
      await this.loggingManager.log('operator_ns', 'info', '测试日志消息', { test: true });
      this.recordTestResult('日志记录测试', 'passed');
      
      // 测试操作执行
      const mockOperation = async (data) => {
        return { success: true, data };
      };
      
      const result = await this.loggingManager.executeOrQueue(mockOperation, 'test_queue_op', { test: 'queue' });
      this.recordTestResult('操作执行测试', result.executed ? 'passed' : 'failed');
      
      // 测试暂停和队列功能
      this.loggingManager.setPaused(true);
      const queuedResult = await this.loggingManager.executeOrQueue(mockOperation, 'queued_op', { test: 'queued' });
      this.recordTestResult('操作队列测试', queuedResult.queued ? 'passed' : 'failed');
      
      // 检查队列状态
      const queueStatus = this.loggingManager.getQueueStatus();
      this.recordTestResult('队列状态检查', queueStatus.length >= 1 ? 'passed' : 'failed');
      
      // 恢复系统
      this.loggingManager.setPaused(false);
      
      console.log('✅ 日志和队列功能测试完成');
    } catch (error) {
      console.error('❌ 日志队列测试失败:', error.message);
      this.recordTestResult('日志队列测试', 'failed', error.message);
    }
  }
  
  /**
   * 记录测试结果
   */
  recordTestResult(testName, status, details = '') {
    const result = {
      name: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.tests.push(result);
    
    switch (status) {
      case 'passed':
        this.testResults.passed++;
        console.log(`✅ ${testName} - 通过`);
        break;
      case 'failed':
        this.testResults.failed++;
        console.log(`❌ ${testName} - 失败${details ? ` (${details})` : ''}`);
        break;
      case 'skipped':
        this.testResults.skipped++;
        console.log(`⏭️  ${testName} - 跳过`);
        break;
    }
  }
  
  /**
   * 生成测试报告
   */
  generateTestReport() {
    const { passed, failed, skipped, tests } = this.testResults;
    const total = passed + failed + skipped;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log('\n===== 测试报告 =====');
    console.log(`总测试数: ${total}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`跳过: ${skipped}`);
    console.log(`成功率: ${successRate}%`);
    
    if (failed > 0) {
      console.log('\n失败的测试:');
      tests.filter(test => test.status === 'failed').forEach(test => {
        console.log(`  - ${test.name}: ${test.details}`);
      });
    }
    
    console.log('\n====================');
    
    // 保存测试报告到文件
    this.saveTestReport(tests);
    
    return {
      total,
      passed,
      failed,
      skipped,
      successRate,
      tests
    };
  }
  
  /**
   * 保存测试报告到文件
   */
  async saveTestReport(tests) {
    try {
      const reportDir = path.join(__dirname, '..', 'reports');
      await fs.mkdir(reportDir, { recursive: true });
      
      const reportFile = path.join(reportDir, `security_test_report_${Date.now()}.json`);
      const reportData = {
        generated_at: new Date().toISOString(),
        ...this.testResults
      };
      
      await fs.writeFile(reportFile, JSON.stringify(reportData, null, 2));
      console.log(`测试报告已保存: ${reportFile}`);
    } catch (error) {
      console.error('保存测试报告失败:', error.message);
    }
  }
  
  /**
   * 执行集成测试
   */
  async runIntegrationTest() {
    console.log('\n🔄 执行集成测试...');
    
    try {
      // 测试完整的安全工作流程
      console.log('1. 初始化系统');
      
      // 2. 执行受限操作
      console.log('2. 测试受限路径访问');
      const restrictedAccess = this.pathController.validatePathAccess('C:\\Windows');
      this.recordTestResult('集成测试-受限路径', !restrictedAccess.allowed ? 'passed' : 'failed');
      
      // 3. 设置系统暂停
      console.log('3. 暂停系统并测试队列');
      this.pauseResumeController.executePause('集成测试暂停');
      
      // 4. 测试队列功能
      const mockOp = async (data) => ({ success: true });
      const queueResult = await this.loggingManager.executeOrQueue(mockOp, 'integration_test_op');
      this.recordTestResult('集成测试-队列功能', queueResult.queued ? 'passed' : 'failed');
      
      // 5. 恢复系统
      console.log('4. 恢复系统');
      this.pauseResumeController.executeResume('集成测试恢复');
      
      // 6. 验证操作确认
      console.log('5. 验证操作确认');
      this.operationManager.setMockMode(true);
      const confirmResult = await this.operationManager.requestConfirmation('集成测试操作', 'TREA_MAIN');
      this.recordTestResult('集成测试-操作确认', confirmResult.approved ? 'passed' : 'failed');
      
      console.log('✅ 集成测试完成');
    } catch (error) {
      console.error('❌ 集成测试失败:', error.message);
      this.recordTestResult('集成测试', 'failed', error.message);
    }
  }
}

/**
 * 运行测试的主函数
 */
async function runSecurityTests() {
  const tester = new SecurityPolicyTester();
  
  // 运行单元测试
  await tester.runAllTests();
  
  // 运行集成测试
  await tester.runIntegrationTest();
  
  // 生成最终报告
  const finalReport = tester.generateTestReport();
  
  return finalReport;
}

// 导出测试函数
exports.SecurityPolicyTester = SecurityPolicyTester;
exports.runSecurityTests = runSecurityTests;

// 直接运行测试
if (require.main === module) {
  console.log('开始执行 JEV 安全策略测试...');
  
  runSecurityTests()
    .then(report => {
      console.log('\n测试执行完成！');
      console.log(`最终结果: ${report.successRate}% 通过率 (${report.passed}/${report.total})`);
      process.exit(report.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('测试执行出错:', error);
      process.exit(1);
    });
}