// KV命名空间绑定说明脚本
// 请按照以下列表在Cloudflare Dashboard中为jevshop Worker添加KV命名空间绑定

const REQUIRED_KV_BINDINGS = [
  {
    binding: "JEV_AI_CACHE",
    description: "AI模型缓存和会话管理"
  },
  {
    binding: "JEV_GLOBAL_CONFIG",
    description: "全局配置存储"
  },
  {
    binding: "JEV_LOGS",
    description: "系统日志存储"
  },
  {
    binding: "JEV_PLUGIN_STATE",
    description: "插件状态管理（当前缺失）"
  },
  {
    binding: "Bensonai_memory",
    description: "Benson AI记忆存储"
  },
  {
    binding: "trea_memory",
    description: "Trea系统记忆存储"
  },
  {
    binding: "JEVPI",
    description: "JEV插件接口数据存储"
  },
  {
    binding: "R2_BUCKET",
    description: "R2存储桶（已绑定）"
  }
];

console.log("=== JEV Worker KV命名空间绑定说明 ===");
console.log("请按照以下步骤操作：");
console.log("1. 登录Cloudflare Dashboard");
console.log("2. 导航至 Workers & Pages → jevshop → 设置 → 变量与绑定");
console.log("3. 在KV命名空间绑定部分添加以下绑定：");
console.log("");

REQUIRED_KV_BINDINGS.forEach(kv => {
  console.log(`- 绑定名称: ${kv.binding}`);
  console.log(`  描述: ${kv.description}`);
  console.log(`  操作: ${kv.binding === "R2_BUCKET" ? "已绑定" : "需要创建并绑定"}`);
  console.log("");
});

console.log("4. 添加完成后，点击'保存并重新部署'");
console.log("5. 部署完成后，测试以下端点：");
console.log("   - https://jevshop.bensonlove1986.workers.dev/kv/test");
console.log("   - https://jevshop.bensonlove1986.workers.dev/status");

module.exports = { REQUIRED_KV_BINDINGS };