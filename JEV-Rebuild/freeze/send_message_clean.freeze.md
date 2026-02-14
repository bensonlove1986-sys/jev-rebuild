# SEND_MESSAGE_CLEAN Freeze Document

## 规则
1. **只允许严格等号清空**：仅当文本完全等于customer_id时才清空，禁止使用includes、startsWith、正则等模糊匹配
2. **清空条件**：必须同时满足以下条件
   - rawText != null
   - trimmed === customer_id
   - trimmed.length === customer_id.length
3. **日志要求**：必须保留两条日志
   - [SEND_MESSAGE_CLEAN_APPLIED]：仅在真的清空时输出
   - [SEND_MESSAGE_CLEAN_SKIPPED]：当text包含customer_id但不是纯占位时输出一次（debug级别）

## 回归检查点
- 不能再出现SEND_MESSAGE_ASSERTION_FAILED因误清空触发
- 正常文本消息能够正常发送
- 包含customer_id的文本消息能够正常发送
- 纯customer_id占位文本被正确清空并被断言拦截

## 禁止行为
- 禁止使用contains、includes、startsWith等模糊匹配
- 禁止使用正则表达式
- 禁止修改outbound、worker、图片链路、inbox schema
- 禁止引入mock、fallback、simulate
- 禁止重构，不迁移目录，不改命名

## 修复历史
- 修复时间：2026-01-10
- 修复位置：ui-core/app/src/store/messagesStore.ts
- 修复内容：修改SEND_MESSAGE_CLEAN逻辑，使其只在严格等于customer_id时才清空文本
- 修复原因：避免误清空包含customer_id的正常文本消息，导致SEND_MESSAGE_ASSERTION_FAILED