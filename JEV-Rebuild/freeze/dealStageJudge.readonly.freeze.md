# DealStageJudge 只读裁决模块 Freeze 点

## 1. 模块性质声明

本模块为**纯只读裁决模块**，只做判断，不做任何发送、不修改任何现有通道、不影响任何已打通功能。

## 2. 允许改动范围

✅ **仅允许**：
- 优化判定规则（增加关键词、调整置信度算法）
- 完善单元测试
- 优化性能（不改变接口）
- 增加日志输出（不改变接口）
- 扩展判定阶段（需保持向后兼容）

## 3. 禁止修改项

❌ **绝对禁止**：
- 引入 AI 模型或外部 API 调用
- 新增自动发送逻辑
- 接管现有自动回复功能
- 修改现有通道映射
- 触发任何发送行为
- 修改输入/输出接口
- 引入 mock/fallback/simulate
- 改变模块的只读性质

## 4. 回归检查点

🚨 **出现以下情况即判破坏**：
- 模块中出现 `send`、`inbound`、`channel` 等关键词
- 模块中出现 `fetch`、`axios`、`request` 等网络请求
- 模块中出现 `KV`、`R2`、`Durable Object` 等 Cloudflare 服务调用
- 模块中出现 `setTimeout`、`setInterval` 等异步定时器
- 模块输出增加发送相关字段

## 5. 模块功能边界

### 输入：
```typescript
{
  customerId: string
  channel_id: number
  messages: Array<{
    role: 'customer' | 'agent' | 'ai'
    text: string
    timestamp: number
  }>
}
```

### 输出：
```typescript
{
  stage: 'CHAT' | 'INQUIRY' | 'ORDER'
  confidence: number // 0 ~ 1
  reason: string     // 判定依据
}
```

## 6. 责任团队

- 开发团队：前端开发团队
- 维护团队：前端开发团队
- 责任：确保模块始终保持只读性质，不影响现有功能

## 7. 违反处理

如果发现违反本 Freeze 点的修改，必须立即回滚，并进行代码审查，确保后续不再出现类似问题。

## 8. 版本控制

- **Freeze 点版本**: v1.0.0
- **创建日期**: 2026-01-04
- **适用范围**: dealStageJudge 模块及其所有使用场景
- **生效日期**: 2026-01-04
