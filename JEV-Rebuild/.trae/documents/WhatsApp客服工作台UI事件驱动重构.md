# WhatsApp客服工作台UI事件驱动重构计划

## 一、核心重构目标
1. 移除所有KV/API拉取联系人的逻辑
2. 实现纯事件驱动的UI架构
3. 使用客户手机号作为会话唯一标识
4. 简化状态管理，仅保留必要的内存态数据
5. 移除所有调试和系统日志

## 二、重构步骤

### 1. 简化状态管理
- 重写 `useCustomersStore`，移除所有KV/API调用
- 使用客户手机号作为会话唯一键
- 移除轮询机制和初始化逻辑
- 保留基本的会话管理功能

### 2. 更新WebSocket服务
- 确保 `whatsappWebSocketService` 正确处理inbound事件
- 修改消息处理逻辑，使用手机号作为会话键
- 添加新会话创建逻辑

### 3. 重构ChatLayout组件
- 更新会话列表，使用手机号作为标识
- 修改空状态文案为"暂无 WhatsApp 客户"
- 确保只有选中手机号时才显示聊天内容
- 移除所有依赖Store初始化的分支

### 4. 移除多余逻辑
- 删除所有"拉取联系人列表"的KV/API调用
- 移除所有"等待Store初始化"的UI分支
- 删除所有system/debug文案

## 三、技术实现

### 1. 状态管理重构
```typescript
// 简化后的CustomersStore
interface Customer {
  phone: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
}

interface CustomersState {
  customers: Customer[];
  selectedPhone: string | null;
  addMessage: (payload: any) => void;
  selectCustomer: (phone: string) => void;
}
```

### 2. 事件驱动流程
1. WebSocket接收inbound消息
2. 检查消息中的客户手机号
3. 如果不存在，创建新会话
4. 更新会话的最后消息和时间
5. 如果是新消息，增加未读数
6. 触发UI更新

### 3. 会话列表更新逻辑
```typescript
// 处理新消息事件
const handleIncomingMessage = (payload: any) => {
  const { from, text, timestamp } = payload;
  
  // 检查是否已存在该手机号的会话
  const existingCustomer = customers.find(c => c.phone === from);
  
  if (existingCustomer) {
    // 更新现有会话
    updateCustomer(from, {
      lastMessage: text,
      lastMessageTime: timestamp,
      unreadCount: existingCustomer.unreadCount + 1
    });
  } else {
    // 创建新会话
    createCustomer({
      phone: from,
      lastMessage: text,
      lastMessageTime: timestamp,
      unreadCount: 1
    });
  }
};
```

## 四、文件修改清单
1. `d:/PDF转网页/JEV-Rebuild/ui-core/app/src/store/customersStore.ts` - 重写状态管理
2. `d:/PDF转网页/JEV-Rebuild/ui-core/app/src/services/whatsappWebSocket.service.ts` - 更新消息处理逻辑
3. `d:/PDF转网页/JEV-Rebuild/ui-core/app/src/modules/chat_modular/components/ChatLayout.tsx` - 更新UI组件
4. `d:/PDF转网页/JEV-Rebuild/ui-core/app/src/modules/chat_modular/components/ChatLayout.css` - 调整样式（如有需要）

## 五、预期效果
1. UI完全基于WhatsApp inbound事件驱动
2. 无KV/API拉取逻辑
3. 会话以手机号为唯一标识
4. 左侧显示WhatsApp会话列表，按手机号区分
5. 中间聊天区默认显示"暂无 WhatsApp 客户"
6. 消息气泡正确区分左右
7. 无调试和系统日志

## 六、验证标准
1. 无KV/API调用
2. 纯事件驱动
3. 会话以手机号为键
4. 空状态文案正确
5. 消息显示正常
6. 无调试日志