# Message Role and Direction Invariant - FREEZE RULE

## 1. 文件与功能定位

### 1.1 核心文件
- `worker-core/utils/normalizeMessageV2.js` - 全局唯一消息裁决单点

### 1.2 功能描述
该模块实现了消息角色、方向和来源的强制裁决，确保所有写入inbox的消息都符合严格的一致性规则，彻底解决AI/人工outbound被当成customer inbound、以及发送后在UI显示为客户消息的问题。

## 2. 不可修改的核心规则

### 2.1 normalizeMessageV2 函数强制规则

#### 2.1.1 入站消息 (ctx.kind === 'INBOUND')
```javascript
role 必须 = 'customer'
direction 必须 = 'inbound'
source 必须 = ctx.platform (whatsapp/instagram/unknown)
allowContext 必须 = true
```

#### 2.1.2 人工出站消息 (ctx.kind === 'OUTBOUND_MANUAL')
```javascript
role 必须 = 'agent'
direction 必须 = 'outbound'
source 必须 = 'manual'
allowContext 必须 = false
```

#### 2.1.3 AI出站消息 (ctx.kind === 'OUTBOUND_AI')
```javascript
role 必须 = 'ai'
direction 必须 = 'outbound'
source 必须 = 'ai'
allowContext 必须 = false
```

### 2.2 assertMessageInvariant 函数强制规则

#### 2.2.1 角色与方向必须匹配
```javascript
customer → inbound
agent/ai → outbound
```

#### 2.2.2 allowContext 规则
```javascript
仅允许 customer/inbound 消息的 allowContext 为 true
其余所有消息的 allowContext 必须为 false
```

#### 2.2.3 source 与角色的一致性
```javascript
customer → source 必须是 'whatsapp' | 'instagram' | 'unknown'
agent → source 必须是 'manual'
ai → source 必须是 'ai'
```

### 2.3 AI 上下文构建规则

在 `inbound_daojie.js` 中，AI 回复建议的上下文构建必须严格执行：
```javascript
仅使用 role==='customer' && direction==='inbound' && allowContext===true 的消息
任何 agent/ai/outbound 消息绝对不允许进入上下文
```

## 3. 允许的改动

1. **新增字段**：在标准化消息中新增字段，但不得影响现有字段的行为
2. **扩展平台**：在 `ctx.platform` 中新增支持的平台类型
3. **扩展消息类型**：支持更多消息类型（如语音、视频等），但必须保持角色和方向的一致性
4. **优化日志**：添加更详细的日志信息，便于调试和监控
5. **性能优化**：优化函数执行效率，不改变功能逻辑

## 4. 禁止的改动

1. **修改核心裁决规则**：不允许修改 normalizeMessageV2 中三类 kind 的裁决规则
2. **修改断言规则**：不允许修改 assertMessageInvariant 的验证逻辑
3. **修改 AI 上下文过滤规则**：不允许放宽 AI 上下文的过滤条件
4. **引入可配置项**：不允许将核心规则改为可配置
5. **修改消息结构**：不允许改变消息的核心字段结构
6. **跳过裁决**：不允许在写入 inbox 前跳过 normalizeMessageV2 调用
7. **跳过断言**：不允许在写入 inbox 前跳过 assertMessageInvariant 调用

## 5. 回归检查点

### 5.1 禁止出现的情况
1. **禁止** outbound 消息的 role = 'customer'
2. **禁止** allowContext = true 出现在 agent/ai 消息中
3. **禁止** AI_CTX_BUILD allowed 包含 agent/ai 消息
4. **禁止** UI 左侧显示 agent/ai 消息
5. **禁止** UI 右侧显示 customer 消息

### 5.2 必须保持的情况
1. **必须** inbound 消息的 role = 'customer'
2. **必须** agent/ai 消息的 direction = 'outbound'
3. **必须**所有消息经过 normalizeMessageV2 处理
4. **必须**所有消息经过 assertMessageInvariant 验证
5. **必须** AI 上下文只包含 customer 消息

## 6. 部署与验证

### 6.1 部署流程
1. 确保所有写入 inbox 的地方都调用了 normalizeMessageV2
2. 确保所有写入 inbox 的地方都调用了 assertMessageInvariant
3. 确保 AI 上下文构建严格按照规则过滤消息
4. 运行测试脚本验证修复效果

### 6.2 验证方法

运行测试脚本：
```bash
node --experimental-modules test-message-role-direction.js
```

预期结果：
- 所有测试用例通过
- AI 上下文只包含 customer 消息
- 消息角色和方向一致

## 7. 日志自证

所有修复必须可通过日志自证，关键日志包括：

1. **[MSG_NORM_V2]**：消息标准化日志，包含 kind、customer_id、channel_id、role、direction、source、allowContext 等字段
2. **[MSG_INVARIANT_BLOCKED]**：脏数据拒绝日志，包含 reason 和 msgSummary
3. **[AI_CTX_BUILD]**：AI 上下文构建日志，包含 total、allowed、blocked 等字段
4. **[UI_ROLE_CHECK]**：UI 角色校验日志，包含 message_id、role、direction、source 等字段

## 8. 紧急回滚方案

如果出现问题，按照以下步骤回滚：
1. 恢复所有修改的文件到原始状态
2. 重新部署 worker-core
3. 验证系统正常运行

## 9. 责任与监督

- **维护人**：系统架构团队
- **监督机制**：代码审查必须检查 normalizeMessageV2 的调用和规则执行情况
- **审计机制**：定期检查日志，确保没有违反规则的消息写入 inbox

## 10. 生效时间

本规则自 2026-01-05 起生效，所有新代码必须遵守此规则。

---

**FREEZE RULE ENDS HERE**

任何违反本规则的修改都将被视为无效，并可能导致系统功能异常。请严格遵守！