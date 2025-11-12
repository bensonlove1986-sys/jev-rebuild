// JEV Cloud Relay v11.0 - Task Tracker Module
// 任务追踪与超时提醒模块

const fs = require('fs');
const path = require('path');

class RelayTaskTracker {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.tasks = new Map();
    this.taskTimeoutMin = config.task_timeout_min || 30;
    this.taskReportPath = path.join(__dirname, 'relay_task_report.json');
    this.notificationHandlers = [];
    
    // 启动任务监控器
    this.startTaskMonitor();
  }

  startTaskMonitor() {
    // 每分钟检查一次超时任务
    setInterval(() => {
      this.checkTimeouts();
    }, 60000);
    
    this.logger.logSystem('任务监控器已启动，超时时间: ' + this.taskTimeoutMin + ' 分钟');
  }

  async trackTask(data) {
    try {
      const { action, taskId, ...taskData } = data;
      
      switch (action) {
        case 'create':
          return this.createTask(taskData);
        case 'update':
          return this.updateTask(taskId, taskData);
        case 'complete':
          return this.completeTask(taskId, taskData);
        case 'cancel':
          return this.cancelTask(taskId, taskData);
        case 'get':
          return this.getTask(taskId);
        case 'list':
          return this.listTasks(taskData.filter || {});
        default:
          throw new Error('未知的任务操作');
      }
    } catch (error) {
      this.logger.logError('任务追踪错误:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  createTask(taskData) {
    const taskId = this.generateTaskId();
    const now = new Date();
    
    const task = {
      id: taskId,
      status: 'created',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      deadline: this.calculateDeadline(now),
      priority: taskData.priority || 'medium',
      assignee: taskData.assignee || 'system',
      type: taskData.type || 'general',
      description: taskData.description || '',
      metadata: taskData.metadata || {},
      history: [{
        timestamp: now.toISOString(),
        status: 'created',
        message: '任务已创建'
      }]
    };

    this.tasks.set(taskId, task);
    this.logger.logRelay(`任务已创建: ${taskId}`);
    
    // 更新任务报告
    this.updateTaskReport();
    
    return task;
  }

  updateTask(taskId, updateData) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    const now = new Date();
    const oldStatus = task.status;
    
    // 更新任务字段
    Object.assign(task, updateData);
    task.updated_at = now.toISOString();
    
    // 如果状态改变，记录历史
    if (updateData.status && updateData.status !== oldStatus) {
      task.history.push({
        timestamp: now.toISOString(),
        status: updateData.status,
        message: updateData.message || `状态变更为 ${updateData.status}`
      });
    }

    this.logger.logRelay(`任务已更新: ${taskId}, 状态: ${task.status}`);
    
    // 更新任务报告
    this.updateTaskReport();
    
    return task;
  }

  completeTask(taskId, completionData = {}) {
    return this.updateTask(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      result: completionData.result || {},
      message: completionData.message || '任务已完成'
    });
  }

  cancelTask(taskId, cancelData = {}) {
    return this.updateTask(taskId, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      reason: cancelData.reason || '用户取消',
      message: cancelData.message || '任务已取消'
    });
  }

  getTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }
    return task;
  }

  listTasks(filter = {}) {
    let tasks = Array.from(this.tasks.values());
    
    // 应用过滤条件
    if (filter.status) {
      tasks = tasks.filter(task => task.status === filter.status);
    }
    
    if (filter.assignee) {
      tasks = tasks.filter(task => task.assignee === filter.assignee);
    }
    
    if (filter.type) {
      tasks = tasks.filter(task => task.type === filter.type);
    }
    
    if (filter.priority) {
      tasks = tasks.filter(task => task.priority === filter.priority);
    }

    // 按更新时间排序
    tasks.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    
    return {
      tasks: tasks,
      total: tasks.length,
      timestamp: new Date().toISOString()
    };
  }

  checkTimeouts() {
    const now = new Date();
    const timeoutTasks = [];
    
    this.tasks.forEach((task, taskId) => {
      if (task.status === 'created' || task.status === 'processing') {
        const deadline = new Date(task.deadline);
        
        if (now > deadline) {
          // 任务超时
          this.handleTaskTimeout(taskId, task);
          timeoutTasks.push(taskId);
        }
      }
    });
    
    if (timeoutTasks.length > 0) {
      this.logger.logWarn(`发现 ${timeoutTasks.length} 个超时任务`);
      this.sendTimeoutNotification(timeoutTasks);
    }
  }

  handleTaskTimeout(taskId, task) {
    this.updateTask(taskId, {
      status: 'timeout',
      message: `任务超时，超过 ${this.taskTimeoutMin} 分钟`,
      timeout_at: new Date().toISOString()
    });
  }

  calculateDeadline(createdTime) {
    const deadline = new Date(createdTime);
    deadline.setMinutes(deadline.getMinutes() + this.taskTimeoutMin);
    return deadline.toISOString();
  }

  generateTaskId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `task-${timestamp}-${random}`;
  }

  updateTaskReport() {
    try {
      const report = {
        total_tasks: this.tasks.size,
        status_counts: this.getStatusCounts(),
        priority_counts: this.getPriorityCounts(),
        recent_tasks: this.getRecentTasks(10),
        timeout_count: this.getTimeoutCount(),
        last_updated: new Date().toISOString()
      };

      fs.writeFileSync(this.taskReportPath, JSON.stringify(report, null, 2));
    } catch (error) {
      this.logger.logError('更新任务报告失败:', error);
    }
  }

  getStatusCounts() {
    const counts = {};
    this.tasks.forEach(task => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });
    return counts;
  }

  getPriorityCounts() {
    const counts = {};
    this.tasks.forEach(task => {
      counts[task.priority] = (counts[task.priority] || 0) + 1;
    });
    return counts;
  }

  getRecentTasks(limit = 10) {
    return Array.from(this.tasks.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  getTimeoutCount() {
    let count = 0;
    this.tasks.forEach(task => {
      if (task.status === 'timeout') {
        count++;
      }
    });
    return count;
  }

  // 添加通知处理器
  addNotificationHandler(handler) {
    this.notificationHandlers.push(handler);
  }

  sendTimeoutNotification(timeoutTaskIds) {
    const notification = {
      type: 'timeout',
      task_ids: timeoutTaskIds,
      count: timeoutTaskIds.length,
      timestamp: new Date().toISOString()
    };

    // 调用所有通知处理器
    this.notificationHandlers.forEach(handler => {
      try {
        handler(notification);
      } catch (error) {
        this.logger.logError('通知处理失败:', error);
      }
    });
  }

  // 重新调度任务
  rescheduleTask(taskId, newTimeoutMin) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    const now = new Date();
    task.deadline = new Date(now.getTime() + newTimeoutMin * 60000).toISOString();
    task.updated_at = now.toISOString();
    
    this.logger.logRelay(`任务已重新调度: ${taskId}, 新超时时间: ${newTimeoutMin} 分钟`);
    
    return task;
  }

  // 批量操作任务
  batchUpdateTasks(taskIds, updateData) {
    const results = [];
    
    taskIds.forEach(taskId => {
      try {
        const result = this.updateTask(taskId, updateData);
        results.push({ taskId, success: true, result });
      } catch (error) {
        results.push({ taskId, success: false, error: error.message });
      }
    });
    
    return {
      results: results,
      success_count: results.filter(r => r.success).length,
      failure_count: results.filter(r => !r.success).length,
      timestamp: new Date().toISOString()
    };
  }

  // 导出任务数据
  exportTasks(format = 'json') {
    const tasks = Array.from(this.tasks.values());
    
    if (format === 'json') {
      const exportPath = path.join(__dirname, `tasks_export_${Date.now()}.json`);
      fs.writeFileSync(exportPath, JSON.stringify(tasks, null, 2));
      return { success: true, path: exportPath, count: tasks.length };
    }
    
    return { success: false, error: '不支持的导出格式' };
  }

  // 清理已完成的旧任务
  cleanOldTasks(days = 30) {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    this.tasks.forEach((task, taskId) => {
      if ((task.status === 'completed' || task.status === 'cancelled') && 
          new Date(task.updated_at).getTime() < cutoffTime) {
        this.tasks.delete(taskId);
        deletedCount++;
      }
    });
    
    if (deletedCount > 0) {
      this.logger.logSystem(`已清理 ${deletedCount} 个旧任务`);
      this.updateTaskReport();
    }
    
    return { success: true, deleted_count: deletedCount };
  }
}

module.exports = RelayTaskTracker;