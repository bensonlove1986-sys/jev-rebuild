# JEV / 2025-11-07 / Log-System

## 执行目标
建立JEV系统的学习闭环，实现系统行为的完整记录与追溯，使系统能够「回忆自己的行为」，为L4智能阶段奠定数据基础。

## 上下文说明
当前系统已具备模块隔离、状态可见性和TRAE语义级任务解析能力，通过添加结构化日志系统，可以实现：
- 记录每次操作的执行源、时间、动作、结果、耗时
- 支持按模块、按时间、按类型查询历史操作
- 为系统提供「自我认知」的数据基础

## 操作步骤

### 步骤1: 在Worker中添加日志接口

修改`local_worker_server.js`文件，添加`/log-event`和`/logs`两个关键接口。

```javascript
// 添加到local_worker_server.js中的路由处理部分
// ... existing code ...

// 日志事件写入接口
app.post('/log-event', async (req, res) => {
  try {
    const eventData = req.body;
    
    // 验证必需字段
    if (!eventData.module || !eventData.action || !eventData.source) {
      return res.status(400).json({ ok: false, error: '缺少必需字段' });
    }
    
    // 标准化事件数据
    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      module: eventData.module,
      source: eventData.source,
      action: eventData.action,
      params: eventData.params || {},
      result: eventData.result || null,
      duration: eventData.duration || 0,
      success: eventData.success !== undefined ? eventData.success : true,
      error: eventData.error || null
    };
    
    // 生成日期键用于分区存储
    const today = new Date().toISOString().split('T')[0];
    const logKey = `logs:${today}`;
    
    // 获取今日日志
    let dailyLogs = [];
    try {
      const existingLogs = await kv.get(logKey);
      if (existingLogs) {
        dailyLogs = JSON.parse(existingLogs);
      }
    } catch (err) {
      console.error('读取日志失败:', err);
      dailyLogs = [];
    }
    
    // 添加新日志并保持最大记录数
    dailyLogs.unshift(logEntry); // 最新的在前面
    if (dailyLogs.length > 1000) {
      dailyLogs = dailyLogs.slice(0, 1000);
    }
    
    // 保存更新后的日志
    await kv.put(logKey, JSON.stringify(dailyLogs));
    
    // 更新最新事件键，用于快速访问
    await kv.put('logs:latest_event', JSON.stringify(logEntry));
    
    // 更新系统状态
    await kv.put('sys:last_log_event', logEntry.timestamp);
    
    res.json({ ok: true, eventId: logEntry.id });
  } catch (error) {
    console.error('记录日志失败:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// 日志查询接口
app.get('/logs', async (req, res) => {
  try {
    const { module, days = 1, limit = 50, type } = req.query;
    
    let allLogs = [];
    const daysToQuery = parseInt(days) || 1;
    
    // 查询指定天数的日志
    for (let i = 0; i < daysToQuery; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const logKey = `logs:${dateKey}`;
      
      try {
        const logsData = await kv.get(logKey);
        if (logsData) {
          const dayLogs = JSON.parse(logsData);
          allLogs = [...allLogs, ...dayLogs];
        }
      } catch (err) {
        console.error(`读取${dateKey}日志失败:`, err);
      }
    }
    
    // 过滤日志
    let filteredLogs = allLogs;
    
    if (module) {
      filteredLogs = filteredLogs.filter(log => log.module === module);
    }
    
    if (type === 'error') {
      filteredLogs = filteredLogs.filter(log => !log.success);
    } else if (type === 'success') {
      filteredLogs = filteredLogs.filter(log => log.success);
    }
    
    // 排序和限制数量
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    filteredLogs = filteredLogs.slice(0, parseInt(limit) || 50);
    
    res.json({
      ok: true,
      total: filteredLogs.length,
      logs: filteredLogs
    });
  } catch (error) {
    console.error('查询日志失败:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ... existing code ...
```

### 步骤2: 在jev_sync.js中添加日志上报功能

修改`jev_sync.js`文件，添加logEvent方法和自动日志记录功能。

```javascript
// 添加到jev_sync.js中
// ... existing code ...

// 日志事件记录方法
async function logEvent(eventData) {
  try {
    const response = await fetch(`${WORKER_BASE}/log-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      console.error('日志上报失败:', response.status);
      return false;
    }
    
    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('日志上报错误:', error);
    return false;
  }
}

// 增强现有的API调用方法，自动记录日志
const originalFetchApi = fetchApi;
window.fetchApi = async function(endpoint, options = {}) {
  const startTime = performance.now();
  const source = 'ui';
  const module = 'control_panel';
  
  try {
    const result = await originalFetchApi(endpoint, options);
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // 异步记录成功日志（不阻塞主线程）
    logEvent({
      module,
      source,
      action: `api_${options.method || 'GET'}`,
      params: { endpoint, ...options },
      result: result.ok ? 'success' : 'failed',
      duration,
      success: result.ok
    });
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // 异步记录错误日志
    logEvent({
      module,
      source,
      action: `api_${options.method || 'GET'}`,
      params: { endpoint, ...options },
      error: error.message,
      duration,
      success: false
    });
    
    throw error;
  }
};

// 添加手动触发日志记录的方法
window.logUserAction = function(action, params = {}) {
  return logEvent({
    module: 'control_panel',
    source: 'user',
    action,
    params,
    success: true
  });
};

// ... existing code ...
```

### 步骤3: 在Worker入口文件中初始化日志系统

修改Worker主文件，确保KV存储可用并添加系统启动日志。

```javascript
// 在Worker启动时添加
// ... existing code ...

// 初始化日志系统
async function initializeLogging() {
  try {
    await kv.put('sys:log_system_version', '1.0.0');
    await kv.put('sys:log_system_enabled', 'true');
    
    // 记录系统启动事件
    await logInternalEvent({
      module: 'worker',
      source: 'system',
      action: 'system_start',
      params: {
        version: 'L4.0.0',
        mode: ENVIRONMENT || 'production'
      },
      success: true
    });
    
    console.log('日志系统初始化完成');
  } catch (error) {
    console.error('日志系统初始化失败:', error);
  }
}

// 内部日志记录方法（Worker内部使用）
async function logInternalEvent(eventData) {
  try {
    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...eventData
    };
    
    const today = new Date().toISOString().split('T')[0];
    const logKey = `logs:${today}`;
    
    // 获取今日日志
    let dailyLogs = [];
    try {
      const existingLogs = await kv.get(logKey);
      if (existingLogs) {
        dailyLogs = JSON.parse(existingLogs);
      }
    } catch (err) {
      console.error('读取内部日志失败:', err);
      dailyLogs = [];
    }
    
    // 添加新日志
    dailyLogs.unshift(logEntry);
    if (dailyLogs.length > 1000) {
      dailyLogs = dailyLogs.slice(0, 1000);
    }
    
    // 保存日志
    await kv.put(logKey, JSON.stringify(dailyLogs));
    await kv.put('logs:latest_event', JSON.stringify(logEntry));
  } catch (error) {
    console.error('记录内部日志失败:', error);
  }
}

// 在Worker启动时调用初始化函数
initializeLogging();

// ... existing code ...
```

### 步骤4: 在UI中添加日志查看功能

修改`jev_panel.html`，在控制面板中添加日志查看选项卡。

```html
<!-- 在功能模块选项卡区域添加日志查看选项卡 -->
<!-- ... existing code ... -->
<div class="tab-pane fade" id="logs-tab" role="tabpanel" aria-labelledby="logs-tab">
  <div class="bg-gray-900 rounded-lg p-4">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-white">系统日志</h3>
      <div class="flex space-x-2">
        <select id="log-module" class="bg-gray-800 text-white rounded px-3 py-1 text-sm">
          <option value="">所有模块</option>
          <option value="worker">Worker</option>
          <option value="agent">Agent</option>
          <option value="control_panel">控制面板</option>
          <option value="ai_service">AI服务</option>
        </select>
        <select id="log-type" class="bg-gray-800 text-white rounded px-3 py-1 text-sm">
          <option value="">所有类型</option>
          <option value="success">成功</option>
          <option value="error">错误</option>
        </select>
        <select id="log-days" class="bg-gray-800 text-white rounded px-3 py-1 text-sm">
          <option value="1">今天</option>
          <option value="3">3天内</option>
          <option value="7">7天内</option>
        </select>
        <button id="refresh-logs" class="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-sm">
          刷新
        </button>
      </div>
    </div>
    <div id="log-container" class="bg-gray-800 rounded-lg p-3 max-h-[500px] overflow-y-auto">
      <div class="text-gray-400 text-sm text-center py-8">加载中...</div>
    </div>
  </div>
</div>
<!-- ... existing code ... -->

<!-- 在页面底部添加日志处理脚本 -->
<script>
  // 日志查看功能
  document.addEventListener('DOMContentLoaded', function() {
    const logContainer = document.getElementById('log-container');
    const refreshButton = document.getElementById('refresh-logs');
    const moduleSelect = document.getElementById('log-module');
    const typeSelect = document.getElementById('log-type');
    const daysSelect = document.getElementById('log-days');
    
    // 加载日志
    async function loadLogs() {
      try {
        logContainer.innerHTML = '<div class="text-gray-400 text-sm text-center py-8">加载中...</div>';
        
        const module = moduleSelect.value;
        const type = typeSelect.value;
        const days = daysSelect.value;
        
        const params = new URLSearchParams();
        if (module) params.append('module', module);
        if (type) params.append('type', type);
        if (days) params.append('days', days);
        params.append('limit', 100);
        
        const response = await fetch(`${WORKER_BASE}/logs?${params.toString()}`);
        const data = await response.json();
        
        if (data.ok && data.logs.length > 0) {
          logContainer.innerHTML = '';
          
          data.logs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = `mb-3 p-3 rounded border-l-4 ${log.success ? 'border-green-500 bg-gray-700' : 'border-red-500 bg-gray-700/50'}`;
            
            const timestamp = new Date(log.timestamp).toLocaleString();
            const moduleColor = getModuleColor(log.module);
            
            logItem.innerHTML = `
              <div class="flex justify-between items-start">
                <div class="font-medium text-white">${log.action}</div>
                <div class="text-xs text-gray-400">${timestamp}</div>
              </div>
              <div class="flex items-center mt-1 space-x-2">
                <span class="inline-block px-2 py-0.5 text-xs rounded-full" style="background-color: ${moduleColor}">${log.module}</span>
                <span class="text-xs text-gray-400">${log.source}</span>
                <span class="text-xs text-gray-400">${log.duration}ms</span>
              </div>
              ${log.params && Object.keys(log.params).length > 0 ? `
                <div class="mt-2 text-xs text-gray-300 overflow-x-auto">
                  <pre class="whitespace-pre-wrap">参数: ${JSON.stringify(log.params, null, 2)}</pre>
                </div>
              ` : ''}
              ${log.error ? `
                <div class="mt-2 text-xs text-red-300">
                  错误: ${log.error}
                </div>
              ` : ''}
            `;
            
            logContainer.appendChild(logItem);
          });
        } else {
          logContainer.innerHTML = '<div class="text-gray-400 text-sm text-center py-8">没有找到日志记录</div>';
        }
      } catch (error) {
        console.error('加载日志失败:', error);
        logContainer.innerHTML = '<div class="text-red-400 text-sm text-center py-8">加载日志失败</div>';
      }
    }
    
    // 获取模块对应的颜色
    function getModuleColor(module) {
      const colors = {
        'worker': '#3b82f6',
        'agent': '#8b5cf6',
        'control_panel': '#10b981',
        'ai_service': '#ef4444',
        'system': '#f59e0b'
      };
      return colors[module] || '#6b7280';
    }
    
    // 事件监听
    refreshButton.addEventListener('click', loadLogs);
    moduleSelect.addEventListener('change', loadLogs);
    typeSelect.addEventListener('change', loadLogs);
    daysSelect.addEventListener('change', loadLogs);
    
    // 初始加载
    loadLogs();
    
    // 自动刷新（每30秒）
    setInterval(loadLogs, 30000);
  });
</script>
```

## 验证方式

### 功能验证
1. 启动Worker服务
2. 访问`/system-check`端点，确认`log_system_enabled`为`true`
3. 执行一些系统操作（如UI操作、API调用等）
4. 访问`/logs`端点，验证日志是否正确记录
5. 打开UI控制面板的日志选项卡，确认日志正确显示

### 错误验证
1. 模拟一个API错误（如访问不存在的端点）
2. 检查错误日志是否正确记录
3. 通过UI筛选错误日志，确认能正确过滤

### 性能验证
1. 快速连续执行多次操作，验证日志系统不会导致性能下降
2. 检查KV存储使用情况，确认日志大小在合理范围内

## 任务完成标准

| 标准项 | 完成标准 | 验证方法 |
|-------|---------|--------|
| 日志记录功能 | Worker能成功记录所有系统事件，包括模块、时间、动作等信息 | 检查KV存储中的logs:日期键值 |
| 日志查询功能 | /logs端点能正确返回过滤和排序后的日志数据 | 调用API并验证返回结果 |
| UI日志界面 | 控制面板能显示日志，支持过滤和自动刷新 | 视觉检查和交互测试 |
| 性能影响 | 日志系统不会明显影响系统响应时间 | 对比添加前后的API响应时间 |
| 系统状态更新 | 日志系统状态正确反映在/system-check中 | 调用/system-check验证 |

## JEV_SYSTEM_READY

模块: Log-System
版本: 1.0.0
签名: JEV-L4-LOG-SYS-20251107
状态: READY