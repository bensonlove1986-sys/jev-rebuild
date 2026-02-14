## 问题分析

AI 回复卡片显示占位符 "AI 助手将分析客户消息并生成回复建议"，但控制台已显示 `[AUTO_ENGINE_APPEND_DRAFT]` 日志，说明草稿已生成。

### 根本原因
- AI 回复卡片渲染逻辑基于 `aiReply` 状态
- `useAutoDraftEngine` 调用中的 `appendDraft` 回调只是打印日志，未更新 `aiReply` 状态
- 自动生成的草稿未被正确显示在 UI 中

## 修复方案

修改 DeepSeekPanel.tsx 中的 `useAutoDraftEngine` 调用，更新 `appendDraft` 回调：

1. **更新 appendDraft 回调**：
   - 接收自动生成的草稿数据
   - 更新 `aiReply` 状态为草稿的英文回复
   - 更新 `chineseTranslation` 状态为草稿的中文翻译
   - 保持原有的日志输出

2. **验证修复**：
   - 确保 AI 回复卡片显示生成的回复
   - 确保控制台仍显示 `[AUTO_ENGINE_APPEND_DRAFT]` 日志
   - 确保其他功能不受影响

## 预期结果

- AI 回复卡片显示生成的回复内容
- 不再显示占位符
- 控制台显示完整的草稿数据
- 所有功能正常工作