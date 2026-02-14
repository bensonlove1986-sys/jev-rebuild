# DealStageReplyPolicy 只读策略模块 Freeze 点

## 1. 模块性质声明

本模块为**纯策略层模块**，只提供基于成交阶段的AI回复策略建议，不做任何发送、不修改任何现有通道、不影响任何已打通功能。

## 2. 允许改动范围

✅ **仅允许**：
- 优化策略规则（调整tone、replyStyle、suggestedFocus、forbid列表）
- 完善单元测试
- 优化性能（不改变接口）
- 增加日志输出（不改变接口）
- 扩展策略覆盖场景（需保持向后兼容）

## 3. 禁止修改项

❌ **绝对禁止**：
- 引入AI模型或外部API调用
- 新增自动发送逻辑
- 接管现有自动回复功能
- 修改现有通道映射
- 触发任何发送行为
- 修改输入/输出接口
- 引入mock/fallback/simulate
- 自动应用策略（只能注入prompt）
- 通道判断逻辑
- 写入inbox
- 覆盖裁决结果

## 4. 回归检查点

🚨 **出现以下情况即判破坏**：
- 模块中出现`send`、`inbound`、`channel`等关键词
- 模块中出现`fetch`、`axios`、`request`等网络请求
- 模块中出现`KV`、`R2`、`Durable Object`等Cloudflare服务调用
- 模块中出现`setTimeout`、`setInterval`等异步定时器
- 模块输出增加发送相关字段
- 模块中出现自动应用逻辑

## 5. 模块功能边界

### 输入：
```javascript
{
  stage: 'CHAT' | 'INQUIRY' | 'ORDER',
  channel_id: number,
  lastCustomerMessage: string
}
```

### 输出：
```javascript
{
  tone: 'casual' | 'business' | 'confirm',
  replyStyle: 'short' | 'detailed',
  suggestedFocus: string,
  forbid: string[]   // 明确禁止内容（如报价、付款）
}
```

## 6. 接入方式约束

✅ **仅允许只读接入**：
- 仅在AI回复生成前调用
- 调用结果只能注入system prompt
- 不自动发送
- 不接管人工
- 不影响原有AI成功/失败逻辑

## 7. 责任团队

- 开发团队：前端开发团队
- 维护团队：前端开发团队
- 责任：确保模块始终保持纯策略层性质，不影响现有功能

## 8. 违反处理

如果发现违反本Freeze点的修改，必须立即回滚，并进行代码审查，确保后续不再出现类似问题。

## 9. 版本控制

- **Freeze点版本**: v1.0.0
- **创建日期**: 2026-01-04
- **适用范围**: dealStageReplyPolicy模块及其所有使用场景
- **生效日期**: 2026-01-04