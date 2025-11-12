# Cloudflare Worker 密钥配置指南

## 从纯文本到Cloudflare Secrets的迁移

您已将WEBHOOK_SECRET从纯文本配置更改为使用Cloudflare Secrets。这是一个很好的安全实践！以下是完整的配置指南：

## 推荐配置步骤

### 1. 在wrangler.toml中移除明文密钥

当前配置中，您的密钥仍然以明文形式存在：
```toml
WEBHOOK_SECRET = "jevindustry2025"
```

**推荐修改：**
1. 注释或删除这行明文配置
2. 添加注释说明该密钥现在通过Secrets管理

```toml
# WEBHOOK_SECRET 移至 Cloudflare Secrets 管理
# 使用 `wrangler secret put WEBHOOK_SECRET` 设置实际值
```

### 2. 使用Wrangler CLI设置Secrets

打开PowerShell终端并执行以下命令：

```powershell
# 进入项目目录
cd d:\PDF转网页

# 安装wrangler（如果尚未安装）
npm install -g wrangler

# 登录Cloudflare
wrangler login

# 设置WEBHOOK_SECRET
wrangler secret put WEBHOOK_SECRET
# 系统会提示您输入密钥值：jevindustry2025

# 设置WEBHOOK_SHARED_SECRET（如果也需要）
wrangler secret put WEBHOOK_SHARED_SECRET
# 系统会提示您输入密钥值：jevindustry2025
```

### 3. 更新worker.js代码中的密钥处理

确保worker.js代码能正确处理从Secrets获取的密钥：

```javascript
function getEnvVars(env) {
  // 从环境变量中获取密钥，Cloudflare会自动从Secrets中提供
  const WEBHOOK_SECRET = env.WEBHOOK_SECRET || 'jevindustry2025'; // 备用值（可选）
  // ...其他配置
  return { /* ... */ WEBHOOK_SECRET /* ... */ };
}
```

### 4. 重新部署Worker

```powershell
wrangler deploy
```

### 5. 验证配置

使用我们的连接测试工具验证配置是否正确：

1. 打开 `worker_connection_tester.js` 工具
2. 输入Worker URL: `https://jevshop.bensonlove1986.workers.dev`
3. 输入webhookSecret: `jevindustry2025`
4. 点击「测试连接」

## 安全最佳实践

1. **不要在代码库中存储敏感信息** - 始终使用Secrets或环境变量
2. **定期轮换密钥** - 建议每3-6个月更新一次密钥
3. **使用强密钥** - 使用随机生成的长字符串作为生产环境密钥
4. **限制密钥访问权限** - 只将密钥提供给需要的服务和人员

## 故障排除

如果配置后遇到授权问题：

1. 确认使用了正确的密钥值
2. 检查worker.js中获取密钥的代码是否正确
3. 验证Secrets是否成功设置：`wrangler secret list`
4. 确保重新部署了Worker以应用新的Secrets配置

## 检测工具的增强功能

我们的连接测试工具已更新，现在会自动处理使用Cloudflare Secrets存储的WEBHOOK_SECRET配置。工具会尝试使用提供的密钥进行身份验证，并在失败时提供具体的诊断信息。

---

需要进一步帮助或有任何问题，请随时联系支持团队。