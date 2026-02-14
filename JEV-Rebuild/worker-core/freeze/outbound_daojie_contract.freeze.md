# OUTBOUND DAOJIE CONTRACT FREEZE

## 1. OUTBOUND 入参兼容字段映射

### 核心入参映射规则

| 目标字段 | 兼容来源字段 | 默认值 | 优先级 |
|---------|-------------|-------|-------|
| `customer_id` | `customer_id` | 必填 | 1 |
|  | `customerId` |  | 2 |
|  | `to` |  | 3 |
|  | `contact_id` |  | 4 |
| `channel_id` | `channel_id` | 19 | 1 |
|  | `channelId` |  | 2 |
|  | `messageType` |  | 3 |
| `text` | `text` | "" | 1 |
|  | `message` |  | 2 |
| `image_url` | `image_url` | "" | 1 |
|  | `imageUrl` |  | 2 |
|  | `media_url` |  | 3 |
|  | `url` |  | 4 |
| `locationId` | `locationId` | `env.DAOJIE_LOCATION_ID` | 1 |

### 验证规则

| 场景 | 验证条件 | 错误码 | 错误信息 |
|------|---------|-------|---------|
| 缺少客户ID | `customer_id` 为空 | 400 | `customer_id is required` |
| 缺少内容 | `text` 和 `image_url` 均为空 | 400 | `text or image_url required` |

## 2. CHANNEL_ID 平台映射

### 固定映射规则

| channel_id | 平台 | replyType | replyChannel |
|-----------|------|-----------|--------------|
| 19 | WhatsApp | "WhatsApp" | "whatsapp" |
| 29 | Instagram | "Instagram" | "instagram" |

### 未知 channel_id 处理

- 任何不在上述列表中的 channel_id 都会被直接阻断
- 返回错误码：400
- 错误信息：`UNKNOWN_CHANNEL`

## 3. 图片发送规则

### 支持的图片格式

- 允许纯图片发送（`text` 为空但 `image_url` 非空）
- 允许图片+文字发送（`text` 作为图片描述）

### 图片消息结构

```json
{
  "customer_id": "string",
  "image_url": "string",
  "text": "string" // 可选，作为图片描述
}

## 4. 错误处理规则

### 400 错误

| 错误类型 | 描述 |
|---------|------|
| `INVALID_REQ` | 缺少必填字段或参数格式错误 |
| `UNKNOWN_CHANNEL` | 未知的 channel_id |

### 500 错误

- 所有 500 错误必须返回可读原因
- 错误响应格式：
  ```json
  {
    "ok": false,
    "error": "OUTBOUND_PROCESSING_ERROR",
    "message": "<可读原因>",
    "trace": "OUTBOUND_ERR_<timestamp>"
  }
  ```

## 5. 日志规范

### 必须打印的日志

| 日志名称 | 打印时机 | 内容 |
|---------|---------|------|
| `OUTBOUND_ENTRY` | 入口第一行 | 方法和路径名 |
| `OUTBOUND_REQ_BODY_KEYS` | 解析请求体后 | 请求体的所有键 |
| `OUTBOUND_REQ_CORE` | 解析请求体后 | 核心请求信息：customer_id, channel_id, text_len, image_url_present, message_id |
| `OUTBOUND_CHANNEL_RESOLVED` | channel_id 映射后 | channel_id, platform, channel |
| `OUTBOUND_DAOJIE_PAYLOAD` | 调用 Daojie 前 | 脱敏的 payload：type/channel/channel_id/to/text_len/image_url_present |
| `OUTBOUND_ERR` | 错误处理中 | 错误信息：name, message, stack_top, cause, dao_jie_status, dao_jie_body_snippet |
