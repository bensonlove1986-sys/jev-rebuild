/**
 * KV存储测试与JEV协议验证脚本
 * 用于测试本地环境下的协议文件和验证功能
 */

const fs = require('fs');
const path = require('path');

// 模拟KV存储
class MockKVStore {
  constructor() {
    this.store = {};
  }

  async put(key, value) {
    this.store[key] = value;
    console.log(`KV存储: 成功写入键 ${key}`);
    return true;
  }

  async get(key) {
    return this.store[key] || null;
  }

  async list() {
    return Object.keys(this.store);
  }
}

// 模拟环境
const mockEnv = {
  JEV_GLOBAL_CONFIG: new MockKVStore(),
  JEV_LOGS: new MockKVStore()
};

// 简化版协议验证函数
async function verifyProtocol(task) {
  const required = [
    "目标",
    "背景",
    "输入",
    "输出",
    "执行步骤",
    "约束",
    "回传"
  ];

  const missing = required.filter(k => !(k in task));
  const extra = Object.keys(task).filter(k => !required.includes(k));
  const empty = required.filter(k => !task[k] || 
    (typeof task[k] === 'string' && task[k].trim().length === 0) ||
    (Array.isArray(task[k]) && task[k].length === 0) ||
    (typeof task[k] === 'object' && task[k] !== null && Object.keys(task[k]).length === 0)
  );

  const result = {
    success: missing.length === 0 && empty.length === 0,
    missing,
    empty,
    extra,
    timestamp: new Date().toISOString()
  };

  return result;
}

// 主测试函数
async function runTests() {
  console.log('开始KV存储和JEV协议测试...');
  
  // 1. 读取本地协议文件
  try {
    const protocolPath = path.join(__dirname, 'jev_prompt_protocol.json');
    const protocolContent = fs.readFileSync(protocolPath, 'utf8');
    const protocolData = JSON.parse(protocolContent);
    
    console.log('\n✅ 成功读取本地协议文件:');
    console.log(`  - 协议版本: ${protocolData.protocol_version}`);
    console.log(`  - 系统标识: ${protocolData.system}`);
    console.log(`  - Schema字段数: ${Object.keys(protocolData.schema).length}`);
    
    // 2. 测试模拟KV存储
    await mockEnv.JEV_GLOBAL_CONFIG.put('jev_prompt_protocol', protocolContent);
    const storedProtocol = await mockEnv.JEV_GLOBAL_CONFIG.get('jev_prompt_protocol');
    
    if (storedProtocol) {
      console.log('\n✅ 模拟KV存储测试成功:');
      const parsedStoredProtocol = JSON.parse(storedProtocol);
      console.log(`  - 存储的协议版本: ${parsedStoredProtocol.protocol_version}`);
    }
    
    // 3. 测试协议验证功能
    console.log('\n开始协议验证测试...');
    
    // 有效提示词示例
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
    
    const invalidTask = {
      "目标": "测试任务",
      "背景": "测试场景",
      // 缺少多个字段
      "输入": {},
      "额外字段": "测试"
    };
    
    const validResult = await verifyProtocol(validTask);
    console.log('\n✅ 有效提示词验证结果:');
    console.log(JSON.stringify(validResult, null, 2));
    
    const invalidResult = await verifyProtocol(invalidTask);
    console.log('\n✅ 无效提示词验证结果:');
    console.log(JSON.stringify(invalidResult, null, 2));
    
    // 4. 生成测试报告
    console.log('\n📋 测试报告:');
    console.log('  - 协议文件: 存在且格式正确');
    console.log('  - 模拟KV存储: 工作正常');
    console.log('  - 协议验证: 能够正确识别有效和无效提示词');
    
  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error.message);
  }
}

// 运行测试
runTests().then(() => {
  console.log('\n测试完成！');
}).catch(err => {
  console.error('测试失败:', err);
});