// DeepSeek安全执行器使用示例
// 展示如何在JEV安全模式下正确使用DeepSeek模块

/**
 * 示例目的：
 * 1. 展示如何初始化和配置DeepSeek安全执行器
 * 2. 演示完整的安全执行流程
 * 3. 展示各种安全机制的使用方法
 * 4. 提供实际应用场景参考
 */

// 导入所有必要的模块
const path = require('path');
const fs = require('fs');

// 导入DeepSeek安全模块
const {
    getDeepSeekSecurityExecutor
} = require('../modular/deepseekSecurityExecutor');

const {
    getDeepSeekDryRunManager
} = require('../modular/deepseekDryRun.js');

const {
    getDeepSeekPathRuntimeControl
} = require('../modular/deepseekPathRuntimeControl.js');

const {
    getDeepSeekFaultProtection
} = require('../modular/deepseekFaultProtection.js');

const {
    getDeepSeekLoggingSystem
} = require('../modular/deepseekLoggingSystem.js');

const {
    getDeepSeekQueueManager
} = require('../modular/deepseekQueueManager.js');

const {
    getConfig
} = require('../config/deepseekSecurityConfig.js');

/**
 * 示例1：基本安全执行流程
 * 演示如何初始化和使用DeepSeek安全执行器执行任务
 */
async function basicExecutionExample() {
    console.log('=== 示例1：基本安全执行流程 ===\n');
    
    try {
        // 1. 获取配置
        const config = getConfig();
        
        // 2. 初始化日志系统
        const logger = getDeepSeekLoggingSystem({ 
            config: config.logging 
        });
        logger.info('开始执行DeepSeek安全执行器示例', { example: 'basicExecution' });
        
        // 3. 初始化安全执行器
        const securityExecutor = getDeepSeekSecurityExecutor({
            config: config.securityExecutor
        });
        
        // 4. 初始化操作确认管理器
        const dryRunManager = getDeepSeekDryRunManager({
            config: config.dryRun
        });
        
        // 5. 初始化路径和运行时控制
        const pathController = getDeepSeekPathRuntimeControl({
            config: config.pathRuntimeControl
        });
        
        // 6. 初始化故障保护机制
        const faultProtection = getDeepSeekFaultProtection({
            config: config.faultProtection
        });
        
        // 7. 初始化队列管理器
        const queueManager = getDeepSeekQueueManager({
            config: config.queueManager
        });
        
        // 8. 检查系统状态
        const systemStatus = securityExecutor.checkSystemStatus();
        console.log('系统状态检查结果:', systemStatus);
        
        // 9. 如果系统暂停，则将任务加入队列
        if (systemStatus.paused) {
            console.log('系统当前处于暂停状态，任务将加入队列等待执行');
            
            const queueResult = queueManager.enqueueTask({
                type: 'analysis',
                data: { message: '这是一个测试任务' },
                priority: 'high'
            });
            
            console.log('任务已加入队列:', queueResult);
            return;
        }
        
        // 10. 验证执行器权限
        const executorId = 'trea_core'; // 使用授权的执行器ID
        const authResult = securityExecutor.authorizeExecutor(executorId);
        
        console.log('执行器授权结果:', authResult);
        
        if (!authResult.authorized) {
            console.error('执行器未授权，无法执行任务:', authResult.reason);
            return;
        }
        
        // 11. 创建任务数据
        const taskData = {
            operation: 'file_write',
            targetPath: path.resolve('d:\\PDF转网页\\output\\example_result.txt'),
            content: '这是一个安全执行的测试内容',
            executorId: executorId,
            timestamp: new Date().toISOString()
        };
        
        // 12. 执行dry-run操作
        const dryRunResult = dryRunManager.performDryRun(taskData);
        console.log('\nDry-Run 操作结果:');
        console.log(JSON.stringify(dryRunResult, null, 2));
        
        // 13. 等待用户确认（在实际应用中，这可能是API调用或UI确认）
        const userConfirmed = true; // 假设用户已确认
        
        if (!userConfirmed) {
            console.log('用户取消了操作，任务已终止');
            return;
        }
        
        // 14. 验证路径安全性
        const pathValidation = pathController.validatePath(taskData.targetPath);
        
        console.log('\n路径验证结果:', pathValidation);
        
        if (!pathValidation.valid) {
            console.error('路径验证失败，无法执行操作:', pathValidation.reason);
            // 记录失败
            faultProtection.recordFailure('permission_denied', pathValidation.reason);
            return;
        }
        
        // 15. 检查系统是否允许执行
        if (faultProtection.isSystemLocked()) {
            console.error('系统已锁定，无法执行任务');
            return;
        }
        
        // 16. 创建任务上下文
        const taskContext = {
            taskId: `task_${Date.now()}`,
            startTime: Date.now(),
            executorId: executorId,
            operation: taskData.operation,
            resource: taskData.targetPath
        };
        
        // 17. 记录任务开始
        logger.info('任务执行开始', taskContext);
        
        try {
            // 18. 实际执行文件写入操作
            // 确保目录存在
            const outputDir = path.dirname(taskData.targetPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // 执行写入操作
            fs.writeFileSync(taskData.targetPath, taskData.content, 'utf8');
            
            // 19. 记录成功
            taskContext.endTime = Date.now();
            taskContext.duration = taskContext.endTime - taskContext.startTime;
            taskContext.status = 'success';
            
            console.log(`\n文件已成功写入: ${taskData.targetPath}`);
            console.log(`执行时间: ${taskContext.duration}ms`);
            
            // 记录成功事件
            logger.info('任务执行成功', taskContext);
            
            // 记录成功到故障保护系统
            faultProtection.recordSuccess();
            
            // 20. 返回标准化输出
            const output = {
                executor: 'DeepSeek',
                paused: false,
                authorized: true,
                dry_run: false,
                plan: `写入文件到 ${taskData.targetPath}`,
                status: 'Completed',
                result: {
                    message: '操作成功完成',
                    path: taskData.targetPath
                },
                execution_time_ms: taskContext.duration
            };
            
            // 21. 验证输出安全性
            const validatedOutput = securityExecutor.validateOutput(output);
            
            console.log('\n验证后的输出:');
            console.log(JSON.stringify(validatedOutput, null, 2));
            
            return validatedOutput;
            
        } catch (error) {
            // 22. 处理执行错误
            taskContext.endTime = Date.now();
            taskContext.duration = taskContext.endTime - taskContext.startTime;
            taskContext.status = 'error';
            taskContext.error = error.message;
            
            console.error('\n执行过程中发生错误:', error.message);
            
            // 记录错误
            logger.error('任务执行失败', taskContext);
            
            // 记录失败到故障保护系统
            faultProtection.recordFailure('execution_error', error.message);
            
            // 检查是否触发锁定
            if (faultProtection.isSystemLocked()) {
                console.warn('警告: 系统已被锁定，需要管理员解锁');
                logger.warn('系统已自动锁定', { reason: '连续失败次数达到阈值' });
            }
            
            return {
                success: false,
                error: error.message,
                systemLocked: faultProtection.isSystemLocked()
            };
        }
        
    } catch (err) {
        console.error('示例执行出错:', err.message);
        console.error(err.stack);
    }
}

/**
 * 示例2：处理受限路径
 * 演示当尝试访问受限路径时的安全机制
 */
async function restrictedPathExample() {
    console.log('\n\n=== 示例2：处理受限路径 ===\n');
    
    try {
        // 初始化必要的组件
        const logger = getDeepSeekLoggingSystem();
        const securityExecutor = getDeepSeekSecurityExecutor();
        const pathController = getDeepSeekPathRuntimeControl();
        const faultProtection = getDeepSeekFaultProtection();
        
        // 记录示例开始
        logger.info('开始受限路径测试', { example: 'restrictedPath' });
        
        // 测试访问受限路径
        const restrictedPaths = [
            'C:\\system\\critical.dll',
            'C:\\secure\\private.key',
            '/system/config/settings.json',
            'C:\\Windows\\System32\\cmd.exe'
        ];
        
        console.log('测试受限路径访问:');
        
        for (const restrictedPath of restrictedPaths) {
            // 验证路径
            const validation = pathController.validatePath(restrictedPath);
            
            console.log(`\n路径: ${restrictedPath}`);
            console.log('验证结果:', validation.valid ? '允许' : '禁止');
            console.log('原因:', validation.reason);
            
            // 记录安全事件
            if (!validation.valid) {
                logger.warn('检测到尝试访问受限路径', {
                    path: restrictedPath,
                    executorId: 'test_executor',
                    reason: validation.reason
                });
                
                // 记录失败
                faultProtection.recordFailure('permission_denied', `尝试访问受限路径: ${restrictedPath}`);
            }
        }
        
        // 测试安全路径
        const safePaths = [
            path.resolve('d:\\PDF转网页\\output\\safe_file.txt'),
            path.resolve('d:\\PDF转网页\\logs\\test.log')
        ];
        
        console.log('\n\n测试安全路径访问:');
        
        for (const safePath of safePaths) {
            const validation = pathController.validatePath(safePath);
            
            console.log(`\n路径: ${safePath}`);
            console.log('验证结果:', validation.valid ? '允许' : '禁止');
            console.log('原因:', validation.reason);
        }
        
    } catch (err) {
        console.error('受限路径测试出错:', err.message);
    }
}

/**
 * 示例3：任务队列管理
 * 演示如何使用队列管理器处理任务
 */
async function queueManagementExample() {
    console.log('\n\n=== 示例3：任务队列管理 ===\n');
    
    try {
        // 初始化组件
        const queueManager = getDeepSeekQueueManager();
        const logger = getDeepSeekLoggingSystem();
        const securityExecutor = getDeepSeekSecurityExecutor();
        
        // 记录示例开始
        logger.info('开始队列管理测试', { example: 'queueManagement' });
        
        // 模拟系统暂停（用于演示队列功能）
        console.log('模拟系统暂停状态...');
        
        // 临时修改安全执行器的paused状态（仅用于演示）
        const originalCheckMethod = securityExecutor.checkSystemPaused;
        securityExecutor.checkSystemPaused = function() { return true; };
        
        // 创建模拟任务处理器
        const mockTaskProcessor = async (task) => {
            console.log(`处理任务: ${task.id}`);
            console.log(`任务数据:`, task.data);
            
            // 模拟处理时间
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return { success: true, result: `任务 ${task.id} 处理完成` };
        };
        
        // 设置任务处理器
        queueManager.setTaskProcessor(mockTaskProcessor);
        
        // 添加多个任务到队列
        console.log('添加任务到队列...');
        
        const tasks = [
            { type: 'analysis', data: { target: 'document1.pdf' }, priority: 'high' },
            { type: 'generation', data: { prompt: '生成安全报告' }, priority: 'normal' },
            { type: 'optimization', data: { code: 'function test() {}' }, priority: 'low' },
            { type: 'planning', data: { goal: '创建安全策略' }, priority: 'high' }
        ];
        
        const queueResults = [];
        
        for (const task of tasks) {
            const result = queueManager.enqueueTask(task, {
                priority: task.priority,
                metadata: { source: 'queue_example' }
            });
            
            queueResults.push(result);
            console.log(`添加任务结果:`, result);
        }
        
        // 获取队列状态
        console.log('\n队列状态:');
        const queueStatus = queueManager.getQueueStatus();
        console.log(JSON.stringify(queueStatus, null, 2));
        
        // 模拟系统恢复
        console.log('\n模拟系统恢复状态...');
        securityExecutor.checkSystemPaused = originalCheckMethod;
        
        // 触发队列重放
        console.log('\n触发队列重放...');
        const replayResult = queueManager.replayQueue();
        console.log('重放结果:', replayResult);
        
        // 等待一段时间让任务处理完成
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 再次检查队列状态
        console.log('\n处理后的队列状态:');
        const finalQueueStatus = queueManager.getQueueStatus();
        console.log(JSON.stringify(finalQueueStatus, null, 2));
        
    } catch (err) {
        console.error('队列管理测试出错:', err.message);
    }
}

/**
 * 示例4：故障保护演示
 * 演示故障保护和自动锁定机制
 */
async function faultProtectionExample() {
    console.log('\n\n=== 示例4：故障保护演示 ===\n');
    
    try {
        // 初始化故障保护
        const faultProtection = getDeepSeekFaultProtection({
            config: {
                autoLock: {
                    enabled: true,
                    failureThreshold: 3,
                    lockDurationMs: 10000 // 10秒锁定，用于演示
                }
            }
        });
        
        const logger = getDeepSeekLoggingSystem();
        logger.info('开始故障保护测试', { example: 'faultProtection' });
        
        // 记录系统当前状态
        console.log('初始系统状态 - 锁定:', faultProtection.isSystemLocked());
        
        // 模拟多次失败
        console.log('\n模拟连续失败...');
        
        for (let i = 1; i <= 4; i++) {
            console.log(`记录失败 #${i}`);
            faultProtection.recordFailure('execution_error', `测试失败 ${i}`);
            
            // 检查系统是否被锁定
            const locked = faultProtection.isSystemLocked();
            console.log(`系统锁定状态: ${locked}`);
            
            if (locked) {
                console.log('系统已被锁定，需要等待解锁或管理员介入');
                break;
            }
        }
        
        // 尝试执行任务（应该被拒绝）
        if (faultProtection.isSystemLocked()) {
            console.log('\n尝试在锁定状态下执行任务...');
            console.log('任务执行结果: 被拒绝');
        }
        
        // 尝试手动解锁（实际应用中需要适当的认证）
        console.log('\n尝试手动解锁系统...');
        const unlockResult = faultProtection.tryUnlock('admin');
        console.log('解锁结果:', unlockResult.success ? '成功' : '失败');
        console.log('解锁后系统状态 - 锁定:', faultProtection.isSystemLocked());
        
        // 模拟成功执行，重置失败计数
        console.log('\n模拟成功执行，重置失败计数...');
        faultProtection.recordSuccess();
        
        // 获取故障保护状态
        console.log('\n故障保护状态:');
        const protectionStatus = faultProtection.getProtectionStatus();
        console.log(JSON.stringify(protectionStatus, null, 2));
        
    } catch (err) {
        console.error('故障保护测试出错:', err.message);
    }
}

/**
 * 示例5：完整工作流集成
 * 演示一个完整的DeepSeek调用工作流
 */
async function completeWorkflowExample() {
    console.log('\n\n=== 示例5：完整工作流集成 ===\n');
    
    // 模拟一个完整的DeepSeek调用工作流
    try {
        // 1. 初始化所有组件
        const config = getConfig();
        const securityExecutor = getDeepSeekSecurityExecutor({ config: config.securityExecutor });
        const dryRunManager = getDeepSeekDryRunManager({ config: config.dryRun });
        const pathController = getDeepSeekPathRuntimeControl({ config: config.pathRuntimeControl });
        const faultProtection = getDeepSeekFaultProtection({ config: config.faultProtection });
        const logger = getDeepSeekLoggingSystem({ config: config.logging });
        const queueManager = getDeepSeekQueueManager({ config: config.queueManager });
        
        // 2. 模拟一个用户请求
        const userRequest = {
            userId: 'user_123',
            requestId: `req_${Date.now()}`,
            taskType: 'code_analysis',
            targetCode: 'function vulnerable() {\n  // 这里可能有安全问题\n}',
            timestamp: new Date().toISOString()
        };
        
        console.log('收到用户请求:', userRequest.requestId);
        logger.info('收到DeepSeek调用请求', userRequest);
        
        // 3. 检查系统状态
        const paused = securityExecutor.checkSystemPaused();
        
        if (paused) {
            console.log('系统当前处于暂停状态，请求将加入队列');
            
            // 将请求加入队列
            const queueResult = queueManager.enqueueTask(userRequest, {
                priority: 'high',
                metadata: { source: 'user_request' }
            });
            
            console.log('请求已加入队列:', queueResult);
            
            // 返回队列响应
            return {
                executor: 'DeepSeek',
                paused: true,
                status: 'Queued',
                queuePosition: queueResult.position,
                message: '系统当前暂停，请求已加入队列等待处理'
            };
        }
        
        // 4. 验证执行器权限
        const executorId = 'trea_core';
        const authResult = securityExecutor.authorizeExecutor(executorId);
        
        if (!authResult.authorized) {
            console.error('执行器未授权:', authResult.reason);
            logger.error('执行器授权失败', { executorId, reason: authResult.reason });
            
            return {
                executor: 'DeepSeek',
                paused: false,
                authorized: false,
                status: 'Error',
                message: authResult.reason
            };
        }
        
        // 5. 检查系统是否锁定
        if (faultProtection.isSystemLocked()) {
            console.error('系统已锁定，无法处理请求');
            logger.error('系统锁定拒绝请求', { requestId: userRequest.requestId });
            
            return {
                executor: 'DeepSeek',
                paused: false,
                authorized: true,
                status: 'Locked',
                message: '系统已锁定，请联系管理员'
            };
        }
        
        // 6. 生成分析任务
        const analysisTask = {
            operation: 'code_analysis',
            code: userRequest.targetCode,
            outputPath: path.resolve('d:\\PDF转网页\\output\\analysis_result.json'),
            options: {
                securityScan: true,
                performanceAnalysis: true,
                optimizationSuggestions: true
            }
        };
        
        // 7. 执行dry-run
        console.log('执行Dry-Run分析...');
        const dryRunResult = dryRunManager.performDryRun(analysisTask);
        
        console.log('Dry-Run结果:');
        console.log(`风险级别: ${dryRunResult.riskLevel}`);
        console.log(`执行计划: ${dryRunResult.plan}`);
        
        // 8. 模拟用户确认
        const userConfirmed = true;
        
        if (!userConfirmed) {
            console.log('用户取消操作');
            logger.info('用户取消DeepSeek操作', { requestId: userRequest.requestId });
            
            return {
                executor: 'DeepSeek',
                paused: false,
                authorized: true,
                dry_run: true,
                status: 'Cancelled',
                message: '用户取消了操作'
            };
        }
        
        // 9. 验证输出路径
        const pathValidation = pathController.validatePath(analysisTask.outputPath);
        
        if (!pathValidation.valid) {
            console.error('路径验证失败:', pathValidation.reason);
            faultProtection.recordFailure('validation_error', pathValidation.reason);
            
            return {
                executor: 'DeepSeek',
                paused: false,
                authorized: true,
                status: 'Error',
                message: pathValidation.reason
            };
        }
        
        // 10. 开始执行任务
        console.log('开始执行代码分析任务...');
        
        // 创建任务上下文
        const taskContext = {
            taskId: `analysis_${Date.now()}`,
            requestId: userRequest.requestId,
            startTime: Date.now()
        };
        
        logger.info('代码分析任务开始', taskContext);
        
        try {
            // 模拟代码分析执行
            await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟分析耗时
            
            // 生成分析结果
            const analysisResult = {
                vulnerabilities: [],
                optimizations: [
                    { line: 1, suggestion: '添加函数参数验证' },
                    { line: 2, suggestion: '添加错误处理' }
                ],
                performance: '良好',
                summary: '代码结构基本合理，建议添加更多安全检查'
            };
            
            // 确保输出目录存在
            const outputDir = path.dirname(analysisTask.outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // 写入结果
            fs.writeFileSync(analysisTask.outputPath, JSON.stringify(analysisResult, null, 2));
            
            // 更新任务上下文
            taskContext.endTime = Date.now();
            taskContext.duration = taskContext.endTime - taskContext.startTime;
            taskContext.status = 'success';
            
            console.log(`代码分析完成，耗时: ${taskContext.duration}ms`);
            
            // 记录成功
            logger.info('代码分析任务完成', taskContext);
            faultProtection.recordSuccess();
            
            // 11. 生成标准化输出
            const standardOutput = {
                executor: 'DeepSeek',
                paused: false,
                authorized: true,
                dry_run: false,
                plan: '代码分析 → 安全检查 → 优化建议',
                status: 'Completed',
                result: analysisResult,
                execution_time_ms: taskContext.duration
            };
            
            // 12. 验证输出
            const validatedOutput = securityExecutor.validateOutput(standardOutput);
            
            console.log('\n任务执行结果:');
            console.log(JSON.stringify(validatedOutput, null, 2));
            
            return validatedOutput;
            
        } catch (error) {
            // 处理执行错误
            taskContext.endTime = Date.now();
            taskContext.error = error.message;
            taskContext.status = 'error';
            
            console.error('执行过程中出错:', error.message);
            
            // 记录错误
            logger.error('代码分析任务失败', taskContext);
            faultProtection.recordFailure('execution_error', error.message);
            
            return {
                executor: 'DeepSeek',
                paused: false,
                authorized: true,
                status: 'Error',
                message: error.message
            };
        }
        
    } catch (err) {
        console.error('完整工作流示例出错:', err.message);
    }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
    console.log('========== DeepSeek安全执行器示例 ==========\n');
    
    try {
        // 运行示例1
        await basicExecutionExample();
        
        // 运行示例2
        await restrictedPathExample();
        
        // 运行示例3
        await queueManagementExample();
        
        // 运行示例4
        await faultProtectionExample();
        
        // 运行示例5
        await completeWorkflowExample();
        
        console.log('\n\n========== 所有示例执行完成 ==========');
        
    } catch (err) {
        console.error('运行示例出错:', err.message);
    }
}

/**
 * 模块导出
 */
module.exports = {
    runAllExamples,
    basicExecutionExample,
    restrictedPathExample,
    queueManagementExample,
    faultProtectionExample,
    completeWorkflowExample
};

/**
 * 如果直接运行此文件，则执行所有示例
 */
if (require.main === module) {
    runAllExamples().then(() => {
        console.log('\n示例执行结束');
    }).catch(err => {
        console.error('示例执行失败:', err);
    });
}