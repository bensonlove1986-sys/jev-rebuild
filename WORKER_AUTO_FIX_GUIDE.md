# JEV Worker 自动环境修复系统使用指南

## 📋 功能概述

这个增强版Worker实现了以下核心功能：

✅ **自动环境检测** - 通过 `/status` 端点检查所有必要的KV命名空间和R2存储桶
✅ **自动环境修复** - 通过 `/auto-env` 端点自动创建缺失的KV命名空间
✅ **完整端点支持** - 包含 `/ping`、`/kv/test`、`/invite`、`/sync` 等核心端点
✅ **详细报告生成** - 提供环境健康状况的完整JSON报告
✅ **KV/R2全面测试** - 自动测试所有存储组件的读写功能

## 🚀 快速开始

### 1. 配置准备

1. 更新 `wrangler.toml` 文件中的以下信息：
   - 确保 `ACCOUNT_ID` 已正确设置为你的Cloudflare账户ID
   - **重要**: 将 `CF_API_TOKEN` 设置为具有KV写入权限的Cloudflare API Token
   - 确保所有API密钥已更新为安全值

2. 获取Cloudflare API Token：
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 导航到 `My Profile > API Tokens`
   - 创建新令牌，至少需要 `Account > Workers KV Storage > Edit` 权限
   - 复制生成的令牌并更新到配置中

### 2. 部署Worker

使用以下命令部署Worker：

```bash
wrangler deploy
```

### 3. 一句话部署提示词

执行以下命令或访问对应URL，让Worker自动完成所有环境设置：

```
让 Worker 自修复并注册所有系统端点
```

具体来说，执行：

```bash
curl -X GET https://jevshop.YOUR_SUBDOMAIN.workers.dev/auto-env
```

## 🔧 核心端点说明

### `/ping` - 健康检查

```bash
curl -X GET https://jevshop.YOUR_SUBDOMAIN.workers.dev/ping
```

**响应示例：**
```json
{
  "success": true,
  "message": "pong",
  "timestamp": "2025-11-08T10:00:00.000Z"
}
```

### `/status` - 环境状态检查

```bash
curl -X GET https://jevshop.YOUR_SUBDOMAIN.workers.dev/status
```

**响应示例：**
```json
{
  "success": true,
  "message": "✅ 环境齐全",
  "missing": [],
  "report": {
    "timestamp": "2025-11-08T10:00:00.000Z",
    "status": "healthy",
    "components": {
      "kv": {
        "JEV_AI_CACHE": "已绑定",
        "JEV_LOGS": "已绑定",
        "JEV_GLOBAL_CONFIG": "已绑定",
        "JEV_PLUGIN_STATE": "已绑定"
      },
      "r2": {
        "available": true
      },
      "vars": {
        "DAOJIE_API_KEY": "已配置",
        "ACCOUNT_ID": "已配置",
        "CF_API_TOKEN": "已配置"
      }
    },
    "issues": [],
    "suggestions": []
  }
}
```

### `/auto-env` - 自动修复环境

```bash
curl -X GET https://jevshop.YOUR_SUBDOMAIN.workers.dev/auto-env
```

**响应示例：**
```json
{
  "check": {
    "success": false,
    "message": "❌ 环境缺失",
    "missing": ["JEV_AI_CACHE", "JEV_LOGS"]
  },
  "fix": {
    "success": true,
    "message": "🔧 自动修复完成",
    "fixed": ["JEV_AI_CACHE", "JEV_LOGS"],
    "totalMissing": 2,
    "fixedCount": 2
  },
  "finalStatus": "修复完成"
}
```

### `/kv/test` - KV和R2存储测试

```bash
curl -X GET https://jevshop.YOUR_SUBDOMAIN.workers.dev/kv/test
```

**响应示例：**
```json
{
  "success": true,
  "kv": {
    "JEV_AI_CACHE": { "success": true },
    "JEV_LOGS": { "success": true },
    "JEV_GLOBAL_CONFIG": { "success": true },
    "JEV_PLUGIN_STATE": { "success": true },
    "R2_BUCKET": { "success": true }
  }
}
```

### `/invite` - 邀请注册

```bash
curl -X POST https://jevshop.YOUR_SUBDOMAIN.workers.dev/invite \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "测试用户"}'
```

**响应示例：**
```json
{
  "success": true,
  "message": "邀请已发送",
  "email": "user@example.com",
  "name": "测试用户"
}
```

### `/sync` - 数据同步

```bash
curl -X GET https://jevshop.YOUR_SUBDOMAIN.workers.dev/sync
```

**响应示例：**
```json
{
  "success": true,
  "message": "同步成功",
  "timestamp": "2025-11-08T10:00:00.000Z",
  "sync_type": "full"
}
```

### `/system/info` - 系统信息

```bash
curl -X GET https://jevshop.YOUR_SUBDOMAIN.workers.dev/system/info
```

**响应示例：**
```json
{
  "worker": "JEV Auto-Fix Worker",
  "version": "1.0.0",
  "features": ["环境自动检测", "KV自动创建", "健康检查", "邀请注册", "数据同步"],
  "endpoints": ["/ping", "/status", "/auto-env", "/kv/test", "/invite", "/sync", "/system/info"]
}
```

## 🔍 故障排除

### 常见问题

1. **自动修复失败**
   - 检查 `CF_API_TOKEN` 是否具有正确的权限
   - 确保 `ACCOUNT_ID` 正确设置
   - 检查Cloudflare账户是否有创建KV命名空间的权限

2. **环境检测显示缺失**
   - 检查KV命名空间ID是否在wrangler.toml中正确配置
   - 确保R2存储桶已在Cloudflare中创建
   - 部署后等待几分钟，绑定可能需要时间生效

3. **API密钥验证失败**
   - 确保所有API密钥已更新为非默认值
   - 检查.env文件和wrangler.toml中的密钥是否一致

## 📊 最佳实践

1. **定期检查环境** - 建议每周运行一次 `/status` 检查
2. **安全存储API令牌** - 不要将CF_API_TOKEN提交到版本控制系统
3. **备份配置** - 定期备份wrangler.toml和.env文件
4. **监控端点访问** - 设置Cloudflare Analytics监控API访问情况
5. **定期更新API密钥** - 每3-6个月轮换一次所有API密钥

## 📝 更新日志

**v1.0.0** - 初始版本
- 实现自动环境检测和修复
- 支持所有核心端点
- 添加详细报告生成功能

---

**提示：** 部署成功后，只需执行一次 `/auto-env`，然后通过 `/status` 确认环境已准备就绪。之后即可正常使用所有JEV系统功能。