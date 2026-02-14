# 修复 SSE 连接频繁断开问题

## 问题分析

从日志中可以看到：
1. SSE 连接成功建立：`[WA_SSE_CONNECTING]` -> `[WA_SSE_CONNECTED]`
2. 立即被断开：`[WHATSAPP_INBOX_SERVICE] SSE disconnected`
3. 然后重新连接：`[WA_SSE_CONNECTING]` -> `[WA_SSE_CONNECTED]`

问题根源：
- 在 `ChatLayout.tsx` 中，组件卸载时调用了 `whatsAppInboxService.cleanup()`
- `cleanup()` 方法会调用 `disconnectSSE()`，关闭 SSE 连接
- 在热更新或组件重新渲染时，React 会重新挂载组件，导致 SSE 连接被频繁断开和重连

## 修复计划

### 1. 修改 `WhatsAppInboxService.ts`

- **移除 `cleanup()` 方法中的 `disconnectSSE()` 调用**
- **添加静态标志**：确保 `init()` 只被调用一次
- **优化连接管理**：确保全局只存在一个 EventSource 实例

### 2. 修改 `ChatLayout.tsx`

- **移除组件卸载时的 `cleanup()` 调用**
- **只在应用卸载时关闭连接**：通过 `window.addEventListener('beforeunload')`

### 3. 验证修复效果

- 确保页面加载后只出现一次 `[WA_SSE_CONNECTING]` 和 `[WA_SSE_CONNECTED]`
- 不再出现连续的 SSE disconnected / reconnect 日志
- SSE 连接保持稳定

## 预期效果

- SSE 连接在页面加载时建立，直到页面卸载时才关闭
- 不再出现频繁的断开和重连
- 消息能正常接收和渲染
- 符合用户要求的 SSE 长连接稳定要求

## 执行步骤

1. 修改 `WhatsAppInboxService.ts`
2. 修改 `ChatLayout.tsx`
3. 构建并部署前端代码
4. 验证修复效果