const { getDeepSeekSecurityExecutor } = require('./deepseekSecurityExecutor');

/**
 * DeepSeek操作确认(dry-run)模块
 * 实现执行前的操作计划预览和确认机制
 */
class DeepSeekDryRunManager {
    constructor() {
        // 获取安全执行器实例
        this.securityExecutor = getDeepSeekSecurityExecutor();
        
        // 操作类型分类
        this.operationTypes = {
            WRITE: ['file_write', 'file_create', 'file_update', 'file_delete', 'config_change'],
            EXTERNAL: ['api_call', 'external_service', 'network_request'],
            SYSTEM: ['system_command', 'process_control', 'resource_access'],
            READ: ['file_read', 'data_query', 'information_retrieval']
        };
        
        // 执行历史
        this.executionHistory = [];
        
        console.log('[DeepSeekDryRun] 操作确认管理器初始化完成');
    }
    
    /**
     * 判断操作是否需要确认
     */
    requiresConfirmation(operation) {
        // 检查操作类型是否在需要确认的列表中
        const requiresConfirm = [
            ...this.operationTypes.WRITE,
            ...this.operationTypes.EXTERNAL
        ].includes(operation.type);
        
        return requiresConfirm;
    }
    
    /**
     * 生成dry-run执行计划
     */
    generateExecutionPlan(task) {
        const plan = {
            taskId: this._generateTaskId(),
            timestamp: new Date().toISOString(),
            operation: task.operation || 'unknown',
            description: task.description || 'DeepSeek执行任务',
            requiresConfirmation: this.requiresConfirmation(task.operation || {}),
            affectedResources: this._identifyAffectedResources(task),
            estimatedRuntime: this._estimateRuntime(task),
            safetyLevel: this._assessSafetyLevel(task),
            riskAssessment: this._assessRisk(task)
        };
        
        // 记录计划
        this.executionHistory.push({
            ...plan,
            status: 'PLANNED',
            taskDetails: this._sanitizeTaskDetails(task)
        });
        
        return plan;
    }
    
    /**
     * 执行dry-run并返回预览结果
     */
    async executeDryRun(executorId, task) {
        try {
            // 检查安全状态
            const securityStatus = this.securityExecutor.status();
            
            // 检查是否暂停
            if (securityStatus.paused) {
                return this.securityExecutor.getStandardOutput({
                    authorized: false,
                    dryRun: true,
                    status: 'System Paused',
                    plan: '无法执行：系统处于暂停状态'
                });
            }
            
            // 检查是否锁定
            if (securityStatus.autoLocked) {
                return this.securityExecutor.getStandardOutput({
                    authorized: false,
                    dryRun: true,
                    status: 'System Locked',
                    plan: '无法执行：系统已自动锁定'
                });
            }
            
            // 检查授权
            const isAuthorized = this.securityExecutor.isAuthorized(executorId);
            if (!isAuthorized) {
                return this.securityExecutor.getStandardOutput({
                    authorized: false,
                    dryRun: true,
                    status: 'Unauthorized Executor',
                    plan: '无法执行：执行器未授权'
                });
            }
            
            // 生成执行计划
            const plan = this.generateExecutionPlan(task);
            
            // 如果需要确认，返回等待确认状态
            if (plan.requiresConfirmation) {
                return this.securityExecutor.getStandardOutput({
                    authorized: true,
                    dryRun: true,
                    status: 'Awaiting Confirmation',
                    plan: this._formatPlanForOutput(plan)
                });
            } else {
                // 无需确认的操作可以直接执行
                return this.securityExecutor.getStandardOutput({
                    authorized: true,
                    dryRun: false,
                    status: 'Ready for Execution',
                    plan: this._formatPlanForOutput(plan)
                });
            }
            
        } catch (error) {
            console.error(`[DeepSeekDryRun] Dry-run执行失败: ${error.message}`);
            return this.securityExecutor.getStandardOutput({
                authorized: false,
                dryRun: true,
                status: 'Failed',
                plan: `Dry-run失败: ${error.message}`
            });
        }
    }
    
    /**
     * 确认执行计划并返回执行状态
     */
    confirmExecution(taskId, confirmBeforeExecute) {
        // 查找任务
        const task = this.executionHistory.find(t => t.taskId === taskId);
        
        if (!task) {
            return {
                success: false,
                message: '未找到指定的任务ID',
                status: 'NotFound'
            };
        }
        
        // 更新任务状态
        if (confirmBeforeExecute) {
            task.status = 'CONFIRMED';
            task.confirmedAt = new Date().toISOString();
            task.confirmed = true;
            
            console.log(`[DeepSeekDryRun] 任务已确认执行: ${taskId}`);
            
            return {
                success: true,
                message: '执行计划已确认',
                status: 'Confirmed',
                taskId: task.taskId,
                plan: this._formatPlanForOutput(task)
            };
        } else {
            task.status = 'CANCELLED';
            task.cancelledAt = new Date().toISOString();
            
            console.log(`[DeepSeekDryRun] 任务已取消: ${taskId}`);
            
            return {
                success: false,
                message: '执行计划已取消',
                status: 'Cancelled',
                taskId: task.taskId
            };
        }
    }
    
    /**
     * 获取任务执行历史
     */
    getExecutionHistory(limit = 10) {
        return this.executionHistory
            .slice(-limit)
            .map(task => ({
                taskId: task.taskId,
                timestamp: task.timestamp,
                operation: task.operation,
                status: task.status,
                requiresConfirmation: task.requiresConfirmation,
                safetyLevel: task.safetyLevel
            }));
    }
    
    /**
     * 私有方法：生成任务ID
     */
    _generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 私有方法：识别受影响的资源
     */
    _identifyAffectedResources(task) {
        const resources = [];
        
        // 检查文件路径
        if (task.path || task.filePath) {
            const filePath = task.path || task.filePath;
            resources.push({
                type: 'file',
                path: filePath,
                safe: this.securityExecutor.isPathSafe(filePath)
            });
        }
        
        // 检查API端点
        if (task.apiEndpoint) {
            resources.push({
                type: 'api',
                endpoint: task.apiEndpoint
            });
        }
        
        // 检查系统资源
        if (task.systemResource) {
            resources.push({
                type: 'system',
                resource: task.systemResource
            });
        }
        
        return resources;
    }
    
    /**
     * 私有方法：估计运行时间
     */
    _estimateRuntime(task) {
        // 基于操作类型的简单估计
        const operation = task.operation || {};
        
        switch (operation.type) {
            case 'file_read':
                return '~1s';
            case 'file_write':
                return '~2s';
            case 'api_call':
                return '~5s';
            case 'code_analysis':
                return '~10s';
            case 'complex_task':
                return '~30s';
            default:
                return '~5s';
        }
    }
    
    /**
     * 私有方法：评估安全级别
     */
    _assessSafetyLevel(task) {
        const operation = task.operation || {};
        
        // 检查是否包含敏感操作
        const hasWriteOperation = this.operationTypes.WRITE.includes(operation.type);
        const hasExternalOperation = this.operationTypes.EXTERNAL.includes(operation.type);
        const hasSystemOperation = this.operationTypes.SYSTEM.includes(operation.type);
        
        // 检查路径安全性
        let pathSafe = true;
        if (task.path || task.filePath) {
            const filePath = task.path || task.filePath;
            pathSafe = this.securityExecutor.isPathSafe(filePath);
        }
        
        if (!pathSafe || hasSystemOperation) {
            return 'HIGH_RISK';
        } else if (hasWriteOperation || hasExternalOperation) {
            return 'MEDIUM_RISK';
        } else {
            return 'LOW_RISK';
        }
    }
    
    /**
     * 私有方法：风险评估
     */
    _assessRisk(task) {
        const safetyLevel = this._assessSafetyLevel(task);
        const resources = this._identifyAffectedResources(task);
        
        const riskAssessment = {
            level: safetyLevel,
            warnings: [],
            recommendations: []
        };
        
        // 检查路径风险
        const unsafeResources = resources.filter(r => r.safe === false);
        if (unsafeResources.length > 0) {
            riskAssessment.warnings.push(`检测到不安全的资源访问: ${unsafeResources.map(r => r.path).join(', ')}`);
            riskAssessment.recommendations.push('请检查路径是否在允许的范围内');
        }
        
        // 基于安全级别的建议
        switch (safetyLevel) {
            case 'HIGH_RISK':
                riskAssessment.recommendations.push('建议在测试环境中先验证');
                riskAssessment.recommendations.push('确保有回滚机制');
                break;
            case 'MEDIUM_RISK':
                riskAssessment.recommendations.push('请确认操作的必要性');
                break;
        }
        
        return riskAssessment;
    }
    
    /**
     * 私有方法：格式化计划输出
     */
    _formatPlanForOutput(plan) {
        const operations = [];
        
        // 基本操作信息
        operations.push(`操作类型: ${plan.operation.type || 'unknown'}`);
        operations.push(`描述: ${plan.description}`);
        operations.push(`安全级别: ${plan.safetyLevel}`);
        operations.push(`预计运行时间: ${plan.estimatedRuntime}`);
        
        // 受影响的资源
        if (plan.affectedResources.length > 0) {
            operations.push('受影响资源:');
            plan.affectedResources.forEach(resource => {
                if (resource.type === 'file') {
                    operations.push(`  - 文件: ${resource.path} (安全: ${resource.safe ? '是' : '否'})`);
                } else if (resource.type === 'api') {
                    operations.push(`  - API: ${resource.endpoint}`);
                } else if (resource.type === 'system') {
                    operations.push(`  - 系统资源: ${resource.resource}`);
                }
            });
        }
        
        // 风险警告
        if (plan.riskAssessment.warnings.length > 0) {
            operations.push('⚠️ 警告:');
            plan.riskAssessment.warnings.forEach(warning => {
                operations.push(`  - ${warning}`);
            });
        }
        
        // 建议
        if (plan.riskAssessment.recommendations.length > 0) {
            operations.push('💡 建议:');
            plan.riskAssessment.recommendations.forEach(recommendation => {
                operations.push(`  - ${recommendation}`);
            });
        }
        
        return operations.join('\n');
    }
    
    /**
     * 私有方法：清理任务详情，移除敏感信息
     */
    _sanitizeTaskDetails(task) {
        const sanitized = { ...task };
        
        // 移除敏感字段
        const sensitiveFields = ['password', 'secret', 'token', 'key', 'credential'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }
}

// 创建单例实例
let dryRunManagerInstance = null;

function getDeepSeekDryRunManager() {
    if (!dryRunManagerInstance) {
        dryRunManagerInstance = new DeepSeekDryRunManager();
    }
    return dryRunManagerInstance;
}

// 导出模块
module.exports = {
    DeepSeekDryRunManager,
    getDeepSeekDryRunManager
};

// 导出到全局（浏览器环境）
if (typeof window !== 'undefined') {
    window.JEV = window.JEV || {};
    window.JEV.deepseekDryRun = {
        DeepSeekDryRunManager,
        getDeepSeekDryRunManager
    };
}