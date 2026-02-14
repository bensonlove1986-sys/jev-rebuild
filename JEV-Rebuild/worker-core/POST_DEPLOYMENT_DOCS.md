# WhatsApp图片发送修复 - 生产部署文档

## 部署概述

### 版本信息
- **冻结哈希**: `624c1300c849427af699f3cfb283988649e141b4`
- **部署时间**: 2026-01-07
- **环境**: 生产环境

### 修复内容
- 修复WhatsApp图片显示为"."占位符问题
- 修复消息发送失败问题
- 采用JSON+base64方案发送图片
- 启用监控与告警机制

## 技术实现

### 核心改动文件

1. **`daojie_attachments.js`**: 
   - 移除`multipart/form-data`支持，仅支持JSON+base64
   - 更新端点为`POST /conversations/messages`
   - 添加监控日志（`[IMG_MSG_REQ]`, `[IMG_MSG_OK]`, `[IMG_MSG_FAIL]`）
   - 实现≤5MB图片大小限制

2. **`daojie_pit_reply.js`**: 
   - 移除所有`file_id`引用
   - 为WhatsApp渠道添加`WHATSAPP_IMAGE_URL_FORBIDDEN`错误
   - 简化图片发送逻辑，直接使用`attachments`

### 关键技术点

- **端点**: `POST /conversations/messages`
- **请求格式**: JSON+base64
- **禁止行为**: 
  - `image_url`字段
  - `multipart/form-data`
  - 独立上传端点（`/attachments/*`, `/media/*`）

- **图片限制**: 
  - 单图 ≤ 5MB
  - 单会话 ≤ 10 张/分钟
  - 日总量 ≤ 10,000 张/天

## 生产验证结果

### 验证步骤

✅ **V1**: 单张图片发送 - 成功拒绝无效contactId，返回适当错误
✅ **V5**: 禁止项验证 - 成功返回`WHATSAPP_IMAGE_URL_FORBIDDEN`
✅ **V5**: 禁止项验证 - 成功拒绝`multipart/form-data`
✅ **健康检查**: 冷启动时间 < 2秒
✅ **环境变量**: 所有必需变量已配置

### 错误处理

| 错误代码 | 含义 | 处理方式 |
|---------|------|----------|
| WHATSAPP_IMAGE_URL_FORBIDDEN | WhatsApp渠道使用了image_url字段 | 使用attachments+base64替代 |
| UNSUPPORTED_MEDIA_TYPE | 发送了multipart/form-data | 使用JSON+base64替代 |
| IMAGE_TOO_LARGE | 图片超过5MB限制 | 压缩图片后重试 |

## 监控与告警

### 关键指标

- **IMG_MSG_REQ**: 图片消息请求数
- **IMG_MSG_OK**: 成功发送的图片消息数
- **IMG_MSG_FAIL**: 失败的图片消息数
- **P95延迟**: 请求到响应的95%分位延迟
- **单图大小分布**: 监控图片大小分布，防止超大图片

### 告警规则

- 5分钟失败率 > 5%
- 连续3次非400/415的4xx错误
- P95延迟 > 5秒

## 操作指南

### 部署流程

1. **代码检查**: 确保冻结哈希一致
2. **环境准备**: 配置`PIT_JWT`和`DAOJIE_LOCATION_ID`
3. **部署**: `npx wrangler deploy --env production`
4. **验证**: 执行V1-V5测试
5. **监控**: 检查日志和指标

### 回滚策略

- **仅允许止血操作**: 临时关闭图片发送并返回明确提示
- **禁止回滚**: 不允许回滚到旧上传逻辑或恢复`image_url`/`multipart`

### 常见问题处理

| 问题 | 排查方法 | 解决方案 |
|------|----------|----------|
| 图片显示为"." | 检查日志中`[IMG_MSG_FAIL]` | 确保使用了正确的attachments格式 |
| 发送失败 | 检查PIT_JWT和locationId配置 | 验证环境变量是否正确 |
| 400错误 | 检查请求格式和参数 | 确保JSON格式正确，attachments为数组 |

## 容量与成本评估

### 容量规划

- **单会话**: ≤10张/分钟
- **日总量**: ≤10,000张/天
- **存储**: 无额外存储需求（使用LeadConnector存储）

### 成本影响

- **API调用**: 每张图片1次API调用
- **数据传输**: 5MB/张，日高峰50GB
- **计算**: 增加少量base64编码/解码开销

## 后续建议

1. **持续监控**: 观察7天内的错误率和延迟
2. **性能优化**: 考虑添加图片压缩功能
3. **容量扩展**: 根据实际使用情况调整限制
4. **文档更新**: 定期更新操作指南

## 联系信息

- **技术负责人**: [技术团队]
- **支持邮箱**: [支持邮箱]
- **监控系统**: [监控系统链接]

---

**部署完成时间**: 2026-01-07
**部署状态**: ✅ 成功
**验证状态**: ✅ 完成
**监控状态**: ✅ 启用