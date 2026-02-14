// 联系人状态类型
export type ContactStatus = 'online' | 'offline' | 'away' | 'busy';

// 联系人实体类型
export interface Contact {
  id: string;                 // 联系人ID
  name: string;               // 联系人名称
  phone: string;              // 联系电话
  avatar?: string;            // 联系人头像
  status?: string;            // 联系人状态文本
  onlineStatus: ContactStatus; // 在线状态
  lastSeen?: number;          // 最后在线时间
  isBlocked?: boolean;        // 是否被阻止
  isFavorited?: boolean;      // 是否收藏
  createdAt: number;          // 创建时间
  updatedAt: number;          // 更新时间
  email?: string;             // 联系邮箱
  country?: string;           // 国家
  countryCode?: string;       // 国家代码
  tags?: string[];            // 标签
  isGroup?: boolean;          // 是否为群聊
  groupSize?: number;         // 群聊人数
}

// 联系人列表类型
export interface ContactList {
  contacts: Contact[];
  loading: boolean;
  error?: string;
  searchQuery?: string;
  filteredContacts: Contact[];
}

// 联系人搜索请求类型
export interface ContactSearchRequest {
  query: string;
  filter?: {
    status?: ContactStatus;
    tags?: string[];
    isGroup?: boolean;
  };
}

// 联系人搜索结果类型
export interface ContactSearchResult {
  contacts: Contact[];
  loading: boolean;
  error?: string;
  hasMore: boolean;
}

// 联系人更新类型
export interface ContactUpdate {
  id: string;
  updates: Partial<Contact>;
}

// 联系人标签类型
export interface ContactTag {
  id: string;
  name: string;
  color: string;
  count: number;
}

// 联系人分组类型
export interface ContactGroup {
  id: string;
  name: string;
  contacts: string[];
  createdAt: number;
  updatedAt: number;
}
