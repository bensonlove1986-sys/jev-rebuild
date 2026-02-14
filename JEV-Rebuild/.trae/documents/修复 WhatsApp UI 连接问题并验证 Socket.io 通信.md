## 修复 WhatsApp UI 连接问题并验证 Socket.io 通信

### 问题分析
当前 WhatsApp UI 停留在"connecting"状态，需要确保 Socket.io 通信正常，验证 `whatsapp:customers` 事件正确传递，并修复 socket.id 未定义问题。

### 实施计划

1. **修改 `playwright-whatsapp-engine.js` 文件**
   - 在文件最顶层添加 `FILE_LOADED` 日志
   - 在创建 Socket.io Server 后添加全局变量 `__ENGINE_IO__` 和 `IO_CREATED` 日志
   - 更新 `io.on('connection')` 事件处理，添加详细日志和指定的事件处理逻辑

2. **检查并停止其他 Socket.io Server 实例**
   - 确认 `whatsapp-server.js` 中有另一个 `new Server()` 实例
   - 停止该实例，确保只保留 `playwright-whatsapp-engine.js` 中的一个实例

3. **重启服务验证**
   - 关闭所有 node 进程
   - 重新启动 `node playwright-whatsapp-engine.js`
   - 验证日志输出是否符合预期

### 预期结果
- Engine 控制台显示：`[ENGINE] FILE_LOADED`、`[ENGINE] IO_CREATED true`、`[ENGINE][CONNECT]` 带有正确的 socket.id 和 PID
- Engine 收到 `whatsapp:init_customers` 事件后发送 `whatsapp:customers` 和 `whatsapp:status` 事件
- UI 控制台显示收到 `whatsapp:customers` 事件，包含 `{ id: 'debug_test', name: 'DEBUG_OK' }`
- UI 显示 `formattedWhatsappContactsLength === 1` 和 `connectionStatus === 'ready'`

### 关键修改点
- 确保 Socket.io 事件顺序正确（connect → emit）
- 修复 socket.id 未定义问题
- 添加健康检查端点用于 Engine 验证
- 实现详细日志便于调试
- 确保只有一个 Socket.io Server 实例运行