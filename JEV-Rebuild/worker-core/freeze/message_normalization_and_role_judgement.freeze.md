# 消息规范化与角色裁决层 Freeze 规则

## 1. 唯一裁决入口

所有写入 inbox 的消息 **必须且只能** 经过 `normalizeMessage()` 函数处理。

禁止任何 UI / AI / pull / adapter 侧自行补字段或覆盖字段。

## 2. 字段硬约束（不可被覆盖）

### 角色约束
- `role` 仅允许：`customer` | `agent` | `ai`

### 方向约束
- 当 `role === 'customer'` 时，`direction` 必须为 `inbound`
- 当 `role === 'agent'` 或 `role === 'ai'` 时，`direction` 必须为 `outbound`

### 上下文权限约束
- 仅当 `role === 'customer'` 且 `source === 'platform'` 时，`allowContext` 为 `true`
- 其余所有情况，`allowContext` 强制为 `false`

### 字段完整性
- 任一字段缺失 → 拒绝写入并记录错误日志

## 3. AI 上下文单向阀门

AI 上下文构建 **只允许** 使用以下条件的消息：
```javascript
role === 'customer' && allowContext === true
```

严禁 `agent` / `ai` / `outbound` 消息进入任何 AI 判断或生成链路。

## 4. 允许与禁止

### 允许
- 新增字段（不影响裁决逻辑）
- 优化日志记录
- 增强错误处理

### 禁止
- 修改 `role` 裁决逻辑
- 修改 `direction` 裁决逻辑
- 修改 `allowContext` 裁决逻辑
- 绕过 `normalizeMessage()` 函数写入消息
- 修改任何已定义的角色映射规则

## 5. 回归检查点

### 功能检查
- ✅ 刷新后左右气泡不变
- ✅ AI 不复述 agent 文本
- ✅ dealStageJudge 仅接收 customer 消息

### 日志检查
- ✅ 写入时输出 `[MESSAGE_ROLE_RESOLVED]`
- ✅ 写入时输出 `[INBOX_WRITE_CONFIRMED]`
- ✅ 写入时输出 `[MESSAGE_CONTEXT_ALLOWED]`

## 6. 硬性禁止

- 不新增自动发送
- 不修改任何 channel_id 映射
- 不引入 mock / fallback / simulate
- 不修改部署路径、命名、目标

## 7. 验收标准

### 必须全部满足才算完成
- ✅ 客户消息永远在左侧，agent/ai 永远在右侧
- ✅ AI 不复述刚刚发送的人工消息
- ✅ 刷新页面后消息角色不变化
- ✅ dealStageJudge 仅基于客户消息
- ✅ 所有消息写入都有裁决日志

## 8. 违规处理

任何违反本规则的改动都将被拒绝。回归测试必须通过所有检查点才能提交改动。

## 9. 维护说明

如需修改本规则，必须经过完整的回归测试，并更新本文件。

---

**Freeze 生效时间**: 2026-01-05
**维护负责人**: System
**文件版本**: 1.0.0
