// JEV L8.9.7 - 客服列表查询API端点
// 用于中控监控面板获取客服与邀请码绑定信息

// 模拟KV存储操作
const mockKVStorage = {
  // 从日志文件读取数据
  async get(key) {
    // 在实际环境中，这里会从KV存储读取
    // 现在我们返回模拟数据
    const mockData = await loadMockData();
    
    // 根据key查找记录
    if (key.startsWith('bind:')) {
      return mockData.records[key] || mockData.invite_mappings[key];
    }
    
    return null;
  },
  
  // 获取所有记录
  async getAll() {
    const mockData = await loadMockData();
    return Object.values(mockData.records);
  },
  
  // 模拟按前缀列出
  async list(prefix) {
    const mockData = await loadMockData();
    const result = [];
    
    Object.entries(mockData.records).forEach(([key, value]) => {
      if (key.startsWith(prefix)) {
        result.push({ key, value });
      }
    });
    
    return result;
  }
};

// 加载模拟数据
async function loadMockData() {
  try {
    // 尝试从文件系统读取
    // 在实际环境中，这里会从KV存储或日志文件读取
    
    // 返回模拟数据
    return {
      records: {
        "bind:agent_xv83k2": {
          "agent_id": "agent_xv83k2",
          "agent_name": "Benson",
          "invite_code": "AGT-5K8B-9M2C",
          "registered_at": "2025-11-08T15:25:11Z",
          "status": "active",
          "last_seen": "2025-11-08T15:27:42Z"
        },
        "bind:agent_jy75p9": {
          "agent_id": "agent_jy75p9",
          "agent_name": "Lina",
          "invite_code": "AGT-7R3D-2P8E",
          "registered_at": "2025-11-08T14:30:22Z",
          "status": "active",
          "last_seen": "2025-11-08T15:20:15Z"
        },
        "bind:agent_qw92m4": {
          "agent_id": "agent_qw92m4",
          "agent_name": "Michael",
          "invite_code": "AGT-9T5F-4Q1S",
          "registered_at": "2025-11-07T10:15:33Z",
          "status": "inactive",
          "last_seen": "2025-11-07T18:45:50Z"
        },
        "bind:agent_as67d5": {
          "agent_id": "agent_as67d5",
          "agent_name": "Sarah",
          "invite_code": "AGT-5K8B-9M2C",
          "registered_at": "2025-11-08T09:40:44Z",
          "status": "active",
          "last_seen": "2025-11-08T15:10:28Z"
        },
        "bind:agent_zx38f7": {
          "agent_id": "agent_zx38f7",
          "agent_name": "David",
          "invite_code": "AGT-3Y6H-7N4G",
          "registered_at": "2025-11-08T11:20:55Z",
          "status": "inactive",
          "last_seen": "2025-11-08T13:50:12Z"
        }
      },
      invite_mappings: {
        "bind:AGT-5K8B-9M2C": {
          "agent_id": "agent_xv83k2",
          "agent_name": "Benson",
          "invite_code": "AGT-5K8B-9M2C",
          "registered_at": "2025-11-08T15:25:11Z",
          "status": "active",
          "last_seen": "2025-11-08T15:27:42Z"
        },
        "bind:AGT-7R3D-2P8E": {
          "agent_id": "agent_jy75p9",
          "agent_name": "Lina",
          "invite_code": "AGT-7R3D-2P8E",
          "registered_at": "2025-11-08T14:30:22Z",
          "status": "active",
          "last_seen": "2025-11-08T15:20:15Z"
        },
        "bind:AGT-9T5F-4Q1S": {
          "agent_id": "agent_qw92m4",
          "agent_name": "Michael",
          "invite_code": "AGT-9T5F-4Q1S",
          "registered_at": "2025-11-07T10:15:33Z",
          "status": "inactive",
          "last_seen": "2025-11-07T18:45:50Z"
        },
        "bind:AGT-3Y6H-7N4G": {
          "agent_id": "agent_zx38f7",
          "agent_name": "David",
          "invite_code": "AGT-3Y6H-7N4G",
          "registered_at": "2025-11-08T11:20:55Z",
          "status": "inactive",
          "last_seen": "2025-11-08T13:50:12Z"
        }
      }
    };
  } catch (error) {
    console.error('加载模拟数据失败:', error);
    return { records: {}, invite_mappings: {} };
  }
}

// 处理请求
async function handleRequest(request) {
  try {
    // 解析请求参数
    const url = new URL(request.url);
    const inviteCode = url.searchParams.get('invite_code');
    const status = url.searchParams.get('status');
    
    // 获取所有客服记录
    const agents = await mockKVStorage.getAll();
    
    // 应用过滤条件
    let filteredAgents = agents;
    
    if (inviteCode) {
      filteredAgents = filteredAgents.filter(agent => 
        agent.invite_code === inviteCode
      );
    }
    
    if (status) {
      filteredAgents = filteredAgents.filter(agent => 
        agent.status === status
      );
    }
    
    // 排序：先按状态（active优先），再按最后在线时间
    filteredAgents.sort((a, b) => {
      // 状态排序
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      // 时间排序
      return new Date(b.last_seen) - new Date(a.last_seen);
    });
    
    // 返回响应
    return new Response(JSON.stringify({
      success: true,
      agents: filteredAgents,
      total: filteredAgents.length,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('处理请求失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// 处理预检请求
function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

// 主函数 - 处理Worker请求
async function handleWorkerRequest(request) {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }
  
  if (request.method === 'GET') {
    return handleRequest(request);
  }
  
  // 不支持的方法
  return new Response(JSON.stringify({
    success: false,
    error: '不支持的请求方法',
    allowed_methods: ['GET', 'OPTIONS']
  }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Allow': 'GET, OPTIONS'
    }
  });
}

// 在浏览器环境中提供模拟数据
if (typeof window !== 'undefined') {
  // 为监控面板提供模拟数据
  window.mockAgentListData = async () => {
    const mockData = await loadMockData();
    return {
      success: true,
      agents: Object.values(mockData.records),
      total: Object.values(mockData.records).length,
      timestamp: new Date().toISOString()
    };
  };
} else if (typeof self !== 'undefined') {
  // Worker环境
  self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // 只处理特定路径
    if (url.pathname === '/api/agents/list') {
      event.respondWith(handleWorkerRequest(event.request));
    }
  });
} else if (typeof module !== 'undefined') {
  // Node.js环境
  module.exports = {
    handleRequest,
    handleWorkerRequest,
    loadMockData
  };
}

// 输出调试信息
console.log('JEV L8.9.7 - 客服列表API端点已加载');