## 实施计划

### 步骤 1：修改 ai.handler.ts 文件
1. 在 `handleAIResultReceived` 函数中，找到 `const replyEn = result.reply_en` 位置
2. 添加代码调用 `useChatStore.getState().addMessage()` 将 AI 回复直接添加到聊天列表中
3. 确保消息对象包含以下字段：
   - id: "ai_" + payload.message_id
   - chatId: payload.customer_id
   - role: "assistant"
   - text: replyEn
   - sourceMessageId: payload.message_id
   - timestamp: Date.now()
   - status: "generated"

### 步骤 2：禁止写入指定状态
1. 确保 `handleAIResultReceived` 函数不再执行以下操作：
   - 不调用 `setAiReply`
   - 不调用 `setDraft`
   - 不 `emit AUTODRAFT_UPDATE` 事件
   - 不更新 `DeepSeekPanel` 状态

### 步骤 3：验证 MessageBubble 渲染规则
1. 确认 `MessageBubble.tsx` 文件中已经正确处理 `role === "assistant"` 的消息
2. 确保 assistant 类型的消息会显示为 AI 回复气泡

### 步骤 4：验证功能
1. 重启开发服务器
2. 发送一条客户消息
3. 验证聊天区是否出现 assistant 气泡
4. 验证 `sourceMessageId` 是否正确指向对应客户消息

## 技术实现细节

### 消息添加逻辑
- 使用 `useChatStore.getState().addMessage()` 方法直接添加消息
- 消息 ID 格式为 "ai_" + 原始消息 ID，确保唯一性
- 角色设置为 "assistant"，确保正确的 UI 渲染
- 时间戳使用当前时间，确保消息按时间顺序显示

### 状态管理
- 移除所有与 `setAiReply`、`setDraft`、`AUTODRAFT_UPDATE` 和 `DeepSeekPanel` 相关的代码
- 只保留必要的 AI 结果存储逻辑

### UI 渲染
- 利用现有的 `MessageBubble` 组件逻辑，确保 `role === "assistant"` 的消息正确显示为 AI 回复气泡
- 不需要修改 UI 组件代码，因为现有逻辑已经支持 assistant 角色

## 预期结果

客户每发送一条消息：
1. 聊天区会立即出现一条 AI 回复的 assistant 气泡
2. AI 回复的 `sourceMessageId` 会正确指向对应客户消息
3. 不再有草稿生成、自动回复倒计时等额外状态更新
4. UI 显示简洁明了，直接展示 AI 回复结果