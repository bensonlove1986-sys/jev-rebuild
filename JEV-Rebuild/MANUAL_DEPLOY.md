# Cloudflare Worker 手动部署指南

## 任务目标
确保最新 inbound-message 写入逻辑部署到真正承载 Daojie Webhook 的 Cloudflare Worker 实体。

## 一、代码检查与确认

### 1.1 确认 Worker 入口文件

文件：`worker-core/src/index.js`

### 1.2 验证核心功能已实现

✅ **/api/inbound/daojie** 端点已实现：
- 正确解析 `customer_name` 和 `company` 字段
- 按照优先级 `customer_name > company > customer_id` 提取 `display_name`
- 实现了 `display_name` 持久化存储
- 添加了 `[INBOX_MSG_WRITE]` 日志输出

✅ **/api/inbox/pull** 端点已实现：
- 从 KV 和内存存储读取消息
- 支持 `customer_id` 参数过滤
- 返回正确的消息格式

✅ **/api/inbox/customers** 端点已实现：
- 从消息存储反向聚合客户
- 支持按 `last_message_at` 排序
- 过滤掉测试客户

✅ **CORS 配置** 已实现：
- 添加了 `Access-Control-Allow-Origin: *` 等必要 CORS 头
- 支持 OPTIONS 预检请求

## 二、手动部署步骤

### 2.1 登录 Cloudflare Dashboard

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择您的账户
3. 导航到 **Workers & Pages**

### 2.2 选择目标 Worker

1. 找到名为 `jev-rebuild-worker` 的 Worker
2. 点击 **Quick Edit** 进入编辑界面

### 2.3 替换 Worker 代码

1. 删除现有代码
2. 复制 `worker-core/src/index.js` 的完整内容
3. 粘贴到 Cloudflare Worker 编辑器中
4. 点击 **Save and Deploy** 按钮

### 2.4 验证部署

1. 部署成功后，您将看到 "Successfully deployed worker." 消息
2. 复制生成的 Worker URL（如 `https://jev-rebuild-worker.bensonlove1986.workers.dev`）

## 三、部署后验证

### 3.1 测试 Daojie Webhook

1. 使用 curl 或 Postman 发送测试请求：

```bash
curl -X POST "https://jev-rebuild-worker.bensonlove1986.workers.dev/api/inbound/daojie" \
  -H "Content-Type: application/json" \
  -d '{"contact":{"id":"test_customer_123"},"text":"测试消息","customer_name":"测试客户","company":"测试公司","type":"inbound-message"}'
```

2. 预期响应：
```json
{"success":true,"message_id":"...","trace_id":"..."}
```

### 3.2 验证 Cloudflare Logs

1. 返回到 Cloudflare Dashboard 的 `jev-rebuild-worker` 页面
2. 点击 **Logs** 标签
3. 查找包含 `[INBOX_MSG_WRITE]` 的日志条目
4. 确认日志中包含正确的 `customer_id` 和 `text_length`

### 3.3 验证 /api/inbox/pull 端点

1. 使用 curl 或 Postman 发送请求：

```bash
curl -X GET "https://jev-rebuild-worker.bensonlove1986.workers.dev/api/inbox/pull?customer_id=test_customer_123"
```

2. 预期响应：
```json
{"messages":[{"id":"...","customer_id":"test_customer_123","display_name":"测试客户","text":"测试消息","...":"..."}],"cursor":...,"hasMore":false}
```

### 3.4 验证 /api/inbox/customers 端点

1. 使用 curl 或 Postman 发送请求：

```bash
curl -X GET "https://jev-rebuild-worker.bensonlove1986.workers.dev/api/inbox/customers"
```

2. 预期响应：
```json
{"ok":true,"customers":[{"customer_id":"test_customer_123","display_name":"测试客户","status":"active","last_message_at":...}]}
```

## 四、故障排除

### 4.1 部署失败

- **问题**：部署时出现语法错误
- **解决方案**：检查 `worker-core/src/index.js` 中的语法，确保没有遗漏括号或分号

### 4.2 Webhook 响应错误

- **问题**：发送测试请求后返回 500 错误
- **解决方案**：
  1. 检查 Cloudflare Logs 中的错误信息
  2. 确保 KV 绑定 `MESSAGES_KV` 和 `CUSTOMER_PROFILE_KV` 已正确配置
  3. 验证 `display_name` 提取逻辑是否正确处理了所有字段情况

### 4.3 消息不显示在 /api/inbox/pull 中

- **问题**：发送测试消息后，/api/inbox/pull 返回空消息列表
- **解决方案**：
  1. 检查 Cloudflare Logs 中是否有 `[INBOX_MSG_WRITE]` 日志
  2. 确认 `customer_id` 参数是否与发送测试消息时使用的 `contact.id` 一致
  3. 检查消息过滤逻辑是否正确

### 4.4 客户列表不显示

- **问题**：/api/inbox/customers 返回空列表
- **解决方案**：
  1. 检查消息是否已成功写入 KV
  2. 验证客户聚合逻辑是否正确从消息中提取客户信息
  3. 确认没有测试客户过滤规则将真实客户过滤掉

## 五、部署完成标志

当以下条件全部满足时，部署完成：

✅ Cloudflare Logs 中出现 `[INBOX_MSG_WRITE]` 日志
✅ /api/inbox/pull 返回 `messages.length > 0`
✅ /api/inbox/customers 返回包含测试客户的列表
✅ Daojie Webhook 测试请求返回 200 成功响应

## 六、后续维护

### 6.1 代码更新

1. 修改 `worker-core/src/index.js` 中的代码
2. 按照本指南重新执行手动部署步骤
3. 验证部署结果

### 6.2 监控与日志

1. 定期检查 Cloudflare Logs 中的 `[INBOX_MSG_WRITE]` 日志
2. 监控 Daojie Webhook 调用成功率
3. 定期验证 `/api/inbox/customers` 和 `/api/inbox/pull` 端点返回数据

## 七、紧急回滚

如果部署后出现问题，可通过以下步骤回滚：

1. 登录 Cloudflare Dashboard
2. 进入 `jev-rebuild-worker` 页面
3. 点击 **Versions** 标签
4. 选择之前的稳定版本
5. 点击 **Deploy** 按钮进行回滚
6. 验证回滚结果

---

**部署完成后输出：**
```
《L10-INBOUND-MESSAGE-WRITE-UNLOCKED》
```