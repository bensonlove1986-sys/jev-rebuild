## 问题分析

当打开多个 <http://localhost:3000/> 标签页时，有些能显示消息，有些显示不了，主要原因包括：

### 1. WebSocket连接限制

* 浏览器对同一个WebSocket端点可能有连接数量限制

* 当打开多个标签页时，后面的标签页可能无法建立WebSocket连接

* 导致只有部分标签页能接收实时消息

### 2. 单例模式在多标签页环境下的问题

* WhatsAppInboxService 使用全局单例模式（通过globalThis存储）

* 但在多标签页环境下，每个标签页都有独立的JavaScript运行环境

* 每个标签页会创建自己的服务实例，可能导致状态不一致

### 3. 状态同步问题

* 每个标签页有自己的chatStore状态

* 当一个标签页接收到消息并更新状态时，其他标签页不知道

* 导致只有接收消息的标签页能显示最新消息

### 4. WebSocket消息去重

* WhatsAppInboxService 使用 processedMessageIds 集合来去重

* 但在多标签页环境下，每个实例都有自己的去重集合

* 可能导致某些标签页认为消息是重复的而跳过处理

### 5. 初始化时机问题

* 不同标签页的初始化顺序可能不同

* 某些标签页可能在WebSocket连接建立之前就尝试加载消息

* 导致消息加载失败

### 6. localStorage竞争

* 多个标签页可能同时读写localStorage中的同步状态

* 导致同步状态被覆盖，某些标签页无法正确同步消息

## 解决方案

### 1. 优化WebSocket连接管理

* 实现标签页间的WebSocket连接共享机制

* 使用BroadcastChannel API在标签页间通信

* 当一个标签页建立WebSocket连接后，通过BroadcastChannel通知其他标签页

* 其他标签页不再尝试建立WebSocket连接，而是通过BroadcastChannel接收消息

### 2. 实现跨标签页状态同步

* 使用BroadcastChannel API在标签页间同步chatStore状态

* 当一个标签页接收到消息并更新状态时，通过BroadcastChannel通知其他标签页

* 其他标签页接收到通知后更新自己的状态

### 3. 统一消息去重机制

* 使用localStorage存储已处理的消息ID

* 每个标签页在处理消息前检查localStorage中的消息ID

* 确保所有标签页使用同一个去重集合

### 4. 优化初始化逻辑

* 确保每个标签页都能正确初始化，不受其他标签页影响

* 在WebSocket连接建立失败时，使用轮询机制作为 fallback

* 确保消息加载不依赖于WebSocket连接状态

### 5. 统一localStorage管理

* 实现localStorage操作的互斥锁机制

* 避免多个标签页同时读写localStorage导致的状态冲突

* 确保同步状态在标签页间保持一致

### 6. 添加标签页状态管理

* 跟踪每个标签页的状态（活跃、空闲等）

* 当有新消息时，只向活跃的标签页推送

* 当标签页从空闲变为活跃时，自动同步最新状态

## 实现步骤

1. **添加BroadcastChannel实现**

   * 创建跨标签页通信的BroadcastChannel实例

   * 实现消息发送和接收逻辑

2. **修改WebSocket连接管理**

   * 检查是否已有其他标签页建立了WebSocket连接

   * 如果有，使用BroadcastChannel接收消息

   * 如果没有，建立WebSocket连接并通知其他标签页

3. **实现跨标签页状态同步**

   * 在chatStore状态更新时，通过BroadcastChannel通知其他标签页

   * 其他标签页接收到通知后更新自己的状态

4. **统一消息去重机制**

   * 将processedMessageIds存储到localStorage

   * 在处理消息前检查localStorage中的消息ID

5. **优化初始化逻辑**

   * 确保每个标签页都能正确初始化

   * 添加轮询机制作为WebSocket连接失败的 fallback

6. **添加标签页状态管理**

   * 实现标签页状态跟踪

   * 优化消息推送逻辑

## 预期效果

* 打开多个 <http://localhost:3000/> 标签页时，所有标签页都能正确显示消息

* 实时消息能在所有标签页间同步

* 标签页间的状态保持一致

* 避免WebSocket连接冲突和localStorage竞争

