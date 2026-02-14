# Cloudflare Worker API 部署指南

本指南介绍如何使用 Cloudflare API 部署 Modules Worker，无需依赖 Wrangler CLI。

## 前提条件

1. **Cloudflare 账号** - 拥有 Cloudflare 账号
2. **Account ID** - 可在 Cloudflare 控制台获取
3. **API Token** - 具有 Workers 编辑权限的 API Token
4. **Node.js** - 已安装 Node.js 18.x 或更高版本

## 生成 Cloudflare API Token

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 点击右上角头像 → **My Profile**
3. 选择左侧菜单 **API Tokens**
4. 点击 **Create Token**
5. 选择 **Edit Cloudflare Workers** 模板
6. 确保权限包含：
   - Account: Workers Scripts - Edit
   - Account: Workers KV Storage - Edit（如需）
7. 点击 **Continue to summary**
8. 点击 **Create Token**
9. 保存生成的 API Token（仅显示一次）

## 获取 Cloudflare Account ID

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 点击右上角头像 → **My Profile**
3. 在 **Account ID** 部分点击 **Copy**

## 部署步骤

### 方法一：使用环境变量（推荐）

1. 在命令行中设置环境变量：
   ```bash
   # Windows (CMD)
   set CF_ACCOUNT_ID=你的AccountID
   set CF_API_TOKEN=你的APIToken
   
   # Windows (PowerShell)
   $env:CF_ACCOUNT_ID="你的AccountID"
   $env:CF_API_TOKEN="你的APIToken"
   
   # Linux/macOS
   export CF_ACCOUNT_ID=你的AccountID
   export CF_API_TOKEN=你的APIToken
   ```

2. 执行部署脚本：
   ```bash
   npm run deploy:api
   ```

### 方法二：交互式输入

直接执行部署脚本，根据提示输入 Account ID 和 API Token：

```bash
npm run deploy:api
```

## 部署脚本说明

### 脚本功能

- ✅ 自动读取 Worker 代码文件
- ✅ 支持 Modules Worker 部署
- ✅ 自动验证部署结果
- ✅ 显示部署状态和结果
- ✅ 支持环境变量配置

### 脚本配置

脚本配置位于 `deploy-via-api.js` 文件中的 `CONFIG` 对象：

```javascript
const CONFIG = {
  ACCOUNT_ID: process.env.CF_ACCOUNT_ID || '',
  API_TOKEN: process.env.CF_API_TOKEN || '',
  WORKER_NAME: 'jev-rebuild-worker',
  SCRIPT_NAME: 'index.js',
  BINDINGS: [],
  COMPATIBILITY_DATE: '2024-12-01',
  WORKERS_API_URL: 'https://api.cloudflare.com/client/v4'
};
```

### 支持的部署参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `WORKER_NAME` | Worker 名称 | `jev-rebuild-worker` |
| `SCRIPT_NAME` | 主脚本文件名 | `index.js` |
| `COMPATIBILITY_DATE` | 兼容日期 | `2024-12-01` |
| `BINDINGS` | Worker 绑定 | `[]` |

## 验证部署

部署成功后，脚本会自动验证 Worker 健康状态。你也可以手动验证：

```bash
# 检查健康状态
curl https://jev-rebuild-worker.workers.dev/api/health

# 检查状态
curl https://jev-rebuild-worker.workers.dev/api/status
```

## 部署示例

### 成功部署输出

```
🚀 开始通过 Cloudflare API 部署 Worker...
📦 Worker 名称: jev-rebuild-worker
📅 兼容日期: 2024-12-01
✅ Worker 部署成功!
📌 部署 ID: a1b2c3d4e5f6g7h8i9j0
🌐 Worker URL: https://jev-rebuild-worker.workers.dev
🎉 部署完成!

🔍 验证部署...
🌐 测试 URL: https://jev-rebuild-worker.workers.dev/api/health
✅ 部署验证成功!
📊 健康检查结果: { ok: true, status: 'healthy' }
```

## 故障排除

### 常见错误及解决方案

1. **缺少 API Token**
   ```
   ❌ 缺少必要的配置参数
   ```
   - 确保已设置环境变量或交互式输入了 API Token

2. **API Token 权限不足**
   ```
   ❌ Worker 部署失败!
   错误信息: [{ code: 10000, message: "Invalid API Token permissions" }]
   ```
   - 重新生成 API Token，确保包含 Workers 编辑权限

3. **Account ID 错误**
   ```
   ❌ Worker 部署失败!
   错误信息: [{ code: 10006, message: "Account not found" }]
   ```
   - 检查 Account ID 是否正确

4. **网络连接问题**
   ```
   ❌ 部署过程中发生错误:
   request to https://api.cloudflare.com/... failed, reason: connect ECONNREFUSED
   ```
   - 检查网络连接
   - 暂时关闭代理或防火墙

## 安全注意事项

1. **API Token 保护** - 不要将 API Token 硬编码到代码中
2. **环境变量** - 使用环境变量存储敏感信息
3. **最小权限原则** - API Token 仅授予必要的权限
4. **定期轮换** - 定期更换 API Token 以提高安全性

## 与 Wrangler CLI 部署的区别

| 特性 | API 部署 | Wrangler CLI |
|------|----------|--------------|
| 依赖 | 仅 Node.js | 需要 Wrangler CLI |
| 配置 | 环境变量或交互式 | wrangler.toml |
| 部署速度 | 更快 | 较慢（包含构建过程） |
| 适用场景 | CI/CD、自动化部署 | 本地开发、手动部署 |
| 兼容性 | 仅支持 Modules Worker | 支持所有 Worker 类型 |

## CI/CD 集成

API 部署脚本非常适合集成到 CI/CD 流程中：

### GitHub Actions 示例

```yaml
name: Deploy Worker via API

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    - run: cd worker-core && npm install
    - name: Deploy Worker
      env:
        CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
        CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
      run: cd worker-core && npm run deploy:api
```

## 版本控制

每次部署都会生成一个唯一的部署 ID，可在 Cloudflare 控制台查看和管理所有部署版本。

## 回滚部署

如需回滚到之前的版本，可在 Cloudflare 控制台：

1. 进入 **Workers & Pages** → **你的 Worker**
2. 选择 **Deployments** 标签
3. 找到需要回滚的版本
4. 点击 **Rollback**

## 结论

使用 Cloudflare API 部署 Worker 是一种灵活、高效的部署方式，特别适合自动化部署和 CI/CD 流程。本指南提供了详细的步骤和说明，帮助你快速上手 API 部署。

如果遇到问题，请查看 [Cloudflare API 文档](https://api.cloudflare.com/) 或联系 Cloudflare 支持。
