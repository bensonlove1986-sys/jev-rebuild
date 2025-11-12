// JEV AI 智能客服系统 - Worker 端（整合版）
// 支持KV存储（jevui、MEM_STORE）和R2存储

// 全局错误处理
addEventListener('error', (event) => {
  console.error('Worker error:', event.error);
});

// 全局未捕获的Promise拒绝处理
addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise rejection:', event.reason);
});

// 统一响应格式函数
function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Key'
    }
  });
}

// 处理OPTIONS请求（CORS预检）
function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Key'
    }
  });
}

// KV操作通用封装函数
async function kvGet(store, key, fallback = null) {
  try {
    const value = await store.get(key, 'json');
    return value !== null ? value : fallback;
  } catch (error) {
    console.error(`KV GET error for ${key}:`, error);
    return fallback;
  }
}

async function kvPut(store, key, value) {
  try {
    await store.put(key, JSON.stringify(value));
    return { success: true };
  } catch (error) {
    console.error(`KV PUT error for ${key}:`, error);
    return { success: false, error: error.message };
  }
}

async function kvList(store) {
  try {
    const list = await store.list();
    return list.keys || [];
  } catch (error) {
    console.error('KV LIST error:', error);
    return [];
  }
}

async function kvDelete(store, key) {
  try {
    await store.delete(key);
    return { success: true };
  } catch (error) {
    console.error(`KV DELETE error for ${key}:`, error);
    return { success: false, error: error.message };
  }
}

// 存储绑定检查函数
function checkBindings(env) {
  const bindings = {
    jevui: !!env.jevui,
    MEM_STORE: !!env.MEM_STORE,
    R2_BUCKET: !!env.R2_BUCKET
  };
  
  // 打印绑定状态日志
  console.log('[JEV] KV jevui 已绑定' + (bindings.jevui ? ' ✅' : ' ❌'));
  console.log('[JEV] KV MEM_STORE 已绑定' + (bindings.MEM_STORE ? ' ✅' : ' ❌'));
  console.log('[JEV] R2_BUCKET 已绑定' + (bindings.R2_BUCKET ? ' ✅' : ' ❌'));
  
  return bindings;
}

// 获取系统状态
async function getSystemStatus(env, bindings) {
  const status = {
    bindings,
    timestamp: new Date().toISOString()
  };
  
  // 获取KV统计信息
  if (bindings.jevui) {
    try {
      const uiKeys = await kvList(env.jevui);
      status.ui_kv = {
        count: uiKeys.length,
        example_keys: uiKeys.slice(0, 5).map(k => k.name)
      };
    } catch (error) {
      status.ui_kv = { error: error.message };
    }
  }
  
  if (bindings.MEM_STORE) {
    try {
      const memKeys = await kvList(env.MEM_STORE);
      status.mem_kv = {
        count: memKeys.length,
        example_keys: memKeys.slice(0, 5).map(k => k.name)
      };
    } catch (error) {
      status.mem_kv = { error: error.message };
    }
  }
  
  // 检查R2存储桶
  if (bindings.R2_BUCKET) {
    try {
      // 创建一个健康检查文件
      const healthFile = 'health-check.txt';
      await env.R2_BUCKET.put(healthFile, 'OK');
      
      // 获取文件信息进行验证
      const healthCheck = await env.R2_BUCKET.head(healthFile);
      status.r2_status = {
        available: !!healthCheck,
        health: 'OK'
      };
    } catch (error) {
      status.r2_status = { error: error.message };
    }
  }
  
  return status;
}

// 处理UI状态读取
async function handleGetUIStatus(env) {
  if (!env.jevui) {
    return json({ success: false, error: 'jevui KV命名空间未绑定' });
  }
  
  try {
    // 获取UI相关的所有键
    const keys = await kvList(env.jevui);
    const uiState = {};
    
    // 只获取以ui:开头的键
    for (const key of keys) {
      if (key.name.startsWith('ui:')) {
        uiState[key.name] = await kvGet(env.jevui, key.name);
      }
    }
    
    return json({ success: true, data: uiState });
  } catch (error) {
    console.error('获取UI状态错误:', error);
    return json({ success: false, error: error.message });
  }
}

// 处理UI状态更新
async function handleUpdateUIStatus(request, env) {
  if (!env.jevui) {
    return json({ success: false, error: 'jevui KV命名空间未绑定' });
  }
  
  try {
    const data = await request.json();
    
    // 更新UI状态
    for (const [key, value] of Object.entries(data)) {
      const uiKey = key.startsWith('ui:') ? key : `ui:${key}`;
      await kvPut(env.jevui, uiKey, value);
    }
    
    return json({ success: true, message: 'UI状态已更新' });
  } catch (error) {
    console.error('更新UI状态错误:', error);
    return json({ success: false, error: error.message });
  }
}

// 处理Agent列表读取
async function handleGetAgents(env) {
  if (!env.MEM_STORE) {
    return json({ success: false, error: 'MEM_STORE KV命名空间未绑定' });
  }
  
  try {
    // 获取Agent相关的所有键
    const keys = await kvList(env.MEM_STORE);
    const agents = {};
    
    // 只获取以agent:开头的键
    for (const key of keys) {
      if (key.name.startsWith('agent:')) {
        agents[key.name] = await kvGet(env.MEM_STORE, key.name);
      }
    }
    
    return json({ success: true, data: agents });
  } catch (error) {
    console.error('获取Agent列表错误:', error);
    return json({ success: false, error: error.message });
  }
}

// 处理文件上传到R2
async function handleUploadToR2(request, env) {
  if (!env.R2_BUCKET) {
    return json({ success: false, error: 'R2_BUCKET存储桶未绑定' });
  }
  
  try {
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return json({ success: false, error: '未找到文件' });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'bin';
    const fileName = `uploads/${timestamp}-${randomString}.${extension}`;
    
    // 上传到R2
    await env.R2_BUCKET.put(fileName, file, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream'
      },
      customMetadata: {
        uploadedBy: 'JEV-AI-System',
        timestamp: timestamp.toString(),
        originalName: file.name
      }
    });

    // 生成public URL（假设R2存储桶已配置公共访问）
    // 注意：实际URL格式取决于您的R2配置
    const publicUrl = `https://${env.R2_BUCKET}.r2.cloudflarestorage.com/${fileName}`;
    
    return json({ 
      success: true, 
      data: { 
        fileName, 
        publicUrl, 
        size: file.size,
        type: file.type 
      } 
    });
  } catch (error) {
    console.error('R2上传错误:', error);
    return json({ success: false, error: error.message });
  }
}

// KV操作接口 - GET /kv/get
async function handleKVGet(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const storeName = url.searchParams.get('store') || 'ui';
  
  if (!key) {
    return json({ success: false, error: '缺少key参数' });
  }
  
  const store = storeName === 'ui' ? env.jevui : env.MEM_STORE;
  
  if (!store) {
    return json({ 
      success: false, 
      error: `${storeName === 'ui' ? 'jevui' : 'MEM_STORE'} KV命名空间未绑定` 
    });
  }
  
  const value = await kvGet(store, key);
  return json({ success: true, data: value });
}

// KV操作接口 - POST /kv/set
async function handleKVSet(request, env) {
  try {
    const data = await request.json();
    const { key, value, store = 'ui' } = data;
    
    if (!key) {
      return json({ success: false, error: '缺少key参数' });
    }
    
    const storeObj = store === 'ui' ? env.jevui : env.MEM_STORE;
    
    if (!storeObj) {
      return json({ 
        success: false, 
        error: `${store === 'ui' ? 'jevui' : 'MEM_STORE'} KV命名空间未绑定` 
      });
    }
    
    const result = await kvPut(storeObj, key, value);
    return json(result.success ? { success: true } : { success: false, error: result.error });
  } catch (error) {
    return json({ success: false, error: error.message });
  }
}

// KV操作接口 - GET /kv/del
async function handleKVDel(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const storeName = url.searchParams.get('store') || 'ui';
  
  if (!key) {
    return json({ success: false, error: '缺少key参数' });
  }
  
  const store = storeName === 'ui' ? env.jevui : env.MEM_STORE;
  
  if (!store) {
    return json({ 
      success: false, 
      error: `${storeName === 'ui' ? 'jevui' : 'MEM_STORE'} KV命名空间未绑定` 
    });
  }
  
  const result = await kvDelete(store, key);
  return json(result.success ? { success: true } : { success: false, error: result.error });
}

// 批量获取KV数据
async function handleKVGetBatch(request, env) {
  try {
    const data = await request.json();
    const { keys = [], store = 'ui' } = data;
    
    if (!Array.isArray(keys)) {
      return json({ success: false, error: 'keys必须是数组' });
    }
    
    const storeObj = store === 'ui' ? env.jevui : env.MEM_STORE;
    
    if (!storeObj) {
      return json({ 
        success: false, 
        error: `${store === 'ui' ? 'jevui' : 'MEM_STORE'} KV命名空间未绑定` 
      });
    }
    
    const result = {};
    for (const key of keys) {
      result[key] = await kvGet(storeObj, key);
    }
    
    return json({ success: true, data: result });
  } catch (error) {
    return json({ success: false, error: error.message });
  }
}

// 批量保存KV数据
async function handleKVSetBatch(request, env) {
  try {
    const data = await request.json();
    const { items = {}, store = 'ui' } = data;
    
    const storeObj = store === 'ui' ? env.jevui : env.MEM_STORE;
    
    if (!storeObj) {
      return json({ 
        success: false, 
        error: `${store === 'ui' ? 'jevui' : 'MEM_STORE'} KV命名空间未绑定` 
      });
    }
    
    const results = {};
    for (const [key, value] of Object.entries(items)) {
      const result = await kvPut(storeObj, key, value);
      results[key] = result;
    }
    
    const allSuccess = Object.values(results).every(r => r.success);
    return json({ 
      success: allSuccess, 
      data: results,
      error: allSuccess ? null : '部分操作失败' 
    });
  } catch (error) {
    return json({ success: false, error: error.message });
  }
}

// 主请求处理函数
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const route = path.replace(/^\//, '');

  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // 路由处理
  switch (path) {
    // 系统状态接口
    case '/status':
      const bindings = checkBindings(env);
      const status = await getSystemStatus(env, bindings);
      return json({ success: true, route, data: status });
      
    // UI状态接口
    case '/ui':
      if (request.method === 'GET') {
        return handleGetUIStatus(env);
      } else if (request.method === 'POST') {
        return handleUpdateUIStatus(request, env);
      }
      break;
      
    // Agent列表接口
    case '/agents':
      return handleGetAgents(env);
      
    // 文件上传接口
    case '/upload':
      return handleUploadToR2(request, env);
      
    // KV操作接口
    case '/kv/get':
      return handleKVGet(request, env);
      
    case '/kv/set':
      return handleKVSet(request, env);
      
    case '/kv/del':
      return handleKVDel(request, env);
      
    case '/kv/getBatch':
      return handleKVGetBatch(request, env);
      
    case '/kv/setBatch':
      return handleKVSetBatch(request, env);
      
    // 原有的API接口
    case '/upload-image':
    case '/analyze-image':
    case '/chat-reply':
      // 为了兼容原有功能，可以保留这些路由
      // 但在实际使用中，建议迁移到新的统一接口
      return json({ 
        success: false, 
        error: '该接口已弃用，请使用新的统一接口',
        message: '请使用 /upload 进行文件上传，/kv/* 进行KV操作' 
      });
      
    default:
      return json({ success: false, error: '端点不存在', route });
  }
  
  return json({ success: false, error: '方法不允许', route });
}

// Cloudflare Worker导出
const worker = {
  async fetch(request, env, ctx) {
    // 第一次请求时检查绑定
    if (!worker.bindingsChecked) {
      const bindings = checkBindings(env);
      console.log('[JEV] Worker 环境同步完成' + 
        (bindings.jevui && bindings.MEM_STORE && bindings.R2_BUCKET ? ' ✅' : ' ⚠️ 部分绑定缺失'));
      worker.bindingsChecked = true;
    }
    
    return handleRequest(request, env);
  }
};

// 导出worker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = worker;
} else if (typeof addEventListener !== 'undefined') {
  // 直接在Cloudflare环境中运行
  addEventListener('fetch', (event) => {
    event.respondWith(worker.fetch(event.request, event.env, event.ctx));
  });
}

// 模拟环境（用于本地测试）
if (typeof window !== 'undefined') {
  // 浏览器环境模拟
  window.JEV_WORKER = worker;
  console.log('[JEV] 模拟Worker环境已加载');
}

// 初始化绑定检查标志
worker.bindingsChecked = false;