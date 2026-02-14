// 消息类型定义
export interface ChatMessage {
  id?: string;
  message_id?: string;
  text: string;
  direction?: string;
  role?: 'customer' | 'operator' | 'ai' | 'system';
  timestamp?: number;
  from?: string;
}

// 客户信息类型定义
export interface ChatCustomer {
  id: string;
  name: string;
  status?: string;
  avatar?: string;
  meta?: string;
}

// 聊天上下文类型定义
export interface ChatContext {
  customer: ChatCustomer | null;
  messages: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (text: string) => void;
  isDevelopment?: boolean;
}