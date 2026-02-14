# 修复发送图片后UI不显示和客户收到undefined的问题

## 问题分析

1. **客户收到undefined和图片**：
   - 在`worker-core/index.js`的`/api/outbound/whatsapp`端点中，当发送图片时，`text`参数被设置为undefined
   - 这导致Twilio API接收到undefined作为消息正文，客户在WhatsApp中看到了undefined和图片

2. **自己的UI中没有显示图片**：
   - 在`MessageBubble.tsx`的`isImageMessage`函数中，要求`media_path.startsWith('/api/media/r2/')`
   - 但在`ChatLayout.tsx`的`handleSendImage`函数中，`normalizedMediaPath`可能不总是以`/api/media/r2/`开头

## 修复方案

### 1. 修复worker-core中的outbound处理
- 在`worker-core/index.js`中，当发送图片时，将`text`参数设置为空字符串而不是undefined
- 确保即使没有文本，也不会发送undefined给Twilio

### 2. 修复UI中的图片消息判定
- 在`ChatLayout.tsx`的`handleSendImage`函数中，确保`normalizedMediaPath`总是以`/api/media/r2/`开头
- 验证`media_path`的格式，确保它符合`isImageMessage`函数的要求

### 3. 确保消息结构一致性
- 确保outbound图片消息的结构与inbound图片消息完全一致
- 验证`type`字段设置为`image`，`media_path`字段格式正确

## 具体修改点

1. **worker-core/index.js**：
   - 在`/api/outbound/whatsapp`端点中，修改`text`参数的处理，当undefined时设置为空字符串

2. **ui-core/app/src/modules/chat_modular/components/ChatLayout.tsx**：
   - 在`handleSendImage`函数中，增强`normalizedMediaPath`的验证和修复逻辑
   - 确保`media_path`总是以`/api/media/r2/`开头

3. **ui-core/app/src/modules/chat_modular/components/ChatInterface/MessageBubble.tsx**：
   - 验证`isImageMessage`函数的逻辑，确保它能正确识别outbound图片消息

## 验证方法

1. 打开http://localhost:3000/访问应用
2. 选择一个客户聊天
3. 粘贴一张图片到聊天输入框
4. 点击发送按钮
5. 检查：
   - 自己的UI是否正确显示发送的图片
   - 客户在WhatsApp中是否只收到图片，而不是undefined和图片
   - 控制台是否没有错误信息

## 预期结果

- 发送图片后，自己的UI能正确显示图片
- 客户在WhatsApp中只收到图片，不会收到undefined
- 整个发送过程没有错误信息