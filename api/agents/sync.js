// JEV L8.9.7-SYNC - 邀请码注册与客服身份中心联动蓝图
// Worker 端口，用于写入注册-邀请码绑定日志

/**
 * 处理客服与邀请码绑定的API端点
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Worker环境变量（包含KV命名空间绑定）
 * @returns {Response} HTTP响应
 */
async function handleAgentSync(request, env) {
  try {
    // 验证请求方法
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      });
    }

    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // 解析请求体
    let data;
    try {
      data = await request.json();
    } catch (jsonError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON format'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 验证必要字段
    const requiredFields = ['agent_id', 'agent_name', 'invite_code', 'registered_at'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return new Response(JSON.stringify({
          success: false,
          error: `Missing required field: ${field}`
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // 准备记录数据
    const record = {
      ...data,
      status: "active",
      last_seen: new Date().toISOString(),
      sync_timestamp: new Date().toISOString()
    };

    // 验证KV命名空间
    if (!env.JEV_AGENT_LOG || !env.INVITE_KV) {
      return new Response(JSON.stringify({
        success: false,
        error: 'KV namespaces not configured'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 写入KV存储
    try {
      // 按客服ID存储
      const agentKey = `bind:${data.agent_id}`;
      await env.JEV_AGENT_LOG.put(agentKey, JSON.stringify(record), {
        expirationTtl: 2592000 // 30天过期
      });

      // 按邀请码存储
      const inviteKey = `bind:${data.invite_code}`;
      await env.INVITE_KV.put(inviteKey, JSON.stringify(record), {
        expirationTtl: 2592000 // 30天过期
      });

      // 写入日志文件
      await writeToLogFile(env, record);

    } catch (kvError) {
      console.error('KV存储操作失败:', kvError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to store binding data'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 返回成功响应
    return new Response(JSON.stringify({
      success: true,
      message: 'Agent-invite binding stored successfully',
      data: {
        agent_id: data.agent_id,
        invite_code: data.invite_code
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('处理同步请求时发生错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * 写入日志文件
 * @param {Object} env - Worker环境变量
 * @param {Object} record - 记录数据
 */
async function writeToLogFile(env, record) {
  try {
    // 在Cloudflare Worker环境中，使用R2或KV存储日志文件
    // 这里使用KV存储的方式
    const logKey = 'invite_agent_bind_logs';
    
    // 尝试获取现有日志
    let existingLogs = [];
    try {
      const existingData = await env.JEV_AGENT_LOG.get(logKey);
      if (existingData) {
        existingLogs = JSON.parse(existingData);
      }
    } catch (e) {
      // 如果读取失败，使用空数组
      existingLogs = [];
    }
    
    // 添加新记录
    existingLogs.unshift(record); // 新记录添加到开头
    
    // 限制日志数量，只保留最近1000条
    if (existingLogs.length > 1000) {
      existingLogs = existingLogs.slice(0, 1000);
    }
    
    // 保存更新后的日志
    await env.JEV_AGENT_LOG.put(logKey, JSON.stringify(existingLogs));
  } catch (logError) {
    console.error('写入日志失败:', logError);
    // 日志写入失败不影响主流程
  }
}

/**
 * 处理获取客服列表的API端点
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Worker环境变量
 * @returns {Response} HTTP响应
 */
async function handleAgentList(request, env) {
  try {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        }
      });
    }

    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // 验证KV命名空间
    if (!env.JEV_AGENT_LOG) {
      return new Response(JSON.stringify({
        success: false,
        error: 'KV namespace not configured'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 获取所有客服记录
    let agents = [];
    try {
      // 在实际Worker环境中，可以使用list()方法获取所有键
      // 这里模拟获取所有以'bind:'开头的键
      
      // 尝试从日志文件获取所有记录
      const logKey = 'invite_agent_bind_logs';
      const logsData = await env.JEV_AGENT_LOG.get(logKey);
      
      if (logsData) {
        agents = JSON.parse(logsData);
      } else {
        // 如果日志文件不存在，尝试获取单个记录
        // 这里仅作为示例，实际Worker环境需要使用list()
        agents = [];
      }
    } catch (error) {
      console.error('获取客服列表失败:', error);
    }

    // 返回客服列表
    return new Response(JSON.stringify({
      success: true,
      agents: agents,
      total: agents.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('处理获取客服列表请求时发生错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * 主路由处理函数
 * @param {Request} request - HTTP请求对象
 * @param {Object} env - Worker环境变量
 * @param {Object} context - Worker上下文
 * @returns {Response} HTTP响应
 */
async function handleRequest(request, env, context) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 处理不同的端点
  if (path === '/api/agents/sync') {
    return handleAgentSync(request, env);
  } else if (path === '/api/agents/list') {
    return handleAgentList(request, env);
  } else {
    return new Response(JSON.stringify({
      success: false,
      error: 'Endpoint not found'
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// 导出处理函数（Cloudflare Worker格式）
export default {
  fetch: handleRequest
};

// 导出单独的函数，方便在其他环境中使用
export { handleAgentSync, handleAgentList };