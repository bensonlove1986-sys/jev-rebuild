# JEV 全局状态快照回滚说明

## 快照信息

- **快照文件**: jev_global_snapshot_L10_PROD_20251220_141500.json
- **快照时间**: 2025-12-20T14:15:00Z
- **适用环境**: PROD
- **模式**: L10

## 快照适用条件

- 当系统出现数据不一致、路由失效、UI无法显示消息等严重问题时
- 当新部署的代码导致核心功能失效时
- 当需要回滚到已知稳定状态时
- 禁止在正常运行状态下使用

## 回滚步骤

### 1. Worker 回滚

```bash
# 1. 确保当前目录为 worker-core
cd D:\PDF转网页\JEV-Rebuild\worker-core

# 2. 使用 wrangler 回滚到指定版本
npx wrangler deploy --version-id <version-id>

# 3. 验证部署是否成功
curl https://jev-rebuild-worker.bensonlove1986.workers.dev/api/health
```

### 2. UI 回滚

```bash
# 1. 确保当前目录为 ui-core/app
cd D:\PDF转网页\JEV-Rebuild\ui-core\app

# 2. 确保 API_BASE_URL 指向生产环境
# 修改文件: utils/fetchSafe.js
# export const API_BASE_URL = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';

# 3. 重启 UI 开发服务器
npm run dev
```

### 3. KV 数据恢复（可选）

```bash
# KV 数据恢复需要 Cloudflare API 或 Wrangler CLI
# 注意：KV 数据恢复可能导致数据丢失，建议谨慎操作

# 1. 使用 wrangler KV 导出当前数据（可选，用于备份）
npx wrangler kv:export --namespace-id 8de063433e924133a4a4f71a5f31a089 --format json kv_backup.json

# 2. 使用 wrangler KV 导入快照数据（可选，风险操作）
npx wrangler kv:import --namespace-id 8de063433e924133a4a4f71a5f31a089 kv_snapshot.json
```

## 不可回滚项

1. 已删除的 KV 数据
2. 已触发的 webhook 事件
3. 已发送的消息
4. 已生成的日志
5. 已修改的外部系统状态

## 验证 Checklist

### 1. 基本功能验证

- [ ] `GET /api/health` 返回 200 OK
- [ ] `GET /api/status` 返回正确的状态信息
- [ ] `GET /api/inbox/customers` 返回客户列表
- [ ] `GET /api/inbox/pull?customer_id=gakcvf3msauchq2dter9` 返回消息列表

### 2. 真实消息验证

- [ ] UI 左侧 customers 列表显示真实客户
- [ ] 点击客户后显示真实 Daojie 消息
- [ ] 消息内容包含预期文本
- [ ] display_name 正确显示

### 3. 自动拉取验证

- [ ] UI 自动拉取新消息（每 3 秒）
- [ ] 新消息自动显示在聊天窗口
- [ ] 客户列表自动更新

### 4. 翻译功能验证

- [ ] 翻译按钮可正常点击
- [ ] 翻译结果正确显示
- [ ] 翻译功能不影响核心聊天功能

## 紧急联系人

- 系统管理员：admin@example.com
- 技术支持：support@example.com

## 注意事项

1. 回滚操作可能导致数据丢失，请谨慎操作
2. 回滚前建议备份当前数据
3. 回滚后请立即验证核心功能
4. 如有问题，请立即联系技术支持

---

**快照状态**: 稳定可恢复
**最后验证时间**: 2025-12-20T14:15:00Z
**验证结果**: 所有功能正常
