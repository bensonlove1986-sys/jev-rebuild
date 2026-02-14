# REPLIED MESSAGE IDS SET FREEZE

## 设计裁决

repliedMessageIds 在运行时语义为 Set<string>，用于存储已回复的消息ID，防止AI重复回复同一条消息。

## 持久化规则

### 内存态
- 运行时使用 Set<string> 类型，便于高效调用 .has()、.add()、.delete() 等方法
- 内存态的 Set 类型提供了更好的性能和更清晰的语义

### 持久化态
- 只能以 Array<string> 形式落盘（存储到 localStorage 或其他持久化存储）
- 原因：Set 类型无法被 JSON 序列化，而 Array 类型可以
- 持久化转换规则：`repliedMessageIds: Array.from(repliedSet)`

### 读取时
- 必须将 Array<string> 恢复成 Set<string> 类型
- 恢复函数：`function ensureRepliedSet(value: any): Set<string>`

## 禁止项

❌ 不允许直接 .has() 未裁决值
❌ 不允许在 store 中保存 Set 类型的 repliedMessageIds
❌ 不允许忽略类型检查直接使用 repliedMessageIds

## 回归检查点

1. **页面刷新后不报 .has is not a function**
   - 验证方法：刷新页面，观察控制台是否有 .has is not a function 错误
   - 预期结果：控制台没有该错误

2. **HMR 多次热更新不报错**
   - 验证方法：修改代码触发 HMR，观察控制台是否有错误
   - 预期结果：控制台没有任何错误

3. **忽略列表逻辑仍然生效**
   - 验证方法：发送一条消息，AI 回复后，再次发送相同的消息，观察 AI 是否再次回复
   - 预期结果：AI 不会重复回复同一条消息

## 代码实现规范

### 1. 统一类型裁决函数

```typescript
function ensureRepliedSet(value: any): Set<string> {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value);
  if (value && typeof value === 'object') return new Set(Object.keys(value));
  return new Set();
}
```

### 2. 读取时必须使用 ensureRepliedSet

```typescript
// 正确示例
const repliedSet = ensureRepliedSet(currentCustomerState.repliedMessageIds);
return repliedSet.has(messageId);

// 错误示例
return currentCustomerState.repliedMessageIds.has(messageId);
```

### 3. 写入时必须转换为 Array

```typescript
// 正确示例
repliedMessageIds: Array.from(repliedSet)

// 错误示例
repliedMessageIds: repliedSet
```

### 4. 运行时自证日志

在 store 初始化时添加以下日志：

```typescript
console.log('[REPLIED_SET_RESTORE]', {
  rawType: typeof repliedMessageIds,
  isArray: Array.isArray(repliedMessageIds),
  size: ensureRepliedSet(repliedMessageIds).size
});
```

## 验收标准

✅ 控制台能看到 [REPLIED_SET_RESTORE] 日志
✅ 切换客户不报错
✅ 刷新页面不报错
✅ HMR 热更新不报错
✅ AI 不会重复回复同一条客户消息
✅ 控制台不再出现 has is not a function 错误