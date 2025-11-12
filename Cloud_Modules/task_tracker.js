/**
 * JEV Plugin v2.0 - 客户任务与会话跟踪模块
 * 跟踪客户状态与沟通任务
 * 接口：updateTask(client_id, status, note)
 * 自动写入日志文件 /cloud_tasks.json
 * 输出状态同步到控制中心
 */

// 系统配置
const TRACKER_CONFIG = {
  // 任务状态配置
  taskStatuses: {
    PENDING: 'pending',           // 待处理
    IN_PROGRESS: 'in_progress',   // 进行中
    ON_HOLD: 'on_hold',           // 暂停
    COMPLETED: 'completed',       // 已完成
    CANCELLED: 'cancelled',       // 已取消
    FOLLOW_UP: 'follow_up',       // 需要跟进
    SCHEDULED: 'scheduled',       // 已排期
    URGENT: 'urgent'              // 紧急处理
  },
  
  // 任务类型配置
  taskTypes: {
    INQUIRY: 'inquiry',           // 询价处理
    PURCHASE: 'purchase',         // 采购订单
    COMPLAINT: 'complaint',       // 投诉处理
    AFTER_SALES: 'after_sales',   // 售后支持
    TECHNICAL: 'technical',       // 技术支持
    NEGOTIATION: 'negotiation',   // 商务谈判
    FOLLOW_UP: 'follow_up',       // 客户跟进
    CALL: 'call',                 // 电话沟通
    EMAIL: 'email',               // 邮件沟通
    MEETING: 'meeting',           // 会议安排
    OTHER: 'other'                // 其他任务
  },
  
  // 优先级配置
  priorities: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  },
  
  // 客户分类
  customerCategories: {
    NEW: 'new',                   // 新客户
    REGULAR: 'regular',           // 常规客户
    VIP: 'vip',                   // VIP客户
    POTENTIAL: 'potential',       // 潜在客户
    INACTIVE: 'inactive'          // 非活跃客户
  },
  
  // 文件路径配置
  filePaths: {
    tasks: '/cloud_tasks.json',
    customerLog: '/customer_logs.json',
    syncStatus: '/sync_status.json'
  },
  
  // 同步配置
  syncConfig: {
    enabled: true,
    syncInterval: 300000,          // 5分钟同步一次
    maxRetryAttempts: 3,
    retryInterval: 60000,          // 1分钟重试一次
    syncEndpoint: 'https://jevshop.workers.dev/api/sync'
  },
  
  // 日志配置
  logConfig: {
    enabled: true,
    maxEntries: 10000,
    rotationSize: 10485760         // 10MB
  },
  
  // 缓存配置
  cacheConfig: {
    maxSize: 500,
    ttl: 3600000                   // 1小时过期
  }
};

// 内存存储（由于无法写入本地文件，使用内存存储模拟）
let memoryStore = {
  tasks: {},
  customers: {},
  taskHistory: [],
  syncStatus: {
    lastSync: null,
    status: 'idle',
    error: null,
    pendingChanges: 0
  },
  cache: new Map(),
  metrics: {
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    averageResolutionTime: 0,
    overdueTasks: 0
  }
};

// 日志记录
function logTrackerEvent(level, message, details = {}) {
  const timestamp = new Date().toISOString();
  const logMessage = {
    level,
    timestamp,
    message,
    module: 'task_tracker',
    details
  };
  
  console.log(`[task_tracker] ${JSON.stringify(logMessage)}`);
  
  // 保存到内存历史记录
  memoryStore.taskHistory.push(logMessage);
  
  // 限制历史记录大小
  if (memoryStore.taskHistory.length > TRACKER_CONFIG.logConfig.maxEntries) {
    memoryStore.taskHistory.shift();
  }
}

// 生成唯一ID
function generateId(prefix = 'task') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

// 缓存管理
function cacheSet(key, value, ttl = TRACKER_CONFIG.cacheConfig.ttl) {
  if (memoryStore.cache.size >= TRACKER_CONFIG.cacheConfig.maxSize) {
    // 移除最旧的缓存项
    const firstKey = memoryStore.cache.keys().next().value;
    memoryStore.cache.delete(firstKey);
  }
  
  memoryStore.cache.set(key, {
    value,
    expires: Date.now() + ttl
  });
}

function cacheGet(key) {
  const cached = memoryStore.cache.get(key);
  if (!cached) return null;
  
  if (cached.expires < Date.now()) {
    // 缓存过期
    memoryStore.cache.delete(key);
    return null;
  }
  
  return cached.value;
}

function cacheDelete(key) {
  memoryStore.cache.delete(key);
}

// 验证客户端ID
function validateClientId(clientId) {
  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Invalid client ID');
  }
  return clientId.trim();
}

// 验证任务状态
function validateTaskStatus(status) {
  const validStatuses = Object.values(TRACKER_CONFIG.taskStatuses);
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid task status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`);
  }
  return status;
}

// 验证任务类型
function validateTaskType(type) {
  const validTypes = Object.values(TRACKER_CONFIG.taskTypes);
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid task type: ${type}. Valid types are: ${validTypes.join(', ')}`);
  }
  return type;
}

// 验证优先级
function validatePriority(priority) {
  const validPriorities = Object.values(TRACKER_CONFIG.priorities);
  if (!validPriorities.includes(priority)) {
    throw new Error(`Invalid priority: ${priority}. Valid priorities are: ${validPriorities.join(', ')}`);
  }
  return priority;
}

// 创建或更新客户信息
async function upsertCustomer(clientId, customerData = {}) {
  try {
    const validatedClientId = validateClientId(clientId);
    
    // 检查客户是否已存在
    const existingCustomer = memoryStore.customers[validatedClientId];
    
    if (existingCustomer) {
      // 更新现有客户
      memoryStore.customers[validatedClientId] = {
        ...existingCustomer,
        ...customerData,
        updatedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      
      logTrackerEvent('info', 'Customer updated', {
        clientId: validatedClientId,
        updatedFields: Object.keys(customerData)
      });
    } else {
      // 创建新客户
      memoryStore.customers[validatedClientId] = {
        id: validatedClientId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        category: customerData.category || TRACKER_CONFIG.customerCategories.NEW,
        communicationCount: 0,
        taskCount: 0,
        ...customerData
      };
      
      logTrackerEvent('info', 'New customer created', {
        clientId: validatedClientId,
        category: memoryStore.customers[validatedClientId].category
      });
    }
    
    // 更新缓存
    cacheSet(`customer_${validatedClientId}`, memoryStore.customers[validatedClientId]);
    
    // 标记需要同步
    incrementPendingChanges();
    
    return memoryStore.customers[validatedClientId];
  } catch (error) {
    logTrackerEvent('error', 'Failed to upsert customer', {
      clientId,
      error: error.message
    });
    throw error;
  }
}

// 创建新任务
async function createTask(clientId, taskData = {}) {
  try {
    const validatedClientId = validateClientId(clientId);
    const taskType = validateTaskType(taskData.type || TRACKER_CONFIG.taskTypes.OTHER);
    const taskPriority = validatePriority(taskData.priority || TRACKER_CONFIG.priorities.MEDIUM);
    
    // 确保客户存在
    await upsertCustomer(validatedClientId, {
      communicationCount: (memoryStore.customers[validatedClientId]?.communicationCount || 0) + 1
    });
    
    // 创建任务
    const taskId = generateId('task');
    const newTask = {
      id: taskId,
      clientId: validatedClientId,
      type: taskType,
      status: TRACKER_CONFIG.taskStatuses.PENDING,
      priority: taskPriority,
      title: taskData.title || `${taskType} for ${validatedClientId}`,
      description: taskData.description || '',
      note: taskData.note || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: taskData.dueDate,
      assignedTo: taskData.assignedTo,
      completedAt: null,
      tags: taskData.tags || [],
      metadata: taskData.metadata || {},
      relatedTasks: taskData.relatedTasks || []
    };
    
    // 保存任务
    memoryStore.tasks[taskId] = newTask;
    
    // 更新客户任务计数
    if (memoryStore.customers[validatedClientId]) {
      memoryStore.customers[validatedClientId].taskCount = 
        (memoryStore.customers[validatedClientId].taskCount || 0) + 1;
      memoryStore.customers[validatedClientId].updatedAt = new Date().toISOString();
    }
    
    // 更新统计
    updateMetrics();
    
    // 更新缓存
    cacheSet(`task_${taskId}`, newTask);
    cacheDelete(`tasks_client_${validatedClientId}`); // 清除客户任务列表缓存
    
    // 记录日志
    logTrackerEvent('info', 'New task created', {
      taskId,
      clientId: validatedClientId,
      type: taskType,
      priority: taskPriority
    });
    
    // 标记需要同步
    incrementPendingChanges();
    
    return newTask;
  } catch (error) {
    logTrackerEvent('error', 'Failed to create task', {
      clientId,
      error: error.message
    });
    throw error;
  }
}

// 更新任务状态
async function updateTask(clientId, status, note = '') {
  try {
    const validatedClientId = validateClientId(clientId);
    const validatedStatus = validateTaskStatus(status);
    
    // 查找客户的最新任务
    const clientTasks = Object.values(memoryStore.tasks)
      .filter(task => task.clientId === validatedClientId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (clientTasks.length === 0) {
      // 如果没有任务，创建一个新任务
      logTrackerEvent('warning', 'No tasks found for client, creating new task', {
        clientId: validatedClientId,
        status: validatedStatus
      });
      
      return await createTask(validatedClientId, {
        status: validatedStatus,
        note: note,
        type: validatedStatus === TRACKER_CONFIG.taskStatuses.COMPLAINT ? 
          TRACKER_CONFIG.taskTypes.COMPLAINT : 
          TRACKER_CONFIG.taskTypes.FOLLOW_UP
      });
    }
    
    // 获取最新任务
    const taskToUpdate = clientTasks[0];
    const oldStatus = taskToUpdate.status;
    const wasCompleted = oldStatus === TRACKER_CONFIG.taskStatuses.COMPLETED;
    const isNowCompleted = validatedStatus === TRACKER_CONFIG.taskStatuses.COMPLETED;
    
    // 更新任务
    taskToUpdate.status = validatedStatus;
    taskToUpdate.updatedAt = new Date().toISOString();
    taskToUpdate.note = note || taskToUpdate.note;
    
    // 如果任务完成，记录完成时间
    if (isNowCompleted && !wasCompleted) {
      taskToUpdate.completedAt = new Date().toISOString();
    }
    
    // 保存更新后的任务
    memoryStore.tasks[taskToUpdate.id] = taskToUpdate;
    
    // 更新客户最后活动时间
    if (memoryStore.customers[validatedClientId]) {
      memoryStore.customers[validatedClientId].lastActive = new Date().toISOString();
      memoryStore.customers[validatedClientId].updatedAt = new Date().toISOString();
    }
    
    // 更新统计
    updateMetrics();
    
    // 清除缓存
    cacheDelete(`task_${taskToUpdate.id}`);
    cacheDelete(`tasks_client_${validatedClientId}`);
    
    // 记录状态变更
    logTrackerEvent('info', 'Task status updated', {
      taskId: taskToUpdate.id,
      clientId: validatedClientId,
      oldStatus,
      newStatus: validatedStatus,
      note: note.length > 50 ? note.substring(0, 50) + '...' : note
    });
    
    // 标记需要同步
    incrementPendingChanges();
    
    return taskToUpdate;
  } catch (error) {
    logTrackerEvent('error', 'Failed to update task', {
      clientId,
      status,
      error: error.message
    });
    throw error;
  }
}

// 获取任务
async function getTask(taskId) {
  try {
    // 检查缓存
    const cachedTask = cacheGet(`task_${taskId}`);
    if (cachedTask) {
      return cachedTask;
    }
    
    // 从存储中获取
    const task = memoryStore.tasks[taskId];
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // 更新缓存
    cacheSet(`task_${taskId}`, task);
    
    return task;
  } catch (error) {
    logTrackerEvent('error', 'Failed to get task', {
      taskId,
      error: error.message
    });
    throw error;
  }
}

// 获取客户的所有任务
async function getClientTasks(clientId, options = {}) {
  try {
    const validatedClientId = validateClientId(clientId);
    
    // 构建缓存键
    const cacheKey = `tasks_client_${validatedClientId}_${JSON.stringify(options)}`;
    
    // 检查缓存
    const cachedTasks = cacheGet(cacheKey);
    if (cachedTasks) {
      return cachedTasks;
    }
    
    // 从存储中获取
    let tasks = Object.values(memoryStore.tasks)
      .filter(task => task.clientId === validatedClientId);
    
    // 应用过滤
    if (options.status) {
      validateTaskStatus(options.status);
      tasks = tasks.filter(task => task.status === options.status);
    }
    
    if (options.type) {
      validateTaskType(options.type);
      tasks = tasks.filter(task => task.type === options.type);
    }
    
    if (options.priority) {
      validatePriority(options.priority);
      tasks = tasks.filter(task => task.priority === options.priority);
    }
    
    // 应用排序
    tasks.sort((a, b) => {
      if (options.sortBy === 'createdAt') {
        return options.sortOrder === 'asc' ? 
          new Date(a.createdAt) - new Date(b.createdAt) : 
          new Date(b.createdAt) - new Date(a.createdAt);
      } else if (options.sortBy === 'updatedAt') {
        return options.sortOrder === 'asc' ? 
          new Date(a.updatedAt) - new Date(b.updatedAt) : 
          new Date(b.updatedAt) - new Date(a.updatedAt);
      } else {
        // 默认按创建时间降序
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    
    // 应用分页
    if (options.limit || options.offset) {
      const limit = options.limit || 100;
      const offset = options.offset || 0;
      tasks = tasks.slice(offset, offset + limit);
    }
    
    // 更新缓存
    cacheSet(cacheKey, tasks);
    
    return tasks;
  } catch (error) {
    logTrackerEvent('error', 'Failed to get client tasks', {
      clientId,
      options,
      error: error.message
    });
    throw error;
  }
}

// 获取客户信息
async function getCustomer(clientId) {
  try {
    const validatedClientId = validateClientId(clientId);
    
    // 检查缓存
    const cachedCustomer = cacheGet(`customer_${validatedClientId}`);
    if (cachedCustomer) {
      return cachedCustomer;
    }
    
    // 从存储中获取
    const customer = memoryStore.customers[validatedClientId];
    if (!customer) {
      throw new Error(`Customer not found: ${validatedClientId}`);
    }
    
    // 更新缓存
    cacheSet(`customer_${validatedClientId}`, customer);
    
    return customer;
  } catch (error) {
    logTrackerEvent('error', 'Failed to get customer', {
      clientId,
      error: error.message
    });
    throw error;
  }
}

// 搜索任务
async function searchTasks(query = {}, options = {}) {
  try {
    let tasks = Object.values(memoryStore.tasks);
    
    // 应用搜索过滤
    if (query.clientId) {
      tasks = tasks.filter(task => task.clientId === query.clientId);
    }
    
    if (query.status) {
      validateTaskStatus(query.status);
      tasks = tasks.filter(task => task.status === query.status);
    }
    
    if (query.type) {
      validateTaskType(query.type);
      tasks = tasks.filter(task => task.type === query.type);
    }
    
    if (query.priority) {
      validatePriority(query.priority);
      tasks = tasks.filter(task => task.priority === query.priority);
    }
    
    if (query.assignedTo) {
      tasks = tasks.filter(task => task.assignedTo === query.assignedTo);
    }
    
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      tasks = tasks.filter(task => new Date(task.createdAt) >= startDate);
    }
    
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      tasks = tasks.filter(task => new Date(task.createdAt) <= endDate);
    }
    
    if (query.searchText) {
      const searchLower = query.searchText.toLowerCase();
      tasks = tasks.filter(task => 
        (task.title && task.title.toLowerCase().includes(searchLower)) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        (task.note && task.note.toLowerCase().includes(searchLower)) ||
        (task.clientId && task.clientId.toLowerCase().includes(searchLower))
      );
    }
    
    // 应用标签过滤
    if (query.tags && Array.isArray(query.tags)) {
      tasks = tasks.filter(task => 
        query.tags.every(tag => task.tags && task.tags.includes(tag))
      );
    }
    
    // 应用排序
    tasks.sort((a, b) => {
      if (options.sortBy === 'createdAt') {
        return options.sortOrder === 'asc' ? 
          new Date(a.createdAt) - new Date(b.createdAt) : 
          new Date(b.createdAt) - new Date(a.createdAt);
      } else if (options.sortBy === 'updatedAt') {
        return options.sortOrder === 'asc' ? 
          new Date(a.updatedAt) - new Date(b.updatedAt) : 
          new Date(b.updatedAt) - new Date(a.updatedAt);
      } else if (options.sortBy === 'priority') {
        const priorityOrder = {
          [TRACKER_CONFIG.priorities.URGENT]: 4,
          [TRACKER_CONFIG.priorities.HIGH]: 3,
          [TRACKER_CONFIG.priorities.MEDIUM]: 2,
          [TRACKER_CONFIG.priorities.LOW]: 1
        };
        return options.sortOrder === 'asc' ? 
          (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0) :
          (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      } else {
        // 默认按创建时间降序
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    
    // 计算总数
    const total = tasks.length;
    
    // 应用分页
    if (options.limit || options.offset) {
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      tasks = tasks.slice(offset, offset + limit);
    }
    
    return {
      tasks,
      total,
      page: options.offset ? Math.floor(options.offset / (options.limit || 20)) + 1 : 1,
      pages: options.limit ? Math.ceil(total / (options.limit || 20)) : 1
    };
  } catch (error) {
    logTrackerEvent('error', 'Failed to search tasks', {
      query,
      options,
      error: error.message
    });
    throw error;
  }
}

// 标记任务完成
async function completeTask(taskId, completionNote = '') {
  try {
    const task = await getTask(taskId);
    
    if (task.status === TRACKER_CONFIG.taskStatuses.COMPLETED) {
      logTrackerEvent('warning', 'Task already completed', { taskId });
      return task;
    }
    
    // 更新任务状态
    task.status = TRACKER_CONFIG.taskStatuses.COMPLETED;
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    
    if (completionNote) {
      task.note = task.note ? `${task.note}\n${completionNote}` : completionNote;
    }
    
    // 保存更新
    memoryStore.tasks[taskId] = task;
    
    // 更新统计
    updateMetrics();
    
    // 清除缓存
    cacheDelete(`task_${taskId}`);
    cacheDelete(`tasks_client_${task.clientId}`);
    
    logTrackerEvent('info', 'Task completed', {
      taskId,
      clientId: task.clientId,
      note: completionNote.length > 50 ? completionNote.substring(0, 50) + '...' : completionNote
    });
    
    // 标记需要同步
    incrementPendingChanges();
    
    return task;
  } catch (error) {
    logTrackerEvent('error', 'Failed to complete task', {
      taskId,
      error: error.message
    });
    throw error;
  }
}

// 取消任务
async function cancelTask(taskId, cancellationNote = '') {
  try {
    const task = await getTask(taskId);
    
    if (task.status === TRACKER_CONFIG.taskStatuses.COMPLETED) {
      throw new Error('Cannot cancel a completed task');
    }
    
    // 更新任务状态
    task.status = TRACKER_CONFIG.taskStatuses.CANCELLED;
    task.updatedAt = new Date().toISOString();
    
    if (cancellationNote) {
      task.note = task.note ? `${task.note}\n${cancellationNote}` : cancellationNote;
    }
    
    // 保存更新
    memoryStore.tasks[taskId] = task;
    
    // 更新统计
    updateMetrics();
    
    // 清除缓存
    cacheDelete(`task_${taskId}`);
    cacheDelete(`tasks_client_${task.clientId}`);
    
    logTrackerEvent('info', 'Task cancelled', {
      taskId,
      clientId: task.clientId,
      note: cancellationNote.length > 50 ? cancellationNote.substring(0, 50) + '...' : cancellationNote
    });
    
    // 标记需要同步
    incrementPendingChanges();
    
    return task;
  } catch (error) {
    logTrackerEvent('error', 'Failed to cancel task', {
      taskId,
      error: error.message
    });
    throw error;
  }
}

// 添加任务备注
async function addTaskNote(taskId, note) {
  try {
    const task = await getTask(taskId);
    
    // 添加备注
    if (note && typeof note === 'string') {
      const timestamp = new Date().toISOString();
      const formattedNote = `[${timestamp}] ${note}`;
      
      task.note = task.note ? `${task.note}\n${formattedNote}` : formattedNote;
      task.updatedAt = new Date().toISOString();
      
      // 保存更新
      memoryStore.tasks[taskId] = task;
      
      // 清除缓存
      cacheDelete(`task_${taskId}`);
      
      logTrackerEvent('info', 'Note added to task', {
        taskId,
        clientId: task.clientId,
        noteLength: note.length
      });
      
      // 标记需要同步
      incrementPendingChanges();
    }
    
    return task;
  } catch (error) {
    logTrackerEvent('error', 'Failed to add note to task', {
      taskId,
      error: error.message
    });
    throw error;
  }
}

// 设置任务截止日期
async function setTaskDueDate(taskId, dueDate) {
  try {
    const task = await getTask(taskId);
    
    // 验证日期
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid due date format');
    }
    
    // 更新截止日期
    task.dueDate = dueDate;
    task.updatedAt = new Date().toISOString();
    
    // 保存更新
    memoryStore.tasks[taskId] = task;
    
    // 清除缓存
    cacheDelete(`task_${taskId}`);
    
    logTrackerEvent('info', 'Task due date updated', {
      taskId,
      clientId: task.clientId,
      dueDate
    });
    
    // 标记需要同步
    incrementPendingChanges();
    
    return task;
  } catch (error) {
    logTrackerEvent('error', 'Failed to set task due date', {
      taskId,
      dueDate,
      error: error.message
    });
    throw error;
  }
}

// 分配任务
async function assignTask(taskId, assignee) {
  try {
    const task = await getTask(taskId);
    
    if (!assignee || typeof assignee !== 'string' || assignee.trim() === '') {
      throw new Error('Invalid assignee');
    }
    
    // 更新分配
    task.assignedTo = assignee.trim();
    task.updatedAt = new Date().toISOString();
    
    // 保存更新
    memoryStore.tasks[taskId] = task;
    
    // 清除缓存
    cacheDelete(`task_${taskId}`);
    
    logTrackerEvent('info', 'Task assigned', {
      taskId,
      clientId: task.clientId,
      assignee: task.assignedTo
    });
    
    // 标记需要同步
    incrementPendingChanges();
    
    return task;
  } catch (error) {
    logTrackerEvent('error', 'Failed to assign task', {
      taskId,
      assignee,
      error: error.message
    });
    throw error;
  }
}

// 更新客户分类
async function updateCustomerCategory(clientId, category) {
  try {
    const validatedClientId = validateClientId(clientId);
    
    // 验证分类
    const validCategories = Object.values(TRACKER_CONFIG.customerCategories);
    if (!validCategories.includes(category)) {
      throw new Error(`Invalid customer category: ${category}. Valid categories are: ${validCategories.join(', ')}`);
    }
    
    // 确保客户存在
    await upsertCustomer(validatedClientId, { category });
    
    logTrackerEvent('info', 'Customer category updated', {
      clientId: validatedClientId,
      category
    });
    
    return memoryStore.customers[validatedClientId];
  } catch (error) {
    logTrackerEvent('error', 'Failed to update customer category', {
      clientId,
      category,
      error: error.message
    });
    throw error;
  }
}

// 获取过期任务
async function getOverdueTasks() {
  try {
    const now = new Date();
    const overdueTasks = Object.values(memoryStore.tasks)
      .filter(task => 
        task.dueDate && 
        new Date(task.dueDate) < now && 
        task.status !== TRACKER_CONFIG.taskStatuses.COMPLETED &&
        task.status !== TRACKER_CONFIG.taskStatuses.CANCELLED
      )
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    return overdueTasks;
  } catch (error) {
    logTrackerEvent('error', 'Failed to get overdue tasks', {
      error: error.message
    });
    throw error;
  }
}

// 获取统计信息
async function getStatistics() {
  try {
    // 更新指标
    updateMetrics();
    
    // 按状态统计
    const statusCounts = {};
    Object.values(TRACKER_CONFIG.taskStatuses).forEach(status => {
      statusCounts[status] = 0;
    });
    
    Object.values(memoryStore.tasks).forEach(task => {
      if (statusCounts.hasOwnProperty(task.status)) {
        statusCounts[task.status]++;
      }
    });
    
    // 按类型统计
    const typeCounts = {};
    Object.values(TRACKER_CONFIG.taskTypes).forEach(type => {
      typeCounts[type] = 0;
    });
    
    Object.values(memoryStore.tasks).forEach(task => {
      if (typeCounts.hasOwnProperty(task.type)) {
        typeCounts[task.type]++;
      }
    });
    
    // 按优先级统计
    const priorityCounts = {};
    Object.values(TRACKER_CONFIG.priorities).forEach(priority => {
      priorityCounts[priority] = 0;
    });
    
    Object.values(memoryStore.tasks).forEach(task => {
      if (priorityCounts.hasOwnProperty(task.priority)) {
        priorityCounts[task.priority]++;
      }
    });
    
    // 按客户分类统计
    const categoryCounts = {};
    Object.values(TRACKER_CONFIG.customerCategories).forEach(category => {
      categoryCounts[category] = 0;
    });
    
    Object.values(memoryStore.customers).forEach(customer => {
      if (categoryCounts.hasOwnProperty(customer.category)) {
        categoryCounts[customer.category]++;
      }
    });
    
    return {
      tasks: {
        total: memoryStore.metrics.totalTasks,
        active: memoryStore.metrics.activeTasks,
        completed: memoryStore.metrics.completedTasks,
        overdue: memoryStore.metrics.overdueTasks,
        byStatus: statusCounts,
        byType: typeCounts,
        byPriority: priorityCounts,
        averageResolutionTime: memoryStore.metrics.averageResolutionTime
      },
      customers: {
        total: Object.keys(memoryStore.customers).length,
        byCategory: categoryCounts
      },
      system: {
        cacheSize: memoryStore.cache.size,
        maxCacheSize: TRACKER_CONFIG.cacheConfig.maxSize,
        historyEntries: memoryStore.taskHistory.length,
        lastSync: memoryStore.syncStatus.lastSync,
        pendingChanges: memoryStore.syncStatus.pendingChanges
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logTrackerEvent('error', 'Failed to get statistics', {
      error: error.message
    });
    throw error;
  }
}

// 更新指标
function updateMetrics() {
  try {
    const tasks = Object.values(memoryStore.tasks);
    
    // 计算总任务数
    memoryStore.metrics.totalTasks = tasks.length;
    
    // 计算活跃任务数（未完成和未取消的任务）
    memoryStore.metrics.activeTasks = tasks.filter(task => 
      task.status !== TRACKER_CONFIG.taskStatuses.COMPLETED &&
      task.status !== TRACKER_CONFIG.taskStatuses.CANCELLED
    ).length;
    
    // 计算已完成任务数
    memoryStore.metrics.completedTasks = tasks.filter(task => 
      task.status === TRACKER_CONFIG.taskStatuses.COMPLETED
    ).length;
    
    // 计算过期任务数
    const now = new Date();
    memoryStore.metrics.overdueTasks = tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      task.status !== TRACKER_CONFIG.taskStatuses.COMPLETED &&
      task.status !== TRACKER_CONFIG.taskStatuses.CANCELLED
    ).length;
    
    // 计算平均解决时间
    const completedTasksWithTimes = tasks.filter(task => 
      task.status === TRACKER_CONFIG.taskStatuses.COMPLETED &&
      task.createdAt && task.completedAt
    );
    
    if (completedTasksWithTimes.length > 0) {
      const totalResolutionTime = completedTasksWithTimes.reduce((sum, task) => {
        const createdTime = new Date(task.createdAt).getTime();
        const completedTime = new Date(task.completedAt).getTime();
        return sum + (completedTime - createdTime);
      }, 0);
      
      memoryStore.metrics.averageResolutionTime = Math.round(totalResolutionTime / completedTasksWithTimes.length);
    } else {
      memoryStore.metrics.averageResolutionTime = 0;
    }
  } catch (error) {
    logTrackerEvent('error', 'Failed to update metrics', {
      error: error.message
    });
  }
}

// 标记需要同步
function incrementPendingChanges() {
  memoryStore.syncStatus.pendingChanges++;
  
  // 如果启用了自动同步，触发同步
  if (TRACKER_CONFIG.syncConfig.enabled) {
    syncData();
  }
}

// 同步数据到远程服务器
async function syncData(retryCount = 0) {
  try {
    // 如果正在同步，等待
    if (memoryStore.syncStatus.status === 'syncing') {
      return;
    }
    
    // 如果没有待同步的更改，直接返回
    if (memoryStore.syncStatus.pendingChanges === 0) {
      return;
    }
    
    // 标记为同步中
    memoryStore.syncStatus.status = 'syncing';
    
    // 准备同步数据
    const syncData = {
      tasks: Object.values(memoryStore.tasks),
      customers: Object.values(memoryStore.customers),
      syncTimestamp: new Date().toISOString(),
      pendingChanges: memoryStore.syncStatus.pendingChanges
    };
    
    // 模拟同步操作（由于无法实际发送HTTP请求）
    logTrackerEvent('info', 'Simulating data sync to remote server', {
      tasksCount: syncData.tasks.length,
      customersCount: syncData.customers.length,
      pendingChanges: syncData.pendingChanges
    });
    
    // 模拟成功响应
    await new Promise(resolve => setTimeout(resolve, 500)); // 模拟网络延迟
    
    // 更新同步状态
    memoryStore.syncStatus.lastSync = new Date().toISOString();
    memoryStore.syncStatus.status = 'idle';
    memoryStore.syncStatus.error = null;
    memoryStore.syncStatus.pendingChanges = 0;
    
    logTrackerEvent('info', 'Data sync completed successfully', {
      tasksCount: syncData.tasks.length,
      customersCount: syncData.customers.length
    });
    
    return {
      success: true,
      syncedTasks: syncData.tasks.length,
      syncedCustomers: syncData.customers.length,
      timestamp: memoryStore.syncStatus.lastSync
    };
  } catch (error) {
    logTrackerEvent('error', 'Data sync failed', {
      error: error.message,
      retryCount,
      maxRetries: TRACKER_CONFIG.syncConfig.maxRetryAttempts
    });
    
    // 更新同步状态
    memoryStore.syncStatus.status = 'idle';
    memoryStore.syncStatus.error = error.message;
    
    // 重试机制
    if (retryCount < TRACKER_CONFIG.syncConfig.maxRetryAttempts) {
      setTimeout(() => {
        syncData(retryCount + 1);
      }, TRACKER_CONFIG.syncConfig.retryInterval);
    }
    
    throw error;
  }
}

// 获取同步状态
function getSyncStatus() {
  return {
    lastSync: memoryStore.syncStatus.lastSync,
    status: memoryStore.syncStatus.status,
    error: memoryStore.syncStatus.error,
    pendingChanges: memoryStore.syncStatus.pendingChanges,
    enabled: TRACKER_CONFIG.syncConfig.enabled
  };
}

// 手动触发同步
async function triggerSync() {
  return await syncData(0);
}

// 清除过期数据
async function cleanupExpiredData() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 清理过期的任务历史记录
    memoryStore.taskHistory = memoryStore.taskHistory.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate > thirtyDaysAgo;
    });
    
    // 清理过期缓存
    for (const [key, value] of memoryStore.cache.entries()) {
      if (value.expires < Date.now()) {
        memoryStore.cache.delete(key);
      }
    }
    
    logTrackerEvent('info', 'Expired data cleaned up', {
      remainingHistoryEntries: memoryStore.taskHistory.length,
      remainingCacheEntries: memoryStore.cache.size
    });
    
    return {
      success: true,
      remainingHistoryEntries: memoryStore.taskHistory.length,
      remainingCacheEntries: memoryStore.cache.size,
      timestamp: now.toISOString()
    };
  } catch (error) {
    logTrackerEvent('error', 'Failed to cleanup expired data', {
      error: error.message
    });
    throw error;
  }
}

// 健康检查
function healthCheck() {
  try {
    // 检查内存存储
    const isStoreHealthy = memoryStore && 
                          memoryStore.tasks && 
                          memoryStore.customers && 
                          memoryStore.taskHistory;
    
    // 检查缓存
    const isCacheHealthy = memoryStore.cache && 
                          typeof memoryStore.cache.size === 'number';
    
    // 检查指标
    const isMetricsHealthy = memoryStore.metrics && 
                            typeof memoryStore.metrics.totalTasks === 'number';
    
    const status = isStoreHealthy && isCacheHealthy && isMetricsHealthy ? 'healthy' : 'unhealthy';
    
    return {
      status,
      storeStatus: isStoreHealthy ? 'ok' : 'error',
      cacheStatus: isCacheHealthy ? 'ok' : 'error',
      metricsStatus: isMetricsHealthy ? 'ok' : 'error',
      tasksCount: Object.keys(memoryStore.tasks).length,
      customersCount: Object.keys(memoryStore.customers).length,
      cacheSize: memoryStore.cache.size,
      historySize: memoryStore.taskHistory.length,
      lastSync: memoryStore.syncStatus.lastSync,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logTrackerEvent('error', 'Health check failed', {
      error: error.message
    });
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 导出主要功能
export async function updateTask(client_id, status, note = '') {
  return await updateTask(client_id, status, note);
}

// 导出所有功能
module.exports = {
  // 任务管理
  createTask,
  updateTask,
  getTask,
  getClientTasks,
  searchTasks,
  completeTask,
  cancelTask,
  addTaskNote,
  setTaskDueDate,
  assignTask,
  getOverdueTasks,
  
  // 客户管理
  upsertCustomer,
  getCustomer,
  updateCustomerCategory,
  
  // 系统管理
  getStatistics,
  getSyncStatus,
  triggerSync,
  cleanupExpiredData,
  healthCheck,
  
  // 配置信息
  getConfig: () => ({
    statuses: TRACKER_CONFIG.taskStatuses,
    types: TRACKER_CONFIG.taskTypes,
    priorities: TRACKER_CONFIG.priorities,
    categories: TRACKER_CONFIG.customerCategories
  })
};

// ES模块导出
exports.default = {
  createTask,
  updateTask,
  getTask,
  getClientTasks,
  searchTasks,
  completeTask,
  cancelTask,
  addTaskNote,
  setTaskDueDate,
  assignTask,
  getOverdueTasks,
  upsertCustomer,
  getCustomer,
  updateCustomerCategory,
  getStatistics,
  getSyncStatus,
  triggerSync,
  cleanupExpiredData,
  healthCheck,
  getConfig: () => ({
    statuses: TRACKER_CONFIG.taskStatuses,
    types: TRACKER_CONFIG.taskTypes,
    priorities: TRACKER_CONFIG.priorities,
    categories: TRACKER_CONFIG.customerCategories
  })
};

// 初始化
function initializeTracker() {
  logTrackerEvent('info', 'Task tracker initialized', {
    config: {
      syncEnabled: TRACKER_CONFIG.syncConfig.enabled,
      supportedStatuses: Object.values(TRACKER_CONFIG.taskStatuses).length,
      supportedTypes: Object.values(TRACKER_CONFIG.taskTypes).length
    }
  });
  
  // 启动定期清理
  setInterval(cleanupExpiredData, 86400000); // 每天清理一次
  
  // 启动定期同步（如果启用）
  if (TRACKER_CONFIG.syncConfig.enabled) {
    setInterval(triggerSync, TRACKER_CONFIG.syncConfig.syncInterval);
  }
}

// 自初始化
initializeTracker();
