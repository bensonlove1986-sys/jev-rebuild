## 问题分析

WebSocket 连接失败，错误码 1006（异常关闭），主要原因是：

1. **初始化顺序问题**：在 `WhatsAppChatDO` 类的 `fetch` 方法中，WebSocket 连接处理逻辑位于初始化方法之前，但初始化方法包含异步操作
2. **错误处理不完善**：虽然 WebSocket 连接处理被包裹在 try-catch 块中，但初始化过程中的错误可能会影响连接稳定性
3. **WebSocket 处理逻辑**：WebSocket 连接被立即接受，但后续的初始化操作可能会失败

## 解决方案

### 1. 优化 WebSocket 连接处理逻辑

**修改文件**：`worker-core/index.js`
**修改位置**：`WhatsAppChatDO` 类的 `fetch` 方法

**修改内容**：
- 保持 WebSocket 连接处理逻辑在最前面（确保快速响应 WebSocket 握手）
- 移除 WebSocket 连接处理中的 try-catch 块，让错误能够被正确捕获
- 确保 WebSocket 连接处理逻辑简洁明了，只处理 WebSocket 连接

### 2. 确保初始化方法不会阻塞 WebSocket 连接

**修改文件**：`worker-core/index.js`
**修改位置**：`WhatsAppChatDO` 类的 `fetch` 方法

**修改内容**：
- 将初始化方法调用移到 WebSocket 连接处理之后，但确保它们不会阻塞 WebSocket 连接
- 或者在 `WhatsAppChatDO` 类的构造函数中执行初始化操作

### 3. 增强错误处理

**修改文件**：`worker-core/index.js`
**修改位置**：`WhatsAppChatDO` 类的 `handleWebSocketConnection` 方法

**修改内容**：
- 在 `handleWebSocketConnection` 方法中添加错误处理逻辑
- 确保即使在初始化过程中出现错误，WebSocket 连接也能正常工作

### 4. 验证修复效果

**测试步骤**：
1. 部署修复后的代码
2. 测试 WebSocket 连接是否能够正常建立
3. 测试 WebSocket 连接是否能够保持稳定
4. 测试消息是否能够正常广播

## 预期效果

- WebSocket 连接能够正常建立，不再出现 1006 错误
- WebSocket 连接能够保持稳定，不再频繁断开
- 消息能够正常广播，实时性得到保证
- 系统稳定性得到提升，不再出现因初始化错误导致的连接失败