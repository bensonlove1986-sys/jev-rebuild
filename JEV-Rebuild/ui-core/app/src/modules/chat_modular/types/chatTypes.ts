// 消息状态类型
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

// 消息类型
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact' | 'reaction';

// 消息方向
export type MessageDirection = 'inbound' | 'outbound';

// 消息实体类型
export interface Message {
  id: string;                 // 消息ID
  chatId: string;             // 聊天ID
  from: string;               // 发送者ID
  to: string;                 // 接收者ID
  type: MessageType;          // 消息类型
  text?: string;              // 文本内容
  media_path?: string;        // 媒体路径
  mediaType?: string;         // 媒体类型
  mediaSize?: number;         // 媒体大小
  mediaDuration?: number;     // 媒体时长（音频/视频）
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };                          // 位置信息
  contact?: {
    name: string;
    phone: string;
  };                          // 联系人信息
  reaction?: {
    emoji: string;
    sender: string;
  };                          // 反应信息
  direction: MessageDirection; // 消息方向
  status: MessageStatus;      // 消息状态
  timestamp: number;          // 发送时间戳
  isGroup: boolean;           // 是否为群聊消息
  senderName?: string;        // 发送者名称（群聊中使用）
  isDeleted?: boolean;        // 是否已删除
  isForwarded?: boolean;      // 是否为转发消息
  quoteMessageId?: string;    // 引用的消息ID
  quoteText?: string;         // 引用的消息文本
}

// 聊天类型
export type ChatType = 'single' | 'group';

// 聊天实体类型
export interface Chat {
  id: string;                 // 聊天ID
  type: ChatType;             // 聊天类型
  name: string;               // 聊天名称
  avatar?: string;            // 聊天头像
  lastMessage?: Message;      // 最后一条消息
  lastMessageTime?: number;   // 最后一条消息时间
  unreadCount: number;        // 未读消息数
  participants: string[];     // 参与者ID列表
  isMuted?: boolean;          // 是否静音
  isArchived?: boolean;       // 是否归档
  createdAt: number;          // 创建时间
  updatedAt: number;          // 更新时间
  // 群聊特有字段
  groupOwnerId?: string;      // 群主ID
  groupDescription?: string;  // 群描述
  groupMembers?: {
    id: string;
    name: string;
    avatar?: string;
  }[];                        // 群成员列表
}


// 聊天列表类型
export interface ChatList {
  chats: Chat[];
  loading: boolean;
  error?: string;
}

// 聊天消息列表类型
export interface ChatMessages {
  messages: Message[];
  loading: boolean;
  error?: string;
  hasMore: boolean;
  lastMessageId?: string;
}

// 消息发送请求类型
export interface SendMessageRequest {
  chatId: string;
  type: MessageType;
  text?: string;
  media_path?: string;
  mediaType?: string;
  mediaSize?: number;
  mediaDuration?: number;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  contact?: {
    name: string;
    phone: string;
  };
  quoteMessageId?: string;
  quoteText?: string;
}

// 消息发送响应类型
export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

// 消息状态更新类型
export interface MessageStatusUpdate {
  messageId: string;
  status: MessageStatus;
  timestamp: number;
}

// 聊天更新类型
export interface ChatUpdate {
  chatId: string;
  updates: Partial<Chat>;
}

// 消息搜索结果类型
export interface MessageSearchResult {
  chatId: string;
  messages: Message[];
  chatName: string;
  chatAvatar?: string;
}

// 明确导出Chat接口
export { Chat };


