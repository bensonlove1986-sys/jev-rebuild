// 测试入口文件 - ES模块格式
import { verifyPromptProtocol } from './verify_protocol.js';

async function runTests() {
  console.log("开始测试JEV提示词协议验证功能...");
  
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
  
  // 测试用例3：格式错误的提示词
  const formatErrorTask = {
    "目标": "测试格式错误",
    "背景": "测试场景",
    "输入": "应该是对象但给了字符串",
    "输出": "测试输出",
    "执行步骤": "应该是数组但给了字符串",
    "约束": "应该是数组但给了字符串",
    "回传": "应该是对象但给了字符串"
  };
  
  console.log("\n测试用例1 - 完整且有效的提示词:");
  const result1 = await verifyPromptProtocol(validTask);
  console.log(JSON.stringify(result1, null, 2));
  
  console.log("\n测试用例2 - 缺少字段的提示词:");
  const result2 = await verifyPromptProtocol(invalidTask);
  console.log(JSON.stringify(result2, null, 2));
  
  console.log("\n测试用例3 - 格式错误的提示词:");
  const result3 = await verifyPromptProtocol(formatErrorTask);
  console.log(JSON.stringify(result3, null, 2));
}

// 运行测试
runTests().catch(err => {
  console.error("测试执行失败:", err);
  process.exit(1);
});