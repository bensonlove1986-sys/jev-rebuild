// JEV AI 智能客服系统 - Worker 端 - 自动环境修复版本

// 统一响应格式函数
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

// 环境检查函数
async function checkEnv(env) {
  const required = [
    "JEV_AI_CACHE",
    "JEV_LOGS",
    "JEV_GLOBAL_CONFIG",
    "JEV_PLUGIN_STATE",
    "R2_BUCKET",
    "DAOJIE_API_KEY",
  ];

  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0) {
    return { success: false, message: "❌ 环境缺失", missing };
  }
  return { success: true, message: "✅ 环境齐全", missing: [] };
}

// 自动修复环境函数
async function autoFixEnv(env, missing) {
  if (!env.CF_API_TOKEN || !env.ACCOUNT_ID) {
    return {
      success: false,
      message: "⚠️ 缺少 CF_API_TOKEN 或 ACCOUNT_ID，无法自动修复。",
    };
  }

  const fixed = [];
  for (const key of missing) {
    // 只处理KV命名空间
    if (key.startsWith('JEV_')) {
      try {
        const resp = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/storage/kv/namespaces`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.CF_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ title: key }),
          }
        );
        const data = await resp.json();
        if (data.success) {
          fixed.push(key);
          console.log(`✅ 成功创建KV命名空间: ${key}, ID: ${data.result.id}`);
        } else {
          console.error(`❌ 创建KV命名空间失败: ${key}, 错误:`, data.errors);
        }
      } catch (err) {
        console.error(`❌ API调用失败: ${key}, 错误:`, err.message);
      }
    }
  }

  return {
    success: fixed.length > 0,
    message: fixed.length > 0 ? "🔧 自动修复完成" : "❌ 修复失败",
    fixed,
    totalMissing: missing.length,
    fixedCount: fixed.length,
  };
}

// 邀请注册处理函数
async function handleInvite(request, env) {
  try {
    const body = await request.json();
    const { email, name } = body;
    
    if (!email || !name) {
      return json({ success: false, message: "缺少必要参数" }, 400);
    }
    
    // 这里可以实现邀请逻辑，如保存到KV
    if (env.JEV_GLOBAL_CONFIG) {
      const inviteKey = `invite_${Date.now()}`;
      await env.JEV_GLOBAL_CONFIG.put(inviteKey, JSON.stringify({
        email,
        name,
        created_at: new Date().toISOString(),
        status: "pending"
      }));
    }
    
    return json({ success: true, message: "邀请已发送", email, name });
  } catch (err) {
    return json({ success: false, message: "处理失败", error: err.message }, 500);
  }
}

// 同步处理函数
async function handleSync(request, env) {
  try {
    // 这里可以实现同步逻辑
    return json({ 
      success: true, 
      message: "同步成功",
      timestamp: new Date().toISOString(),
      sync_type: "full"
    });
  } catch (err) {
    return json({ success: false, message: "同步失败", error: err.message }, 500);
  }
}

// KV测试处理函数（扩展版）
async function handleKvTest(env) {
  try {
    const testResults = {};
    const testKey = "test_worker_auto_fix";
    const testValue = `test_${Date.now()}`;
    
    // 测试各个KV命名空间
    const kvNamespaces = [
      "JEV_AI_CACHE",
      "JEV_LOGS",
      "JEV_GLOBAL_CONFIG",
      "JEV_PLUGIN_STATE"
    ];
    
    for (const ns of kvNamespaces) {
      if (env[ns]) {
        try {
          // 写入测试
          await env[ns].put(testKey, testValue);
          
          // 读取测试
          const retrievedValue = await env[ns].get(testKey);
          
          testResults[ns] = {
            success: retrievedValue === testValue,
            value: retrievedValue
          };
        } catch (err) {
          testResults[ns] = {
            success: false,
            error: err.message
          };
        }
      } else {
        testResults[ns] = {
          success: false,
          error: "命名空间未绑定"
        };
      }
    }
    
    // 检查R2存储
    if (env.R2_BUCKET) {
      try {
        const testFile = new File([testValue], "test_worker_auto_fix.txt", { type: "text/plain" });
        await env.R2_BUCKET.put("test_worker_auto_fix.txt", testFile);
        
        const object = await env.R2_BUCKET.get("test_worker_auto_fix.txt");
        const content = await object.text();
        
        testResults.R2_BUCKET = {
          success: content === testValue,
          value: content
        };
      } catch (err) {
        testResults.R2_BUCKET = {
          success: false,
          error: err.message
        };
      }
    } else {
      testResults.R2_BUCKET = {
        success: false,
        error: "R2存储未绑定"
      };
    }
    
    return json({ 
      success: Object.values(testResults).every(r => r.success),
      kv: testResults
    }, 200);
  } catch (err) {
    return json({ kv: false, error: err.message }, 500);
  }
}

// 完整环境报告函数
async function generateEnvironmentReport(env) {
  const report = {
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    status: "pending",
    components: {
      kv: {},
      r2: {},
      vars: {}
    },
    issues: [],
    suggestions: []
  };
  
  // 检查KV命名空间
  const kvNamespaces = [
    "JEV_AI_CACHE",
    "JEV_LOGS",
    "JEV_GLOBAL_CONFIG",
    "JEV_PLUGIN_STATE"
  ];
  
  kvNamespaces.forEach(ns => {
    if (env[ns]) {
      report.components.kv[ns] = "已绑定";
    } else {
      report.components.kv[ns] = "未绑定";
      report.issues.push(`${ns} 未绑定`);
      report.suggestions.push(`使用Cloudflare API创建 ${ns} KV命名空间`);
    }
  });
  
  // 检查R2存储
  if (env.R2_BUCKET) {
    report.components.r2.available = true;
  } else {
    report.components.r2.available = false;
    report.issues.push("R2_BUCKET 未绑定");
    report.suggestions.push("在Cloudflare中创建R2存储桶并绑定");
  }
  
  // 检查环境变量
  const requiredVars = ["DAOJIE_API_KEY", "ACCOUNT_ID", "CF_API_TOKEN"];
  requiredVars.forEach(v => {
    if (env[v]) {
      report.components.vars[v] = "已配置";
    } else {
      report.components.vars[v] = "未配置";
      report.issues.push(`${v} 未配置`);
    }
  });
  
  // 设置状态
  if (report.issues.length === 0) {
    report.status = "healthy";
  } else if (report.issues.length <= 2) {
    report.status = "degraded";
  } else {
    report.status = "unhealthy";
  }
  
  return report;
}

// 主Worker处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS配置
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    };
    
    // 处理预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 基础端点 - ping
    if (path === "/ping") {
      return json({ success: true, message: "pong", timestamp: new Date().toISOString() }, 200, corsHeaders);
    }

    // 环境状态检查
    if (path === "/status") {
      try {
        const check = await checkEnv(env);
        const report = await generateEnvironmentReport(env);
        return json({ 
          success: check.success, 
          message: check.message, 
          missing: check.missing,
          report: report
        }, 200, corsHeaders);
      } catch (err) {
        return json({ success: false, message: "状态检查失败", error: err.message }, 500, corsHeaders);
      }
    }

    // 自动修复环境
    if (path === "/auto-env") {
      try {
        const check = await checkEnv(env);
        if (check.success) {
          return json({ 
            success: true, 
            message: "环境已就绪，无需修复",
            check: check
          }, 200, corsHeaders);
        }

        const fix = await autoFixEnv(env, check.missing);
        const finalReport = await generateEnvironmentReport(env);
        
        return json({ 
          check, 
          fix,
          report: finalReport,
          finalStatus: fix.success ? "修复完成" : "部分修复"
        }, 200, corsHeaders);
      } catch (err) {
        return json({ 
          success: false, 
          message: "自动修复失败", 
          error: err.message 
        }, 500, corsHeaders);
      }
    }

    // KV测试
    if (path === "/kv/test") {
      return handleKvTest(env, corsHeaders);
    }

    // 邀请注册端点
    if (path === "/invite" && request.method === "POST") {
      return handleInvite(request, env, corsHeaders);
    }

    // 同步端点
    if (path === "/sync") {
      return handleSync(request, env, corsHeaders);
    }

    // 系统信息端点
    if (path === "/system/info") {
      const info = {
        worker: "JEV Auto-Fix Worker",
        version: "1.0.0",
        features: [
          "环境自动检测",
          "KV自动创建",
          "健康检查",
          "邀请注册",
          "数据同步"
        ],
        endpoints: [
          "/ping",
          "/status",
          "/auto-env",
          "/kv/test",
          "/invite",
          "/sync",
          "/system/info"
        ]
      };
      return json(info, 200, corsHeaders);
    }

    // 未找到的路径
    return new Response("Not found", { 
      status: 404,
      headers: corsHeaders
    });
  },
};

// 兼容CommonJS模块导出（用于本地测试）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    default: exports.default,
    checkEnv,
    autoFixEnv,
    handleKvTest,
    handleInvite,
    handleSync
  };
}