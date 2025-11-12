# JEV Worker 存储绑定使用指南

## 📋 概述

本文档详细介绍了JEV智能客服系统中Cloudflare Worker的存储绑定配置与使用方法，包括：

- **KV命名空间绑定**：`jevui`（UI状态存储）和`MEM_STORE`（内存状态存储）
- **R2存储桶绑定**：`R2_BUCKET`（文件存储）
- **接口使用方法**：KV读写、R2上传等功能的API调用方式
- **配置与部署**：本地开发和生产环境的配置说明
- **测试与验证**：如何测试绑定是否正常工作

## 🚀 Worker架构设计

### 存储层结构

JEV系统采用三层存储架构：

| 存储类型 | 命名空间 | 用途 | 特性 |
|---------|---------|------|------|
| KV | `jevui` | UI状态、控制面板配置、用户偏好 | 持久化存储，适合配置类数据 |
| KV | `MEM_STORE` | Agent状态、连接心跳、运行时缓存 | 临时数据，高频读写优化 |
| R2 | `R2_BUCKET` | 图片、文件、识别结果、日志备份 | 大容量文件存储，支持CDN分发 |

## 🔧 配置说明

### 1. Cloudflare控制台配置

登录Cloudflare控制台，为您的Worker添加以下绑定：

#### KV命名空间创建与绑定

1. 导航至 **Workers & Pages** > **KV** > **创建命名空间**
2. 创建两个命名空间：
   - 名称：`jev-ui-state`（或您喜欢的名称）
   - 名称：`jev-mem-store`
3. 导航至您的Worker > **设置** > **变量** > **KV命名空间绑定**
4. 添加绑定：
   - 变量名：`jevui`，选择对应命名空间
   - 变量名：`MEM_STORE`，选择对应命名空间

#### R2存储桶创建与绑定

1. 导航至 **R2** > **创建存储桶**
2. 创建存储桶：名称 `jev-images`（如果需要公开访问，请启用公共访问）
3. 导航至您的Worker > **设置** > **变量** > **R2存储桶绑定**
4. 添加绑定：
   - 变量名：`R2_BUCKET`
   - 存储桶：选择创建的`jev-images`
   - 选项：勾选"允许 Worker 读取和写入对象"

### 2. Wrangler配置文件

本地开发时，使用`wrangler.toml`配置文件：

```toml
# KV命名空间绑定
kv_namespaces = [
  {
    binding = "jevui",
    id = "your-jevui-namespace-id",  # 替换为实际ID
    preview_id = "your-jevui-namespace-id"
  },
  {
    binding = "MEM_STORE",
    id = "your-mem-store-namespace-id",  # 替换为实际ID
    preview_id = "your-mem-store-namespace-id"
  }
]

# R2存储桶绑定
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "jev-images"
preview_bucket_name = "jev-images"
```

## 📡 API接口文档

### 1. 系统状态接口

#### GET /status

获取Worker存储绑定状态和KV统计信息

**响应示例**：
```json
{
  "success": true,
  "data": {
    "bindings": {
      "jevui": true,
      "MEM_STORE": true,
      "R2_BUCKET": true
    },
    "ui_kv": {
      "count": 5,
      "example_keys": ["ui:config", "ui:theme"]
    },
    "mem_kv": {
      "count": 10,
      "example_keys": ["agent:1:status", "agent:2:status"]
    },
    "timestamp": 1716000000000
  }
}
```

### 2. UI状态接口

#### GET /ui

获取所有UI状态配置

**响应示例**：
```json
{
  "success": true,
  "data": {
    "ui:config": { "theme": "dark", "sidebar": true },
    "ui:theme": { "primary": "#007bff", "mode": "dark" }
  }
}
```

#### POST /ui

更新UI状态配置

**请求体**：
```json
{
  "ui:config": { "theme": "light", "sidebar": false }
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "UI状态更新成功",
  "updated": ["ui:config"]
}
```

### 3. KV通用操作接口

#### POST /kv/set

设置KV键值

**请求体**：
```json
{
  "key": "config:settings",
  "value": { "option1": true, "option2": "value" },
  "store": "ui"  // 可选: "ui" 或 "mem"
}
```

#### GET /kv/get

获取KV键值

**参数**：
- `key`: 键名
- `store`: 存储类型 ("ui" 或 "mem")

**请求URL示例**：
`/kv/get?key=config:settings&store=ui`

#### GET /kv/list

列出KV键名

**参数**：
- `store`: 存储类型 ("ui" 或 "mem")
- `prefix`: 前缀过滤（可选）

#### GET /kv/del

删除KV键值

**参数**：
- `key`: 键名
- `store`: 存储类型 ("ui" 或 "mem")

### 4. R2文件操作接口

#### POST /upload

上传文件到R2存储桶

**请求**：
- 方法：`POST`
- 内容类型：`multipart/form-data`
- 表单字段：`file`（文件对象）

**响应示例**：
```json
{
  "success": true,
  "data": {
    "fileName": "example.jpg",
    "fileSize": 1024000,
    "fileType": "image/jpeg",
    "publicUrl": "https://pub-156ce03fffc59592e2b3b04dbc22aa6c.r2.dev/example.jpg",
    "uploadTime": 1716000000000
  }
}
```

#### GET /r2/:filename

获取R2存储桶中的文件

**参数**：
- `filename`: 文件名

**响应**：
- 成功：返回文件内容（正确的Content-Type）
- 失败：`{"success": false, "error": "File not found"}`

## 💻 本地开发与测试

### 1. 安装Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 配置开发环境

1. 登录Cloudflare账户：
   ```bash
   wrangler login
   ```

2. 更新`wrangler.toml`中的KV和R2配置

3. 本地开发服务器：
   ```bash
   wrangler dev --local
   ```

### 3. 使用测试脚本

使用提供的`test_worker_bindings.js`脚本测试所有功能：

```bash
# Node.js环境测试
node test_worker_bindings.js

# 或在浏览器中直接打开测试页面
```

## 🛠️ 集成示例代码

### 前端集成KV操作

```javascript
// 从UI KV读取配置
async function loadUIConfig() {
  try {
    const response = await fetch('https://jevshop.bensonlove1986.workers.dev/ui');
    const data = await response.json();
    if (data.success) {
      return data.data['ui:config'] || {};
    }
  } catch (error) {
    console.error('加载UI配置失败:', error);
  }
  return {};
}

// 保存UI配置到KV
async function saveUIConfig(config) {
  try {
    const response = await fetch('https://jevshop.bensonlove1986.workers.dev/ui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'ui:config': config })
    });
    return await response.json();
  } catch (error) {
    console.error('保存UI配置失败:', error);
    return { success: false, error: error.message };
  }
}
```

### Agent状态管理示例

```javascript
// 更新Agent状态
async function updateAgentStatus(agentId, status) {
  const payload = {
    key: `agent:${agentId}:status`,
    value: {
      id: agentId,
      status: status,
      lastUpdated: Date.now(),
      performance: { latency: 15, load: 0.3 }
    },
    store: 'mem' // 使用MEM_STORE
  };
  
  try {
    const response = await fetch('https://jevshop.bensonlove1986.workers.dev/kv/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('更新Agent状态失败:', error);
    return { success: false, error: error.message };
  }
}
```

## 📁 文件结构

```
d:\PDF转网页\
├── cloudflare_worker.js    # Cloudflare Worker主文件（已整合KV和R2绑定）
├── worker_integrated.js    # 完整的集成版本Worker
├── wrangler.toml           # Cloudflare配置文件
├── test_worker_bindings.js # 绑定测试脚本
├── WORKER_BINDINGS_README.md # 本说明文档
```

## 🔍 故障排查

### 常见问题与解决方案

1. **KV绑定失败**
   - 检查KV命名空间ID是否正确
   - 确认Worker有权限访问KV命名空间
   - 使用`/status`接口检查绑定状态

2. **R2上传失败**
   - 确认R2存储桶权限设置正确
   - 检查文件大小是否超过限制
   - 验证Worker与R2存储桶的绑定是否正确

3. **数据写入延迟**
   - KV写入可能有最多60秒的传播延迟
   - 读取操作可以立即看到最近的写入
   - 对于需要实时一致性的数据，考虑使用Durable Objects

### 调试技巧

1. **查看Worker日志**：Cloudflare控制台 > Workers > 日志
2. **检查KV内容**：直接在Cloudflare控制台查看KV键值
3. **测试R2访问**：使用公共URL或直接通过控制台查看上传的文件

## 📊 性能最佳实践

1. **KV使用建议**
   - 每个命名空间限制在10亿个键以内
   - 单个值大小限制为10MB
   - 频繁更新的数据使用MEM_STORE
   - 配置类数据使用jevui

2. **R2优化**
   - 使用适当的文件命名策略
   - 启用缓存控制头
   - 为静态内容配置CDN分发

3. **Worker优化**
   - 使用KV预加载减少延迟
   - 缓存频繁访问的数据
   - 避免在请求处理中执行耗时操作

## 🤝 与JEV控制面板集成

JEV控制面板v2.0已集成KV测试功能：

1. 访问 `kv_test_demo.html` 进行可视化测试
2. 使用 `core/kv_test.js` 模块自动检测KV连接
3. 通过 `API.kvGet/kvSet` 方法操作KV数据

## 📝 注意事项

1. **安全考量**
   - 不要在KV中存储敏感凭证
   - 重要数据考虑加密存储
   - 设置适当的CORS策略

2. **限制与配额**
   - 免费计划KV写入限制：每天100,000次
   - R2存储限制：根据您的Cloudflare计划
   - Worker请求限制：根据您的Cloudflare计划

3. **部署前检查**
   - 使用测试脚本验证所有绑定
   - 确认KV和R2的访问权限
   - 检查错误处理和重试机制

---

**版本**: L6.0.0  
**更新日期**: 2024年  
**所属系统**: JEV AI智能客服系统
