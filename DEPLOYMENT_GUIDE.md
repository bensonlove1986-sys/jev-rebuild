# JEV Worker API 部署指南

## 📋 部署步骤

### 1️⃣ 打开 Cloudflare 控制台

访问 [Cloudflare Workers 控制台](https://dash.cloudflare.com/)

### 2️⃣ 选择 Worker

导航至 **Workers & Pages** → 选择 `jevshop.bensonlove1986.workers.dev`

### 3️⃣ 编辑代码

点击「编辑代码」，删除现有内容，粘贴 `worker_complete.js` 文件中的完整代码

### 4️⃣ 环境变量配置

确保以下环境变量已正确绑定：
- `jevui`: KV 命名空间 (用于UI状态)
- `MEM_STORE`: KV 命名空间 (用于内存存储)
- `R2_BUCKET`: R2 存储桶 (用于文件存储)

### 5️⃣ 保存并部署

点击「保存并部署」按钮

## ✅ 验证步骤

### 1️⃣ 验证基础连通性

在浏览器中访问：
```
https://jevshop.bensonlove1986.workers.dev/ping
```

**预期响应：**
```json
{
  "success": true,
  "message": "JEV Worker Online ✅",
  "kvs": {
    "jevui": true,
    "mem": true,
    "r2": true
  },
  "time": "2025-11-06T13:45:30.000Z"
}
```

### 2️⃣ 验证 KV 功能

访问：
```
https://jevshop.bensonlove1986.workers.dev/kv-test
```

**预期响应：**
```json
{
  "success": true,
  "message": "KV 测试成功",
  "value": "ok"
}
```

### 3️⃣ 验证 UI 状态存储

使用 curl 或 Postman 发送 POST 请求：
```
POST https://jevshop.bensonlove1986.workers.dev/ui
Content-Type: application/json

{
  "mode": "AI",
  "position": {"x": 100, "y": 300}
}
```

然后访问 GET 接口验证：
```
GET https://jevshop.bensonlove1986.workers.dev/ui
```

### 4️⃣ 验证 Agent 接口

注册一个测试 Agent：
```
POST https://jevshop.bensonlove1986.workers.dev/agents/register
Content-Type: application/json

{
  "agent_id": "test_agent_1",
  "name": "测试代理",
  "version": "1.0.0"
}
```

### 5️⃣ 验证 API 测试工具

打开 `jev_api_test.html`，点击「刷新所有测试」
- `/ping` 应显示 ✅
- `/kv-test` 应显示 ✅
- `/status` 应显示 ✅

## 🧩 通道验证矩阵

| 通道名称 | 依赖接口 | 验证方法 |
|---------|---------|--------|
| MonitorChannel | `/ping` `/status` | 浏览器直接访问 |
| AgentChannel | `/agents/register` `/agents/heartbeat` | 发送 POST 请求 |
| AuditChannel | `/log` `/ui` | 发送 POST 和 GET 请求 |
| TRAEChannel | `/log` `/status` | 发送日志并检查状态 |

## 🐛 常见问题排查

### 401 未授权错误
- 检查 KV 命名空间绑定是否正确
- 确保 Worker 有权限访问 KV 和 R2 资源

### 500 服务器错误
- 检查 KV 操作的异常处理
- 验证环境变量名称是否匹配

### R2 上传失败
- 确认 R2 存储桶权限设置
- 检查文件流处理逻辑

## 📝 注意事项

- 确保代码中的 R2 URL 格式正确
- 所有 JSON 响应使用标准格式
- 保留所有注释以提高可维护性
- 定期备份 Worker 代码和配置