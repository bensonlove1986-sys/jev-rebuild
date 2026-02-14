# 集成 Playwright WhatsApp Web Store.Msg 实时 Hook 模板

## 目标
实现 0 轮询、0 DOM、真·实时的消息监听，直接监听 WhatsApp Web 内部消息总线，当新消息出现时立即推送到 WebSocket。

## 核心思路
- 不看 DOM，不等 UI
- 直接 Hook：`window.Store.Msg`
- 新消息一出现 → 立即推给 WebSocket

## 实施步骤

### 1. 修改 `initialize` 方法，注入 Hook
在 Playwright WhatsApp Engine 的 `initialize` 方法中，在 `page.goto('https://web.whatsapp.com')` 且登录完成后执行 Hook 注入：

- 添加 `page.addInitScript` 初始化 `window.__JEV_WHATSAPP_HOOKED__` 标志
- 添加 `page.evaluate` 注入 Store.Msg Hook 逻辑
- 监听 Store.Msg.add 方法，当新消息出现时通过 window.postMessage 发送

### 2. 在 Node 侧接收消息
- 添加 `page.on('console')` 监听，打印调试信息
- 添加 `page.exposeFunction('__JEV_EMIT_MESSAGE__')`，用于将消息推送到 WebSocket
- 添加 `page.evaluate` 监听 window 消息事件，调用暴露的函数

### 3. 集成到现有 WebSocket 服务
- 在 `__JEV_EMIT_MESSAGE__` 函数中，使用现有的 `io.emit('whatsapp:message', payload)` 推送消息
- 确保消息格式与现有代码兼容

### 4. 优化现有消息处理逻辑
- 移除或简化依赖 DOM 的消息处理逻辑
- 确保新的实时消息处理与现有代码协同工作
- 添加必要的错误处理和日志记录

## 预期效果
- ✅ 真正实时（和官方 Web 一致）
- ✅ 不依赖 DOM
- ✅ 不丢联系人
- ✅ 延迟 ≈ 0ms
- ✅ 可稳定运行

## 集成点

1. **文件**: `d:\PDF转网页\JEV-Rebuild\worker-core\playwright-whatsapp-engine.js`
2. **位置**: `initialize` 方法，在登录完成后
3. **核心修改**: 注入 Store.Msg Hook 并设置消息监听

## 技术特点

- **生产级**: 使用经过验证的生产级模板
- **零轮询**: 直接监听内部消息总线，无轮询开销
- **零 DOM**: 不依赖 DOM 操作，避免了 DOM 变化带来的问题
- **真实时**: 新消息一出现立即推送，无延迟
- **兼容现有代码**: 与现有 WebSocket 服务无缝集成

## 风险评估

- **WhatsApp Web 版本变更**: 如果 WhatsApp Web 内部 API 变更，可能需要调整 Hook 逻辑
- **注入时机**: 需要确保在 Store 可用后才注入 Hook
- **消息格式兼容性**: 需要确保推送的消息格式与现有代码兼容

## 应对策略

- 添加 Store 可用性检查，确保在 Store 可用后才注入 Hook
- 添加详细的日志记录，便于调试
- 保留现有消息处理逻辑作为备用，确保系统可靠性
- 定期检查 WhatsApp Web 版本，及时调整 Hook 逻辑

## 测试计划

- 验证新消息能够实时推送到 WebSocket
- 验证消息格式正确
- 验证在各种情况下都能正常工作
- 验证与现有功能兼容

## 交付标准

- 实现 0 轮询、0 DOM、真·实时的消息监听
- 消息延迟 ≈ 0ms
- 不丢联系人
- 稳定运行
- 与现有代码兼容