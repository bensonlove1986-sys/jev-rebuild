export default {
  async fetch(request, env, ctx) {
    const { jevui, MEM_STORE, R2_BUCKET } = env;
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    // 通用响应封装
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj, null, 2), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    // 🩺 健康检测
    if (path === "/ping") {
      return json({
        success: true,
        message: "JEV Worker Online ✅",
        kvs: {
          jevui: !!jevui,
          mem: !!MEM_STORE,
          r2: !!R2_BUCKET,
        },
        time: new Date().toISOString(),
      });
    }

    // 🔑 KV 测试接口
    if (path === "/kv-test") {
      await MEM_STORE.put("test_key", "ok", { expirationTtl: 60 });
      const value = await MEM_STORE.get("test_key");
      return json({
        success: true,
        message: "KV 测试成功",
        value,
      });
    }

    // 💾 读取 UI 状态
    if (path === "/ui" && method === "GET") {
      const data = await jevui.get("ui_state", { type: "json" });
      return json({ success: true, ui: data || {} });
    }

    // 💾 更新 UI 状态
    if (path === "/ui" && method === "POST") {
      const body = await request.json();
      await jevui.put("ui_state", JSON.stringify(body));
      return json({ success: true, message: "UI 状态已更新" });
    }

    // 🤖 Agent 注册
    if (path === "/agents/register" && method === "POST") {
      const body = await request.json();
      body.last_seen = Date.now();
      await MEM_STORE.put(`agent_${body.agent_id}`, JSON.stringify(body), {
        expirationTtl: 600,
      });
      return json({ success: true, agent: body });
    }

    // 🤝 Agent 心跳
    if (path === "/agents/heartbeat" && method === "POST") {
      const body = await request.json();
      const key = `agent_${body.agent_id}`;
      const agent = await MEM_STORE.get(key, { type: "json" });
      if (agent) {
        agent.last_seen = Date.now();
        await MEM_STORE.put(key, JSON.stringify(agent), { expirationTtl: 600 });
        return json({ success: true, message: "心跳更新成功" });
      }
      return json({ success: false, error: "Agent 未注册" }, 404);
    }

    // 📋 获取 Agent 列表
    if (path === "/agents" && method === "GET") {
      const list = await MEM_STORE.list();
      const agents = [];
      for (const key of list.keys) {
        if (key.name.startsWith("agent_")) {
          const data = await MEM_STORE.get(key.name, { type: "json" });
          agents.push(data);
        }
      }
      return json({ success: true, agents });
    }

    // 🧾 日志记录
    if (path === "/log" && method === "POST") {
      const body = await request.json();
      const logKey = `log_${Date.now()}`;
      await MEM_STORE.put(logKey, JSON.stringify(body), { expirationTtl: 86400 });
      return json({ success: true, message: "日志已写入", id: logKey });
    }

    // 📦 文件上传
    if (path === "/upload" && method === "POST") {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) return json({ success: false, error: "未提供文件" }, 400);

      const key = `uploads/${Date.now()}_${file.name}`;
      await R2_BUCKET.put(key, file.stream());
      return json({
        success: true,
        key,
        url: `https://pub-${env.R2_BUCKET}.r2.cloudflarestorage.com/${key}`,
      });
    }

    // 📊 系统状态
    if (path === "/status") {
      const list = await MEM_STORE.list();
      const agents = list.keys.filter(k => k.name.startsWith("agent_")).length;
      return json({
        success: true,
        agents_online: agents,
        timestamp: new Date().toISOString(),
      });
    }

    // 未匹配的路由
    return json({ success: false, error: "未知路径", path }, 404);
  },
};

/**
 * KV 测试端点处理
 * 测试三个 KV 命名空间的读写功能
 */
async function handleKVTest(request, env) {
  try {
    // 写入测试数据
    const timestamp = new Date().toISOString();
    await env.JEVPI.put('sys:init', timestamp);
    await env.JEVUI.put('ui:theme', 'dark');
    await env.MEM_STORE.put('tmp:test', 'ok');
    
    // 读取测试数据
    const resp = {
      jevpi: await env.JEVPI.get('sys:init'),
      jevui: await env.JEVUI.get('ui:theme'),
      mem: await env.MEM_STORE.get('tmp:test'),
      timestamp: timestamp
    };
    
    return new Response(JSON.stringify(resp, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'KV 测试失败',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 系统检查端点处理
 * 全面检查所有存储系统并返回状态
 */
async function handleSystemCheck(request, env) {
  try {
    const status = {
      system: {
        name: 'JEV 多层智能数据体系',
        timestamp: new Date().toISOString(),
        status: 'operational'
      },
      kv_status: {},
      r2_status: {},
      signature: null
    };
    
    // 检查 JEVPI
    try {
      await env.JEVPI.put('sys:check', new Date().toISOString());
      status.kv_status.jevpi = {
        status: 'connected',
        test_key: 'sys:check',
        available: true
      };
    } catch (err) {
      status.kv_status.jevpi = {
        status: 'error',
        error: err.message,
        available: false
      };
    }
    
    // 检查 JEVUI
    try {
      await env.JEVUI.put('ui:check', 'test');
      status.kv_status.jevui = {
        status: 'connected',
        test_key: 'ui:check',
        available: true
      };
    } catch (err) {
      status.kv_status.jevui = {
        status: 'error',
        error: err.message,
        available: false
      };
    }
    
    // 检查 MEM_STORE
    try {
      await env.MEM_STORE.put('mem:check', 'test');
      status.kv_status.mem_store = {
        status: 'connected',
        test_key: 'mem:check',
        available: true
      };
    } catch (err) {
      status.kv_status.mem_store = {
        status: 'error',
        error: err.message,
        available: false
      };
    }
    
    // 检查 R2_BUCKET
    try {
      // 列出文件以测试连接
      const bucket = env.R2_BUCKET;
      const listResult = await bucket.list({
        prefix: '',
        limit: 1
      });
      
      status.r2_status = {
        status: 'connected',
        bucket: bucket.name,
        files_count: listResult.objects.length,
        available: true
      };
    } catch (err) {
      status.r2_status = {
        status: 'error',
        error: err.message,
        available: false
      };
    }
    
    // 获取系统签名
    try {
      status.signature = await env.JEVPI.get('jev:signature');
      if (!status.signature) {
        // 如果没有签名，尝试设置一个
        await env.JEVPI.put('jev:signature', 'JEV_SYSTEM_READY');
        status.signature = 'JEV_SYSTEM_READY';
      }
    } catch (err) {
      status.signature = null;
    }
    
    // 设置整体状态
    const allSystemsAvailable = 
      status.kv_status.jevpi?.available &&
      status.kv_status.jevui?.available &&
      status.kv_status.mem_store?.available &&
      status.r2_status.available;
    
    status.system.status = allSystemsAvailable ? 'fully_operational' : 'partial';
    
    return new Response(JSON.stringify(status, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: '系统检查失败',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * R2 测试端点处理
 * 测试 R2 文件存储功能
 */
async function handleR2Test(request, env) {
  try {
    const bucket = env.R2_BUCKET;
    const timestamp = new Date().toISOString();
    
    // 创建测试文件内容
    const testData = {
      status: 'ok',
      timestamp: timestamp,
      test_type: 'r2_storage_test',
      message: 'JEV R2 存储测试成功'
    };
    
    const testDataString = JSON.stringify(testData, null, 2);
    
    // 上传测试文件
    const fileName = 'jev_test.json';
    await bucket.put(fileName, testDataString, {
      httpMetadata: {
        contentType: 'application/json'
      },
      customMetadata: {
        'jev-test': 'true',
        'created-at': timestamp
      }
    });
    
    // 读取测试文件以验证
    const object = await bucket.get(fileName);
    if (!object) {
      throw new Error('无法读取刚上传的文件');
    }
    
    const content = await object.text();
    const uploadedData = JSON.parse(content);
    
    // 列出存储桶中的对象
    const listResult = await bucket.list({
      prefix: '',
      limit: 10
    });
    
    const response = {
      status: 'success',
      r2_bucket: bucket.name,
      uploaded_file: fileName,
      file_size: testDataString.length,
      uploaded_content: uploadedData,
      bucket_objects: listResult.objects.map(obj => ({
        name: obj.key,
        size: obj.size,
        etag: obj.etag
      })),
      total_objects: listResult.objects.length
    };
    
    return new Response(JSON.stringify(response, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'R2 测试失败',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 扩展功能：批量写入测试数据
 */
async function handleBatchTest(request, env) {
  try {
    // 批量写入测试数据
    const promises = [];
    
    // JEVPI 写入
    promises.push(env.JEVPI.put('sys:version', '1.0.0'));
    promises.push(env.JEVPI.put('sys:config', JSON.stringify({
      mode: 'production',
      debug: false,
      features: ['kv', 'r2', 'ai']
    })));
    promises.push(env.JEVPI.put('jev:signature', 'JEV_SYSTEM_READY'));
    promises.push(env.JEVPI.put('sys:last_sync', new Date().toISOString()));
    
    // JEVUI 写入
    promises.push(env.JEVUI.put('ui:version', 'v1.0.0'));
    promises.push(env.JEVUI.put('ui:theme', 'dark'));
    promises.push(env.JEVUI.put('ui:config', JSON.stringify({
      layout: 'compact',
      notifications: true,
      language: 'zh-CN'
    })));
    
    // MEM_STORE 写入
    promises.push(env.MEM_STORE.put('tmp:init_status', 'ready'));
    promises.push(env.MEM_STORE.put('tmp:session', 'test-session-123'));
    promises.push(env.MEM_STORE.put('tmp:activity', JSON.stringify({
      last_access: new Date().toISOString(),
      operations: 0
    })));
    
    await Promise.all(promises);
    
    return new Response(JSON.stringify({
      status: 'success',
      message: '批量测试数据写入成功',
      written_keys: 11,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: '批量测试失败',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
