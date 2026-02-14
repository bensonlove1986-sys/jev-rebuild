# JEV Rebuild 部署指南

## 📋 部署选项

### 选项 1: GitHub Actions 自动部署 (推荐)

使用 GitHub Actions 可以解决本地网络问题，提供更稳定的部署环境。

#### 步骤 1: 准备 GitHub 仓库

1. 在 GitHub 上创建一个新仓库
2. 将项目代码推送到仓库

#### 步骤 2: 设置 GitHub Secrets

在 GitHub 仓库的 **Settings > Secrets and variables > Actions** 中添加以下密钥：

| 密钥名称 | 值 |
|---------|-----|
| `CLOUDFLARE_API_TOKEN` | `TFCN9t7EykA8OZkOezGPe4mMHBnAgcixLVvnlrdj` |
| `CLOUDFLARE_ACCOUNT_ID` | `156ce03fffc59592e2b3b04dbc22aa6c` |

#### 步骤 3: 触发部署

- **自动部署**: 推送代码到 `main` 分支
- **手动部署**: 进入 **Actions > Deploy Cloudflare Worker > Run workflow**

### 选项 2: 手动部署 (备选)

如果 GitHub Actions 不可用，可以尝试手动部署。

#### 步骤 1: 打包代码

```bash
# 进入 worker-core 目录
cd worker-core

# 打包代码
npx esbuild index.js --bundle --format=cjs --outfile=bundle.js
```

#### 步骤 2: 使用 Cloudflare Dashboard 部署

1. 访问 [Cloudflare Workers Dashboard](https://dash.cloudflare.com/)
2. 登录您的账户
3. 导航到 **Workers & Pages** > **Create Application**
4. 选择 **Create Worker**
5. 输入名称: `jev-rebuild-worker`
6. 点击 **Deploy**
7. 点击 **Edit Code**
8. 将 `bundle.js` 的内容复制粘贴到编辑器中
9. 点击 **Save and Deploy**

## 🌐 部署目标

部署后，应用将可通过以下 URL 访问：

- **Worker URL**: `https://jev-rebuild-worker.bensonlove1986.workers.dev`

## 🛠️ 故障排查

### 常见问题

1. **网络连接问题**
   - 症状: 部署超时或失败
   - 解决: 使用 GitHub Actions 或尝试更换网络环境

2. **ES 模块语法错误**
   - 症状: `Cannot use import statement outside a module`
   - 解决: 确保使用 `esbuild` 打包为 `cjs` 格式

3. **API Token 权限问题**
   - 症状: `401 Unauthorized` 或权限错误
   - 解决: 确保 API Token 具有 `workers:write` 权限

### 验证部署

部署后，可以通过以下命令验证：

```bash
# 检查健康状态
curl https://jev-rebuild-worker.bensonlove1986.workers.dev/api/health

# 检查版本信息
curl https://jev-rebuild-worker.bensonlove1986.workers.dev/api/version
```

## 📁 部署文件

- `.github/workflows/deploy.yml`: GitHub Actions 工作流配置
- `worker-core/bundle-and-deploy.js`: 自动化部署脚本
- `worker-core/deploy-with-retry.ps1`: PowerShell 部署脚本（带重试）

## 📝 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-02-15 | 初始部署配置 |
| 1.1 | 2026-02-15 | 添加 GitHub Actions 支持 |
| 1.2 | 2026-02-15 | 优化打包和部署流程 |

## 🎯 部署成功指标

部署成功后，以下功能应该可用：

- ✅ WebSocket 连接
- ✅ 消息收发
- ✅ 翻译功能
- ✅ OCR 图片识别
- ✅ DeepSeek AI 集成
- ✅ 媒体文件处理

## 💡 建议

1. **定期备份**: 定期备份 `worker-core/index.js` 文件
2. **监控**: 监控 Worker 的运行状态和错误日志
3. **版本控制**: 使用 Git 管理代码变更
4. **自动化**: 优先使用 GitHub Actions 实现自动化部署

## 📞 支持

如果遇到部署问题，请检查 Cloudflare Workers 文档或联系支持团队。
