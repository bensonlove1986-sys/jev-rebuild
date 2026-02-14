# AssistantBus HMR 免疫 Freeze 点

## 1. 允许改动的范围

### 1.1 仅允许新增
- 新增事件类型到 `AssistantEventTypes` 枚举
- 新增事件数据类型接口
- 新增 `emit()` 调用（在业务代码中使用现有事件类型）
- 新增事件监听器（使用现有事件类型和唯一key）

### 1.2 禁止改动
- 禁止修改 `globalKey` 常量（`__ASSISTANT_BUS__`）
- 禁止修改 `removeAllListeners` 策略（必须清除所有监听器）
- 禁止修改 `instanceId` 和 `createdAt` 的生成逻辑
- 禁止修改 `on()` 方法的幂等注册逻辑
- 禁止修改 `off()` 方法的实现
- 禁止修改 HMR 防御边界逻辑

## 2. 禁止项

### 2.1 禁止在组件内初始化 bus
```tsx
// ❌ 禁止
const MyComponent = () => {
  const bus = new AssistantBus(); // 禁止在组件内创建新实例
  return <div />;
};
```

### 2.2 禁止匿名函数注册
```tsx
// ❌ 禁止
assistantBus.on(AssistantEventTypes.AI_FILL_INPUT, () => {
  // 匿名函数无法保证幂等性
});

// ✅ 允许
const handleFillInput = () => {
  // 命名函数，可确保幂等性
};
assistantBus.on(AssistantEventTypes.AI_FILL_INPUT, 'my-component-fill-input', handleFillInput);
```

### 2.3 禁止绕过 key 注册
```tsx
// ❌ 禁止
// 不要直接操作 listeners Map
assistantBus.listeners.set(eventType, [...listeners, newListener]);

// ✅ 允许
assistantBus.on(eventType, uniqueKey, listener);
```

### 2.4 禁止在 useEffect 中不清理监听器
```tsx
// ❌ 禁止
useEffect(() => {
  assistantBus.on(eventType, 'key', listener);
  // 没有返回清理函数
});

// ✅ 允许
useEffect(() => {
  assistantBus.on(eventType, 'key', listener);
  return () => {
    assistantBus.off(eventType, 'key');
  };
}, []);
```

## 3. 回归检查点

### 3.1 关键日志检查
- **BUS_SINGLETON_CREATE** 只出现一次
- **BUS_SINGLETON_REUSE** 出现多次（每次 HMR 时）
- **BUS_REGISTER_ONCE** 中 "registered" 对同一个 key 只出现一次
- **BUS_HMR_DISPOSE** 每次热更新出现，afterCount=0
- **BUS_LISTENER_STATS** 显示监听器数量正常

### 3.2 错误日志检查
- 禁止出现 "removed listener → registered listener" 循环日志
- 禁止出现 HMR 500 错误
- 禁止出现 "Cannot read properties of undefined (reading 'on')" 错误
- 禁止出现 "Listener already registered" 错误

### 3.3 功能检查
- 页面没有白屏或崩溃
- 聊天功能正常
- AI 助手功能正常
- 客户列表功能正常
- 消息发送接收功能正常

## 4. 验证方法

使用 `docs/hmr_bus_validation.md` 中的测试脚本进行验证，确保所有测试用例通过。

## 5. 版本控制

- **Freeze 点版本**: v1.0.0
- **创建日期**: 2026-01-04
- **适用范围**: assistantBus 及其所有使用场景
- **责任团队**: 前端开发团队

## 6. 违反处理

如果发现违反本 Freeze 点的修改，必须立即回滚，并进行代码审查，确保后续不再出现类似问题。