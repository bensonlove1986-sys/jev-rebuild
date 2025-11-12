/**
 * JEV 提示词协议校验脚本 v1.0
 * 用于检查 TRAE 传入的任务是否符合 jev_prompt_protocol.json
 */

export async function verifyPromptProtocol(task, env) {
  const required = [
    "目标",
    "背景",
    "输入",
    "输出",
    "执行步骤",
    "约束",
    "回传"
  ];

  // 从 KV 或 URL 获取协议定义
  let protocol;
  try {
    const res = await fetch(
      "https://jevshop.bensonlove1986.workers.dev/config/jev_prompt_protocol.json"
    );
    protocol = await res.json();
  } catch (err) {
    // 如果远程获取失败，使用本地协议定义作为备用
    console.warn("无法从远程加载协议定义，使用备用方案");
    protocol = {
      protocol_version: "1.0",
      system: "JEV",
      schema: {
        "目标": "一句话说明最终想实现的状态。",
        "背景": "系统环境、版本号、依赖模块、上下文。",
        "输入": "执行所需的参数，如路径、API、文件等。",
        "输出": "期望得到的结果或验证标准。",
        "执行步骤": "逐步列出任务执行逻辑。",
        "约束": "必须遵守的安全或逻辑边界。",
        "回传": "执行完成后返回的数据格式与字段。"
      }
    };
  }

  // 逐项检测字段
  const missing = required.filter(k => !(k in task));
  const extra = Object.keys(task).filter(k => !required.includes(k));
  const empty = required.filter(k => !task[k] || 
    (typeof task[k] === 'string' && task[k].trim().length === 0) ||
    (Array.isArray(task[k]) && task[k].length === 0) ||
    (typeof task[k] === 'object' && task[k] !== null && Object.keys(task[k]).length === 0)
  );

  // 深度验证特定字段的格式
  const formatErrors = [];
  
  // 验证执行步骤是数组
  if (task["执行步骤"] && !Array.isArray(task["执行步骤"])) {
    formatErrors.push("执行步骤必须是数组格式");
  }
  
  // 验证约束是数组
  if (task["约束"] && !Array.isArray(task["约束"])) {
    formatErrors.push("约束必须是数组格式");
  }
  
  // 验证输入和回传是对象
  if (task["输入"] && typeof task["输入"] !== 'object') {
    formatErrors.push("输入必须是对象格式");
  }
  if (task["回传"] && typeof task["回传"] !== 'object') {
    formatErrors.push("回传必须是对象格式");
  }

  const result = {
    success: missing.length === 0 && empty.length === 0 && formatErrors.length === 0,
    missing,
    empty,
    extra,
    formatErrors,
    protocol_version: protocol.protocol_version,
    timestamp: new Date().toISOString()
  };

  // 写入日志
  if (env?.JEV_LOGS) {
    try {
      await env.JEV_LOGS.put(
        `verify_${Date.now()}`,
        JSON.stringify({ task, result }, null, 2)
      );
    } catch (err) {
      console.warn("无法写入验证日志:", err.message);
    }
  } else {
    // 本地环境下打印日志
    console.log("协议验证结果:", JSON.stringify(result, null, 2));
  }

  return result;
}

/* 示例：Worker 端点 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/verify-protocol") {
      try {
        const body = await request.json();
        const result = await verifyPromptProtocol(body, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({
          success: false,
          error: "请求处理失败",
          detail: err.message
        }, null, 2), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    return new Response("JEV Protocol Verifier Online");
  }
};

/* 本地测试函数 */
async function testVerifyProtocol() {
  console.log("开始本地测试协议验证功能...");
  
  // 测试用例1：完整的提示词
  const validTask = {
    "目标": "部署 JEV 客服客户端模块",
    "背景": "系统版本 v2.0.0，通信核心 lib/connection.js",
    "输入": {
      "worker_url": "https://jevshop.bensonlove1986.workers.dev",
      "kv": ["JEV_GLOBAL_CONFIG", "JEV_LOGS"]
    },
    "输出": "模块注册 window.JEV_MODULES['panel']，UI 显示正常",
    "执行步骤": [
      "1. 检查并备份旧 panel.js",
      "2. 部署新模块",
      "3. 验证 /ping 与 /license",
      "4. 写入部署日志"
    ],
    "约束": [
      "不得修改 lib/connection.js",
      "保持所有头部一致"
    ],
    "回传": {
      "success": true,
      "version": "L8.5-client-v1.0.0",
      "timestamp": "<UTC>"
    }
  };
  
  // 测试用例2：缺少字段的提示词
  const invalidTask = {
    "目标": "部署模块",
    "背景": "系统版本 v2.0.0",
    "输入": {},
    // 缺少输出字段
    "执行步骤": ["步骤1"],
    "约束": [],
    "回传": {},
    "额外字段": "这是一个额外的字段"
  };
  
  console.log("\n测试用例1 - 完整提示词:");
  const result1 = await verifyPromptProtocol(validTask);
  console.log(JSON.stringify(result1, null, 2));
  
  console.log("\n测试用例2 - 不完整提示词:");
  const result2 = await verifyPromptProtocol(invalidTask);
  console.log(JSON.stringify(result2, null, 2));
}

// ES模块环境中，我们创建一个单独的测试入口文件来运行测试
// 这里保留测试函数但不直接执行
// 要运行测试，请创建一个单独的测试脚本
