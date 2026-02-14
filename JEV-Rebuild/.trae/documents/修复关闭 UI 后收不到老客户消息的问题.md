## 增量同步升级计划

### 1. 修改 WhatsAppInboxService.ts

#### 初始化流程调整
- **修改 `initializeInOrder()` 方法**：
  - 新流程：`await pullInboxIndex()` → `await pullRecentMessages()` → `connectWebSocket()`
  - 确保 WebSocket 只在 Pull 操作完成后建立
  - 移除错误时的提前 WS 连接逻辑

#### 新增方法
- **`pullInboxIndex()`**：
  - 拉取收件箱索引，获取所有客户列表
  - 确保所有客户都在 chatStore 中有对应的聊天项

- **`pullRecentMessages()`**：
  - 从 chatStore 获取 `lastSyncTs`
  - 调用 `/api/inbox/pull?since=lastSyncTs`
  - 处理返回的消息，更新到 chatStore
  - 更新 `lastSyncTs` 为返回的 `last_ts`

- **`pullCustomerHistory()`**：
  - 保持原有功能，但确保使用规范化的客户 ID

### 2. 修改 chatStore.ts

#### 新增字段
- **`lastSyncTs`**：
  - 存储上次同步的时间戳
  - 初始值为 0
  - 每次同步后更新

#### 新增方法
- **`setLastSyncTs(ts: number)`**：
  - 更新 `lastSyncTs` 字段
  - 同步到 localStorage

- **`getLastSyncTs()`**：
  - 获取当前 `lastSyncTs` 值

### 3. 修改 presenceStore.ts

#### Radar 行为调整
- **移除直接 `addChat()` 调用**：
  - 改为使用 `markOnline()` 方法
  - `markOnline()` 方法：
    - 检查客户是否已存在
    - 不存在则创建最小化聊天项
    - 标记客户为在线状态

### 4. Worker 端 API 实现

#### 新增 API 端点
- **`/api/inbox/pull?since=timestamp`**：
  - 接收 `since` 参数
  - 返回：
    ```json
    {
      "messages": [],
      "last_ts": number
    }
    ```
  - `messages`：包含所有在 `since` 时间戳之后的消息
  - `last_ts`：最新消息的时间戳

### 5. 验证日志

在以下关键点添加日志：
- **`[SYNC_BOOTSTRAP_DONE]`**：初始化同步完成
- **`[INCREMENTAL_SYNC_OK]`**：增量同步成功
- **`[PULL_INBOX_INDEX_SUCCESS]`**：收件箱索引拉取成功
- **`[PULL_RECENT_MESSAGES_SUCCESS]`**：最近消息拉取成功

### 6. 执行顺序

1. **修改 chatStore.ts**：添加 `lastSyncTs` 字段和相关方法
2. **修改 presenceStore.ts**：调整 Radar 行为
3. **修改 WhatsAppInboxService.ts**：更新初始化流程和添加新方法
4. **实现 Worker 端 API**：添加增量同步端点
5. **测试验证**：确保功能正常运行

### 预期效果

- UI 关闭期间的消息会在重新打开时自动补拉
- 避免创建重复的聊天项
- 保持 WebSocket 连接的稳定性
- 提供清晰的同步状态日志

### 技术要点

- **增量同步**：只拉取上次同步后的新消息，减少数据传输
- **顺序执行**：确保 Pull 操作在 WebSocket 连接之前完成
- **状态管理**：使用 `lastSyncTs` 跟踪同步状态
- **错误处理**：确保同步失败时不会影响整体功能

此计划不涉及创建任何后台常驻 Worker，仅通过前端初始化时的 API 调用来实现增量同步。