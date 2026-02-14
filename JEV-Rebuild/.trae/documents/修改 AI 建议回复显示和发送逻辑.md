# 修改 AI 建议回复显示和发送逻辑

## 目标
- 删除 DeepSeekPanel 中的 ai-reply-card
- 确保 AI 建议只在消息气泡下方显示
- 生成中英文版 AI 建议，英文发给客户，中文仅内部观看
- 发送时只发送英文给客户，但在本地存储中保存中英文

## 修改步骤

### 1. 修改 DeepSeekPanel.tsx
- 删除 ai-reply-card 组件的渲染逻辑
- 保留 AI 生成的核心逻辑（appendDraft, sendOutbound）
- 确保 AI 生成的中英文内容正确存储到 drafts store

### 2. 确保 MessageBubble.tsx 正确显示 AI 建议
- 验证当前的 AI Draft 渲染逻辑是否正确
- 确保中英文版本都能正确显示
- 确保 AI Draft 显示在消息气泡下方，而不是内部

### 3. 修改发送逻辑
- 确保 sendOutbound 只发送英文内容给客户
- 确保在本地存储中保存中英文内容
- 确保客户只能看到英文内容，中文仅内部可见

### 4. 验证修改
- 测试 AI 建议的生成和显示
- 测试消息发送，确保英文发给客户，中文仅内部可见
- 验证 UI 布局是否合理

## 技术实现
- 使用 drafts store 存储 AI 建议的中英文内容
- 使用 MessageBubble.tsx 中的 ai-draft-block 显示 AI 建议
- 修改 sendOutbound 函数，确保只发送英文内容
- 保留本地存储中的中英文内容，确保内部可以看到中文版本

## 预期效果
- AI 建议显示在消息气泡下方
- 英文版本可以发给客户，客户可见
- 中文版本仅内部自己观看
- 发送时只发送英文给客户，但在本地存储中保存中英文
