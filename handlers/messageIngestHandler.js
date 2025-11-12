// JEV消息接收处理器

/**
 * 创建标准响应对象
 * @param {boolean} success - 是否成功
 * @param {any} data - 成功时的数据
 * @param {string} error - 失败时的错误消息
 * @param {Object} headers - 自定义响应头
 * @param {Object} env - 环境变量（可选）
 * @returns {Response} - HTTP响应对象
 */
function createResponse(success, data = null, error = null, headers = {}, env = null) {
  const response = {
    success,
    data: success ? data : null,
    error: success ? null : error
  };
  
  // 基础头部
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  // 合并自定义头部
  Object.assign(responseHeaders, headers);
  
  return new Response(JSON.stringify(response), {
    headers: responseHeaders
  });
}

/**
 * 处理从ChatCapture插件接收到的消息
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - 环境变量和绑定
 * @returns {Promise<Response>} - HTTP响应
 */
async function handleMessageIngest(request, env) {
  try {
    // 验证请求方法
    if (request.method !== 'POST') {
      return createResponse(false, null, '方法不允许，只支持POST请求', {}, env);
    }

    // 获取认证信息
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createResponse(false, null, '缺少有效的认证信息', {}, env);
    }

    const token = authHeader.substring(7);
    
    // 验证token (简化版，实际应该更严格)
    if (!token) {
      return createResponse(false, null, '无效的认证令牌', {}, env);
    }

    // 解析请求体
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      return createResponse(false, null, '无效的JSON格式', {}, env);
    }

    // 验证必要的字段
    const requiredFields = ['sender', 'timestamp'];
    for (const field of requiredFields) {
      if (!requestData[field]) {
        return createResponse(false, null, `缺少必要字段: ${field}`, {}, env);
      }
    }

    // 生成消息ID
    const messageId = requestData.messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 构建完整的消息对象
    const message = {
      id: messageId,
      sender: requestData.sender,
      body: requestData.body || '',
      images: requestData.images || [],
      timestamp: requestData.timestamp,
      source: requestData.source || 'daojie_chat',
      version: requestData.version || '1.0',
      metadata: {
        elementClass: requestData.elementClass,
        elementId: requestData.elementId,
        receivedAt: new Date().toISOString(),
        ip: request.headers.get('CF-Connecting-IP') || 
            request.headers.get('X-Forwarded-For') ||
            'unknown'
      }
    };

    // 记录接收到的消息
    console.log(`[MessageIngest] 接收消息: ${message.id} 来自 ${message.sender}`);
    
    // 保存到KV存储（如果可用）
    try {
      // 尝试使用Durable Objects保存消息
      if (env.SESSION_STORE) {
        const storeId = env.SESSION_STORE.idFromName('chat_messages');
        const store = env.SESSION_STORE.get(storeId);
        
        await store.fetch('/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: messageId,
            value: message,
            ttl: 86400 // 24小时过期
          })
        });
        console.log(`[MessageIngest] 消息已保存到Durable Object: ${messageId}`);
      } else {
        // 尝试保存到KV（如果配置了的话）
        console.log(`[MessageIngest] 无Durable Object可用，使用备用存储`);
      }
    } catch (storageError) {
      console.error(`[MessageIngest] 保存消息失败:`, storageError);
      // 不中断流程，继续处理
    }

    // 更新计数器
    try {
      if (env.COUNTER) {
        const counterIdRef = env.COUNTER.idFromName('message_count');
        const counter = env.COUNTER.get(counterIdRef);
        
        await counter.fetch('/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ increment: 1 })
        });
      }
    } catch (counterError) {
      console.error(`[MessageIngest] 更新计数失败:`, counterError);
    }

    // 返回成功响应
    return createResponse(true, {
      messageId: message.id,
      status: 'received',
      timestamp: new Date().toISOString()
    }, '消息接收成功', {}, env);

  } catch (error) {
    console.error(`[MessageIngest] 处理消息时出错:`, error);
    return createResponse(false, null, error.message || '处理消息时发生错误', {}, env);
  }
}

/**
 * 获取消息统计信息
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - 环境变量和绑定
 * @returns {Promise<Response>} - HTTP响应
 */
async function getMessageStats(request, env) {
  try {
    let stats = {
      totalMessages: 0,
      status: 'unknown',
      timestamp: new Date().toISOString()
    };

    // 尝试从计数器获取统计信息
    if (env.COUNTER) {
      try {
        const counterIdRef = env.COUNTER.idFromName('message_count');
        const counter = env.COUNTER.get(counterIdRef);
        const response = await counter.fetch('/get');
        const data = await response.json();
        
        if (data.success) {
          stats.totalMessages = data.value || 0;
          stats.status = 'active';
        }
      } catch (error) {
        console.error(`[MessageStats] 获取计数器失败:`, error);
      }
    }

    return createResponse(true, stats, '获取统计成功', {}, env);

  } catch (error) {
    console.error(`[MessageStats] 获取统计时出错:`, error);
    return createResponse(false, null, error.message || '获取统计失败', {}, env);
  }
}

/**
 * 获取特定消息详情
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - 环境变量和绑定
 * @returns {Promise<Response>} - HTTP响应
 */
async function getMessageDetails(request, env) {
  try {
    // 验证请求方法
    if (request.method !== 'GET') {
      return createResponse(false, null, '方法不允许，只支持GET请求', {}, env);
    }

    // 获取消息ID
    const url = new URL(request.url);
    const messageId = url.pathname.split('/').pop();
    
    if (!messageId) {
      return createResponse(false, null, '缺少消息ID', {}, env);
    }

    // 尝试从Durable Object获取消息
    if (env.SESSION_STORE) {
      try {
        const storeId = env.SESSION_STORE.idFromName('chat_messages');
        const store = env.SESSION_STORE.get(storeId);
        
        const response = await store.fetch('/get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: messageId })
        });
        
        const data = await response.json();
        
        if (data.success && data.data) {
          return createResponse(true, data.data, '消息获取成功', {}, env);
        }
      } catch (error) {
        console.error(`[MessageDetails] 从Durable Object获取消息失败:`, error);
      }
    }

    return createResponse(false, null, '消息未找到', {}, env);

  } catch (error) {
    console.error(`[MessageDetails] 获取消息详情时出错:`, error);
    return createResponse(false, null, error.message || '获取消息详情失败', {}, env);
  }
}

// 导出处理函数
module.exports = {
  handleMessageIngest,
  getMessageStats,
  getMessageDetails
};