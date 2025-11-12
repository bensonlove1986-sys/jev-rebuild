// JEV 智能自动化系统 - Cloudflare Worker
// 集成KV(jevui、MEM_STORE)和R2(R2_BUCKET)存储绑定

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
      const healthFile = 'health-check.txt';
      await env.R2_BUCKET.put(healthFile, 'OK');
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
    const keys = await kvList(env.jevui);
    const uiState = {};
    
    for (const key of keys) {
      if (key.name.startsWith('ui:')) {
        uiState[key.name] = await kvGet(env.jevui, key.name);
      }
    }
    
    return json({ success: true, data: uiState });
  } catch (error) {
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
    
    for (const [key, value] of Object.entries(data)) {
      const uiKey = key.startsWith('ui:') ? key : `ui:${key}`;
      await kvPut(env.jevui, uiKey, value);
    }
    
    return json({ success: true, message: 'UI状态已更新' });
  } catch (error) {
    return json({ success: false, error: error.message });
  }
}

// 处理Agent列表读取
async function handleGetAgents(env) {
  if (!env.MEM_STORE) {
    return json({ success: false, error: 'MEM_STORE KV命名空间未绑定' });
  }
  
  try {
    const keys = await kvList(env.MEM_STORE);
    const agents = {};
    
    for (const key of keys) {
      if (key.name.startsWith('agent:')) {
        agents[key.name] = await kvGet(env.MEM_STORE, key.name);
      }
    }
    
    return json({ success: true, data: agents });
  } catch (error) {
    return json({ success: false, error: error.message });
  }
}

// 处理文件上传到R2
async function handleUploadToR2(request, env) {
  if (!env.R2_BUCKET) {
    return json({ success: false, error: 'R2_BUCKET存储桶未绑定' });
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return json({ success: false, error: '未找到文件' });
    }

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
    return json({ success: false, error: error.message });
  }
}

// KV操作接口
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

// 主Worker处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 处理OPTIONS请求
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // 路由处理
    switch (path) {
      // 系统状态接口
      case '/status': {
        const bindings = checkBindings(env);
        const status = await getSystemStatus(env, bindings);
        return json({ success: true, route: path, data: status });
      }
      
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
      
      default:
        return json({ success: false, error: '端点不存在', route: path });
    }
    
    return json({ success: false, error: '方法不允许', route: path });
  }
};

// 初始化时打印系统信息
console.log('[JEV] Cloudflare Worker 初始化完成');