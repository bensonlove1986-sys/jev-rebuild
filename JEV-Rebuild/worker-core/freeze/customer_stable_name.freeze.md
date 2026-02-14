# CUSTOMER STABLE_NAME CONTRACT FREEZE

## 1. STABLE_NAME 生成来源

### 来源优先级

| 来源 | 优先级 | 适用场景 |
|------|-------|---------|
| 新提供的 displayName（非ID） | 1 | 当新消息或请求提供了有效的非ID名称时 |
| 现有档案中的 stable_name | 2 | 当档案中已有稳定名称时 |
| 现有档案中的 display_name | 3 | 当档案中没有 stable_name 但有 display_name 时 |
| 现有档案中的 customer_name | 4 | 当档案中没有 stable_name 和 display_name 但有 customer_name 时 |
| 现有档案中的 real_name | 5 | 当档案中没有 stable_name、display_name 和 customer_name 但有 real_name 时 |
| 回退到 customer_id | 6 | 当所有其他来源都不可用时 |

### 生成逻辑

```javascript
// stable_name 生成逻辑
const resolvedStableName = displayName !== customerId ? displayName : 
  existingProfile?.stable_name || 
  existingProfile?.display_name || 
  existingProfile?.customer_name || 
  existingProfile?.real_name || 
  displayName;
```

## 2. STABLE_NAME 写入/读取/聚合规则

### 写入规则

1. **写入时机**：
   - 每次收到新的客户消息时
   - 每次发送消息前
   - 每次更新客户资料时

2. **写入条件**：
   - 当 resolvedStableName 有值且与旧值不同时
   - 写入 KV（或现有 profile store）

3. **写入格式**：
   ```javascript
   const customerProfile = {
     ...existingProfile,
     stable_name: resolvedStableName,
     // 其他字段...
   };
   ```

4. **必须打印的日志**：
   - `[PROFILE_NAME_RESOLVED]`：包含 customer_id, stable_name, source_field
   - `[PROFILE_WRITE_OK]`：包含 customer_id, stable_name

### 读取规则

1. **读取来源**：
   - 优先从 KV 读取完整的客户 profile
   - 确保返回的 profile 包含 stable_name 字段

2. **安全处理**：
   - 确保 stable_name 永远是字符串类型
   - 确保 stable_name 不为 undefined

### 聚合规则

1. **customers 聚合接口**：
   - `/api/inbox/customers` 必须返回 stable_name 字段（即使为空）
   - 确保所有返回的客户对象都包含 stable_name

2. **返回格式**：
   ```json
   {
     "customers": [
       {
         "customer_id": "string",
         "stable_name": "string",
         "display_name": "string",
         "customer_name": "string",
         "real_name": "string",
         // 其他字段...
       }
     ],
     "single_world": true
   }
   ```

3. **必须打印的日志**：
   - `[CUSTOMERS_AGG_SAMPLE]`：包含第一个客户的 customer_id, stable_name, customer_name, real_name, display_name

## 3. 回归检查点

### 检查点 1：刷新不丢

| 场景 | 预期结果 | 验证方法 |
|------|---------|---------|
| 客户发送消息后刷新页面 | UI 仍显示相同的 stable_name | 1. 客户发送消息<br>2. 刷新页面<br>3. 检查客户列表中的名称是否保持一致 |

### 检查点 2：列表与聊天一致

| 场景 | 预期结果 | 验证方法 |
|------|---------|---------|
| 点击客户列表中的客户 | 聊天顶部显示的名称与列表中一致 | 1. 查看客户列表<br>2. 点击某个客户<br>3. 检查聊天顶部的名称是否与列表中一致 |

### 检查点 3：稳定返回

| 场景 | 预期结果 | 验证方法 |
|------|---------|---------|
| 多次调用 `/api/inbox/customers` | 相同客户的 stable_name 保持一致 | 1. 多次调用 API<br>2. 检查返回的 stable_name 是否一致 |

### 检查点 4：支持图片消息

| 场景 | 预期结果 | 验证方法 |
|------|---------|---------|
| 发送纯图片消息 | 不返回 500 错误 | 1. 在 UI 发送纯图片<br>2. 检查是否返回 500 错误<br>3. 检查日志中是否有 `[OUTBOUND_CHANNEL_RESOLVED]` 和 `[OUTBOUND_DAOJIE_PAYLOAD]` |

### 检查点 5：支持文本消息

| 场景 | 预期结果 | 验证方法 |
|------|---------|---------|
| 发送纯文本消息 | 不返回 500 错误 | 1. 在 UI 发送纯文本<br>2. 检查是否返回 500 错误<br>3. 检查日志中是否有 `[OUTBOUND_CHANNEL_RESOLVED]` 和 `[OUTBOUND_DAOJIE_PAYLOAD]` |

## 4. 日志规范

### 必须打印的日志

| 日志名称 | 打印时机 | 内容 |
|---------|---------|------|
| `PROFILE_NAME_RESOLVED` | 生成 stable_name 后 | `{customer_id, stable_name, source_field}` |
| `PROFILE_WRITE_OK` | 成功写入 profile 后 | `{customer_id, stable_name}` |
| `PROFILE_SNAPSHOT` | 生成 profile 后 | `{stable_name, display_name, profile_keys}` |
| `CUSTOMERS_AGG_SAMPLE` | 返回 customers 列表前 | `first={customer_id, stable_name, customer_name, real_name, display_name}` |

## 5. 错误处理

### 稳定名称缺失处理

- 即使在极端情况下，stable_name 字段也必须存在
- 允许 stable_name 为空字符串，但不允许为 undefined
- 不允许将 customer_id 作为 stable_name，除非万不得已

### 日志错误处理

- 所有与 profile 相关的错误必须打印详细日志
- 错误日志必须包含 customer_id
- 错误日志必须包含错误原因

## 6. 部署验证

### 部署后验证步骤

1. **API 健康检查**：
   ```bash
   curl https://jev-rebuild-worker.bensonlove1986.workers.dev/api/health
   ```
   - 预期结果：返回 200 OK

2. **客户列表检查**：
   ```bash
   curl https://jev-rebuild-worker.bensonlove1986.workers.dev/api/inbox/customers
   ```
   - 预期结果：返回包含 stable_name 字段的客户列表

3. **发送消息检查**：
   - 在 UI 发送纯文本消息
   - 在 UI 发送纯图片消息
   - 预期结果：不返回 500 错误
   - 预期结果：日志中出现 `[OUTBOUND_CHANNEL_RESOLVED]` 和 `[OUTBOUND_DAOJIE_PAYLOAD]`
