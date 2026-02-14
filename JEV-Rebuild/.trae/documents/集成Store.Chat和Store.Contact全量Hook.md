# 集成Store.Chat和Store.Contact全量Hook计划

## 目标
解决以下核心问题：
- ❌ 全是「未命名联系人」
- ❌ 联系人数量不全 / 不稳定
- ❌ UI已连上，但业务数据空

## 核心思路
利用WhatsApp Web内部的Store.Chat和Store.Contact表，获取完整的联系人信息和会话列表，与现有的Store.Msg Hook结合，实现完整的WhatsApp数据获取能力。

## 实现步骤

### 1. 优化现有Hook架构
- 统一消息处理机制，将Store.Msg、Store.Chat、Store.Contact的消息处理整合到同一个监听器中
- 替换现有的`__JEV_EMIT_MESSAGE__`函数为更通用的`__JEV_EMIT__`函数，支持多种消息类型

### 2. 集成Store.Chat Hook
- 在Store.Msg Hook注入后，添加Store.Chat Hook
- 监听Store.Chat.models，获取完整的会话列表
- 包含chatId、是否群聊、最近一条消息、未读数、是否置顶等信息
- 当检测到Store.Chat时，发送完整的会话列表到WebSocket

### 3. 集成Store.Contact Hook
- 添加Store.Contact Hook，获取联系人真实身份信息
- 包含联系人名字、头像、备注、电话号码等信息
- 当检测到Store.Contact时，发送完整的联系人列表到WebSocket

### 4. 统一消息监听和处理
- 实现通用的消息监听函数，处理来自WhatsApp内部Store的所有消息
- 支持三种消息类型：message（Store.Msg）、chats（Store.Chat）、contacts（Store.Contact）
- 确保与现有WebSocket事件协议兼容

### 5. 优化客户数据推送逻辑
- 修改`pushAllCustomers`方法，利用Store.Chat和Store.Contact的数据构建完整的客户列表
- 确保客户数据包含真实名称、头像、电话号码等完整信息
- 与UI端期望的数据格式保持一致

## 预期效果
- ✔ 左侧联系人从1个→几十/上百
- ✔ 「未命名联系人」自动变成真实名字
- ✔ 群/客户/历史会话全部出现
- ✔ 和wwebjs效果100%对齐

## 代码修改点
1. **monitorLoginStatus方法**：优化Hook注入逻辑，添加Store.Chat和Store.Contact Hook
2. **消息监听机制**：统一处理三种消息类型
3. **客户数据推送**：利用Store数据构建完整客户列表
4. **WebSocket事件**：确保与现有UI端兼容

## 兼容性
- 保持与现有WhatsApp事件协议兼容
- 向后兼容现有的UI端代码
- 不破坏已有的Store.Msg Hook功能