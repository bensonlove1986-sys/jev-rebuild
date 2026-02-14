# LC/Daojie 图片发送方案 - 生产文档

## 设计决策

### 核心策略
- **图片=消息**：采用 JSON + base64 格式直接发送图片消息
- **统一标识**：使用 `messageId` 作为图片消息的唯一标识
- **端点优化**：仅调用 `POST /conversations/messages`，避免独立上传端点

### 禁止项
- 禁止 `image_url` 进入 WhatsApp 上游（返回 400 WHATSAPP_IMAGE_URL_FORBIDDEN）
- 禁止 `multipart/form-data` 格式（返回 415 UNSUPPORTED_MEDIA_TYPE）
- 禁止调用独立上传端点（如 /attachments、/media/upload 等）

### 返回语义
- 成功：`{ ok: true, messageId: "<id>", file_id: "<id>" }`（兼容 UI 期望的 file_id）
- 失败：`{ ok: false, error: "DAOJIE_ATTACHMENT_UPLOAD_ERROR", status: <status>, body: <body> }`

## 技术实现

### 流程
1. UI 调用 `/api/daojie/attachments/upload?url=<imageUrl>&contactId=<contactId>`
2. Worker 下载图片并转换为 base64
3. Worker 调用 `POST /conversations/messages` 发送图片消息
4. 返回 `messageId`（兼容 `file_id=messageId`）

### 限制
- 图片大小：≤5MB
- 仅支持 PNG/JPG 格式
- 仅 WhatsApp 渠道

## 监控与告警

### 日志格式
- 成功：`[IMG_MSG_REQ] contactId, size` → `[IMG_MSG_OK] messageId`
- 失败：`[IMG_MSG_FAIL] status, code, traceId`

### 告警阈值
- 5 分钟内失败率 >5% → 告警
- 连续 3 次 4xx（非 400/415）→ 告警

## 运维说明

### 失败码对照表
| 错误码 | 含义 | 处理方式 |
|--------|------|----------|
| 400 WHATSAPP_IMAGE_URL_FORBIDDEN | WhatsApp 禁止 image_url | 检查 UI 代码，使用 messageId 发送图片 |
| 415 UNSUPPORTED_MEDIA_TYPE | 不支持 multipart/form-data | 使用 JSON 格式 |
| 413 IMAGE_TOO_LARGE | 图片大小超过 5MB | 减小图片大小 |
| 404 | 端点不存在 | 检查 URL 是否正确 |

### 快速止血方案
临时关闭图片发送，返回明确提示：
```javascript
// 修改 routes/daojie_attachments.js
return ok(request, {
  ok: false,
  error: "IMAGE_SEND_TEMPORARILY_DISABLED",
  message: "图片发送功能临时关闭，请稍后重试"
});
```

## 容量与成本

### Base64 放大率
- PNG/JPG 图片的 base64 放大率约为 1.37 倍
- 5MB 图片会占用约 6.85MB 带宽

### 建议阈值
- 单图：≤5MB（已确定）
- 单会话速率限制：建议 10 张/分钟

## 冻结信息

### 冻结哈希
`624c1300c849427af699f3cfb283988649e141b4`

### 禁止回滚清单
- 不恢复旧上传逻辑
- 不引入 image_url
- 不支持 multipart/form-data

## 24h 运行报告（模板）

| 指标 | 数值 |
|------|------|
| 总请求数 | XXX |
| 成功率 | XX.X% |
| P95 延迟 | XXms |
| 平均单图大小 | XXKB |

### 失败 Top3
1. **错误码 X**：XX 次，占比 XX%，主要原因：XXX
2. **错误码 Y**：XX 次，占比 XX%，主要原因：XXX
3. **错误码 Z**：XX 次，占比 XX%，主要原因：XXX

### 样例 traceId
- 成功：XXXX
- 失败：XXXX

## 联系信息

如有问题，请联系：XXX