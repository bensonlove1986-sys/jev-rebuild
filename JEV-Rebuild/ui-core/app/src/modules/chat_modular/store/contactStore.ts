import { create } from 'zustand';
import { useChatStore } from './chatStore';
import { JEV_RUNTIME } from '@/core/jev_runtime_config';
import { safeFetch } from '@/main';
import { normalizeCustomerId } from '@/utils/customerId';

// 联系人状态类型
type ContactStatus = 'online' | 'offline' | 'away' | 'busy';

// 联系人标签类型
interface ContactTag {
  id: string;
  name: string;
  color: string;
  count: number;
}

// 联系人实体类型
interface Contact {
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

// 联系人状态接口
interface ContactState {
  // 联系人列表
  contacts: Map<string, Contact>;
  addContact: (contact: Contact) => void;
  updateContact: (contactId: string, updates: Partial<Contact>) => void;
  removeContact: (contactId: string) => void;
  setContacts: (contacts: Contact[]) => void;
  
  // 联系人搜索
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredContacts: Contact[];
  updateFilteredContacts: () => void;
  
  // 联系人状态
  onlineContacts: Set<string>;
  updateContactStatus: (contactId: string, status: ContactStatus) => void;
  updateLastSeen: (contactId: string, lastSeen: number) => void;
  
  // 联系人标签
  contactTags: ContactTag[];
  addContactTag: (tag: ContactTag) => void;
  updateContactTag: (tagId: string, updates: Partial<ContactTag>) => void;
  removeContactTag: (tagId: string) => void;
  setContactTags: (tags: ContactTag[]) => void;
  
  // 收藏联系人
  favoriteContacts: Set<string>;
  toggleFavoriteContact: (contactId: string) => void;
  
  // 阻止联系人
  blockedContacts: Set<string>;
  toggleBlockedContact: (contactId: string) => void;
  
  // 加载状态
  isLoadingContacts: boolean;
  setIsLoadingContacts: (isLoading: boolean) => void;
  isSearchingContacts: boolean;
  setIsSearchingContacts: (isSearching: boolean) => void;
  
  // 错误状态
  error: string | null;
  setError: (error: string | null) => void;
  
  // 从 API 加载联系人
  loadContactsFromAPI: () => Promise<void>;
  // 重新加载联系人列表
  reloadContactList: () => Promise<void>;
  
  // 辅助方法
  getContactById: (contactId: string) => Contact | undefined;
  getContactsByStatus: (status: ContactStatus) => Contact[];
  getFavoriteContacts: () => Contact[];
  getBlockedContacts: () => Contact[];
  getContactsByTag: (tag: string) => Contact[];
}

// CRM 客户接口
interface CRMCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  tags: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
  lastContactTime?: number;
  value?: number;
  status?: string;
}

// 智能客户识别结果接口
interface CustomerIdentificationResult {
  contactId: string;
  identifiedInfo: {
    name?: string;
    email?: string;
    company?: string;
    needs?: string[];
    interests?: string[];
    budget?: number;
    timeline?: string;
  };
  confidence: number;
  source: string;
  timestamp: number;
}

// 分析数据接口
interface CustomerAnalytics {
  contactId: string;
  name: string;
  totalMessages: number;
  totalChats: number;
  firstContactTime: number;
  lastContactTime: number;
  responseTime: number;
  conversionRate: number;
  customerValue: number;
  taskCompletionRate: number;
  interactionScore: number;
  tags: string[];
}

// 销售漏斗数据接口
interface SalesFunnel {
  stage: 'lead' | 'prospect' | 'opportunity' | 'customer' | 'loyal_customer';
  count: number;
  conversionRate: number;
  averageTimeInStage: number;
}

// 团队绩效数据接口
interface TeamPerformance {
  memberId: string;
  name: string;
  totalCustomers: number;
  totalMessages: number;
  totalTasks: number;
  completedTasks: number;
  responseTime: number;
  customerSatisfaction: number;
  revenueGenerated: number;
}

// 扩展联系人状态接口
interface ContactStateWithCRM extends ContactState {
  // CRM 相关功能
  syncContactWithCRM: (contactId: string) => Promise<void>;
  getContactsFromCRM: () => Promise<Contact[]>;
  getCustomerFromCRM: (phone: string) => Promise<CRMCustomer | null>;
  createCustomerInCRM: (contact: Contact) => Promise<CRMCustomer>;
  updateCustomerInCRM: (customerId: string, updates: Partial<CRMCustomer>) => Promise<CRMCustomer>;
  
  // 智能客户识别功能
  identifyCustomer: (contactId: string, message: string) => Promise<CustomerIdentificationResult>;
  extractCustomerInfo: (text: string) => Record<string, string>;
  assessCustomerValue: (contactId: string) => Promise<number>;
  categorizeCustomer: (contactId: string) => Promise<string[]>;
  updateCustomerProfileFromMessages: (contactId: string) => Promise<void>;
  
  // 分析和报表功能
  getCustomerAnalytics: (contactId: string) => Promise<CustomerAnalytics>;
  getSalesFunnel: () => Promise<SalesFunnel[]>;
  getTeamPerformance: () => Promise<TeamPerformance[]>;
  getTaskCompletionStats: () => Promise<{ total: number; completed: number; completionRate: number }>;
  getMessageStats: (days: number) => Promise<{ total: number; inbound: number; outbound: number; averageResponseTime: number }>;
  generateCustomerReport: (contactId: string, format: 'pdf' | 'csv' | 'json') => Promise<string>;
  generateSalesReport: (startDate: number, endDate: number, format: 'pdf' | 'csv' | 'json') => Promise<string>;
  
  // CRM 数据状态
  crmCustomers: Map<string, CRMCustomer>;
  isSyncingWithCRM: boolean;
  crmLastSyncTime: number | null;
  
  // 智能识别状态
  customerIdentifications: Map<string, CustomerIdentificationResult>;
  isIdentifyingCustomer: boolean;
  
  // 分析数据状态
  analyticsData: Map<string, CustomerAnalytics>;
  lastAnalyticsUpdate: number | null;
}

// 从 localStorage 加载联系人数据
function loadContactsFromStorage() {
  try {
    const storedContacts = localStorage.getItem('contact_contacts_v1');
    if (storedContacts) {
      const parsedContacts = JSON.parse(storedContacts);
      const contactsMap = new Map(Object.entries(parsedContacts));
      console.log('[CONTACT_STORE_RESTORED][CONTACTS]', contactsMap.size, 'contacts');
      return contactsMap;
    }
  } catch (error) {
    console.error('[CONTACT_STORE_LOAD_ERROR]', error);
  }
  return new Map();
}

// 保存联系人数据到 localStorage
function saveContactsToStorage(contacts) {
  try {
    const contactsToStore = Object.fromEntries(contacts);
    localStorage.setItem('contact_contacts_v1', JSON.stringify(contactsToStore));
    console.log('[CONTACT_STORE_SAVED][CONTACTS]', contacts.size, 'contacts');
  } catch (error) {
    console.error('[CONTACT_STORE_SAVE_ERROR]', error);
  }
}

// 创建联系人状态管理store
export const useContactStore = create<ContactStateWithCRM>((set, get) => ({
  // 联系人列表
  contacts: loadContactsFromStorage(),
  addContact: (contact) => set((state) => {
    // 统一客户 ID 格式
    const normalizedId = normalizeCustomerId(contact.id);
    console.log('[CANONICAL_APPLIED]', contact.id, '→', normalizedId);
    
    const normalizedContact = {
      ...contact,
      id: normalizedId,
      phone: normalizedId
    };
    
    const newContacts = new Map(state.contacts);
    newContacts.set(normalizedId, normalizedContact);
    
    // 保存到 localStorage
    saveContactsToStorage(newContacts);
    
    // 更新过滤后的联系人
    const filteredContacts = [...newContacts.values()].filter(contact => 
      contact.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      contact.phone.includes(state.searchQuery)
    );
    
    return { 
      contacts: newContacts,
      filteredContacts
    };
  }),
  updateContact: (contactId, updates) => set((state) => {
    const newContacts = new Map(state.contacts);
    const contact = newContacts.get(contactId);
    if (contact) {
      newContacts.set(contactId, { ...contact, ...updates, updatedAt: Date.now() });
      
      // 保存到 localStorage
      saveContactsToStorage(newContacts);
      
      // 更新过滤后的联系人
      const filteredContacts = [...newContacts.values()].filter(contact => 
        contact.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        contact.phone.includes(state.searchQuery)
      );
      
      return { 
        contacts: newContacts,
        filteredContacts
      };
    }
    return {};
  }),
  removeContact: (contactId) => set((state) => {
    const newContacts = new Map(state.contacts);
    newContacts.delete(contactId);
    
    // 保存到 localStorage
    saveContactsToStorage(newContacts);
    
    // 更新过滤后的联系人
    const filteredContacts = [...newContacts.values()].filter(contact => 
      contact.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      contact.phone.includes(state.searchQuery)
    );
    
    return { 
      contacts: newContacts,
      filteredContacts
    };
  }),
  setContacts: (contacts) => set((state) => {
    console.log("[CONTACT_SET]", contacts);
    // 统一客户 ID 格式
    const normalizedContacts = contacts.map(contact => {
      const normalizedId = normalizeCustomerId(contact.id);
      console.log('[CANONICAL_APPLIED]', contact.id, '→', normalizedId);
      return {
        ...contact,
        id: normalizedId,
        phone: normalizedId
      };
    });
    
    const newContacts = new Map(normalizedContacts.map(contact => [contact.id, contact]));
    
    // 保存到 localStorage
    saveContactsToStorage(newContacts);
    
    // 更新过滤后的联系人
    const filteredContacts = [...newContacts.values()].filter(contact => 
      contact.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      contact.phone.includes(state.searchQuery)
    );
    
    return { 
      contacts: newContacts,
      filteredContacts
    };
  }),
  
  // 联系人搜索
  searchQuery: '',
  setSearchQuery: (query) => set((state) => {
    const newQuery = query.toLowerCase();
    const filteredContacts = [...state.contacts.values()].filter(contact => 
      contact.name.toLowerCase().includes(newQuery) ||
      contact.phone.includes(newQuery)
    );
    
    return { 
      searchQuery: query,
      filteredContacts
    };
  }),
  filteredContacts: [],
  updateFilteredContacts: () => set((state) => {
    const filteredContacts = [...state.contacts.values()].filter(contact => 
      contact.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      contact.phone.includes(state.searchQuery)
    );
    
    return { filteredContacts };
  }),
  
  // 联系人状态
  onlineContacts: new Set(),
  updateContactStatus: (contactId, status) => set((state) => {
    const newContacts = new Map(state.contacts);
    const contact = newContacts.get(contactId);
    if (contact) {
      newContacts.set(contactId, { ...contact, onlineStatus: status, updatedAt: Date.now() });
      
      // 保存到 localStorage
      saveContactsToStorage(newContacts);
      
      // 更新在线联系人集合
      const newOnlineContacts = new Set(state.onlineContacts);
      if (status === 'online') {
        newOnlineContacts.add(contactId);
      } else {
        newOnlineContacts.delete(contactId);
      }
      
      // 更新过滤后的联系人
      const filteredContacts = [...newContacts.values()].filter(contact => 
        contact.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        contact.phone.includes(state.searchQuery)
      );
      
      return { 
        contacts: newContacts,
        onlineContacts: newOnlineContacts,
        filteredContacts
      };
    }
    return {};
  }),
  updateLastSeen: (contactId, lastSeen) => set((state) => {
    const newContacts = new Map(state.contacts);
    const contact = newContacts.get(contactId);
    if (contact) {
      newContacts.set(contactId, { ...contact, lastSeen, updatedAt: Date.now() });
      
      // 保存到 localStorage
      saveContactsToStorage(newContacts);
      
      // 更新过滤后的联系人
      const filteredContacts = [...newContacts.values()].filter(contact => 
        contact.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        contact.phone.includes(state.searchQuery)
      );
      
      return { 
        contacts: newContacts,
        filteredContacts
      };
    }
    return {};
  }),
  
  // 联系人标签
  contactTags: [],
  addContactTag: (tag) => set((state) => {
    const newTags = [...state.contactTags, tag];
    return { contactTags: newTags };
  }),
  updateContactTag: (tagId, updates) => set((state) => {
    const newTags = state.contactTags.map(tag => 
      tag.id === tagId ? { ...tag, ...updates } : tag
    );
    return { contactTags: newTags };
  }),
  removeContactTag: (tagId) => set((state) => {
    const newTags = state.contactTags.filter(tag => tag.id !== tagId);
    return { contactTags: newTags };
  }),
  setContactTags: (tags) => set({ contactTags: tags }),
  
  // 收藏联系人
  favoriteContacts: new Set(),
  toggleFavoriteContact: (contactId) => set((state) => {
    const newFavoriteContacts = new Set(state.favoriteContacts);
    if (newFavoriteContacts.has(contactId)) {
      newFavoriteContacts.delete(contactId);
    } else {
      newFavoriteContacts.add(contactId);
    }
    
    // 更新联系人的收藏状态
    const newContacts = new Map(state.contacts);
    const contact = newContacts.get(contactId);
    if (contact) {
      newContacts.set(contactId, { 
        ...contact, 
        isFavorited: newFavoriteContacts.has(contactId),
        updatedAt: Date.now()
      });
      
      // 保存到 localStorage
      saveContactsToStorage(newContacts);
      
      // 更新过滤后的联系人
      const filteredContacts = [...newContacts.values()].filter(contact => 
        contact.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        contact.phone.includes(state.searchQuery)
      );
      
      return { 
        favoriteContacts: newFavoriteContacts,
        contacts: newContacts,
        filteredContacts
      };
    }
    
    return { favoriteContacts: newFavoriteContacts };
  }),
  
  // 阻止联系人
  blockedContacts: new Set(),
  toggleBlockedContact: (contactId) => set((state) => {
    const newBlockedContacts = new Set(state.blockedContacts);
    if (newBlockedContacts.has(contactId)) {
      newBlockedContacts.delete(contactId);
    } else {
      newBlockedContacts.add(contactId);
    }
    
    // 更新联系人的阻止状态
    const newContacts = new Map(state.contacts);
    const contact = newContacts.get(contactId);
    if (contact) {
      newContacts.set(contactId, { 
        ...contact, 
        isBlocked: newBlockedContacts.has(contactId),
        updatedAt: Date.now()
      });
      
      // 保存到 localStorage
      saveContactsToStorage(newContacts);
      
      // 更新过滤后的联系人
      const filteredContacts = [...newContacts.values()].filter(contact => 
        contact.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        contact.phone.includes(state.searchQuery)
      );
      
      return { 
        blockedContacts: newBlockedContacts,
        contacts: newContacts,
        filteredContacts
      };
    }
    
    return { blockedContacts: newBlockedContacts };
  }),
  
  // 加载状态
  isLoadingContacts: false,
  setIsLoadingContacts: (isLoading) => set({ isLoadingContacts: isLoading }),
  isSearchingContacts: false,
  setIsSearchingContacts: (isSearching) => set({ isSearchingContacts: isSearching }),
  
  // 错误状态
  error: null,
  setError: (error) => set({ error }),
  
  // 从 API 加载联系人
  loadContactsFromAPI: async () => {
    console.log('[CONTACT_INDEX_PULL] Starting to load contacts from API');
    const state = get();
    state.setIsLoadingContacts(true);
    state.setError(null);
    
    try {
      // 从 Cloudflare Worker 拉取联系人
      const { JEV_RUNTIME } = await import('@/core/jev_runtime_config');
      const apiUrl = `${JEV_RUNTIME.API_BASE}/inbox/customers`;
      console.log('[CONTACT_INDEX_API_URL]', apiUrl);
      const response = await safeFetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[CONTACT_INDEX_PULL_RESPONSE]', data);
      
      console.log('[CONTACT_INDEX_PULL_DEBUG]', {
      hasCustomers: !!data?.customers,
      isArray: Array.isArray(data?.customers),
      length: data?.customers?.length,
      customers: data?.customers
    });
    
    if (data?.customers && Array.isArray(data.customers) && data.customers.length > 0) {
        console.log('[CONTACT_INDEX_PULL_SUCCESS] Loaded', data.customers.length, 'contacts from API');
        
        // 将 API 联系人转换为 Contact 类型
        const contactsFromAPI: Contact[] = data.customers.map((customer: any) => ({
          id: customer.customer_id,
          name: customer.display_name || `客户 ${customer.customer_id.replace('whatsapp:', '')}`,
          phone: customer.customer_id,
          onlineStatus: 'offline' as ContactStatus,
          createdAt: customer.created_at || Date.now(),
          updatedAt: customer.updated_at || customer.last_message_at || Date.now()
        }));
        
        // 合并联系人数据，保留现有的联系人
        const currentContacts = new Map(state.contacts);
        contactsFromAPI.forEach(contact => {
          currentContacts.set(contact.id, contact);
        });
        
        // 更新联系人列表
        const updatedContacts = Array.from(currentContacts.values());
        state.setContacts(updatedContacts);
        console.log('[CONTACT_INDEX_PULL_COMPLETE] Contacts merged with API data. Total contacts:', updatedContacts.length);
        
        // 注意：不再从 contactStore 更新 chatStore 中的聊天数据
        // chatStore 已经通过 appendMessage 方法添加了新消息，包含完整的消息内容
        // 这里只需要更新联系人列表，不需要更新聊天数据
        console.log('[CHAT_STORE_UPDATE_SKIPPED] Skipping chatStore update from contactStore');
        console.log('[CONTACT_STORE_ONLY] Only updating contact list, chatStore managed separately');

      } else {
        console.log('[CONTACT_INDEX_PULL_EMPTY] No contacts found in API response, keeping existing contacts');
        // 如果 API 返回空数组，保留现有的聊天和联系人
        
        // 检查当前聊天数量
        const chatStore = useChatStore.getState();
        if (chatStore) {
          console.log('[CONTACT_INDEX_PULL_DEBUG] Current chats count:', chatStore.chats.size);
          console.log('[CONTACT_INDEX_PULL_DEBUG] Current messages sets count:', chatStore.messages.size);
        }
      }
    } catch (error) {
      console.error('[CONTACT_INDEX_PULL_ERROR] Failed to load contacts from API:', error);
      state.setError(`加载联系人失败: ${error.message}`);
    } finally {
      state.setIsLoadingContacts(false);
    }
  },
  
  // 重新加载联系人列表
  reloadContactList: async () => {
    console.log('[CONTACT_INDEX_RELOAD] Reloading contact list');
    const state = get();
    await state.loadContactsFromAPI();
  },
  
  // CRM 数据状态
  crmCustomers: new Map(),
  isSyncingWithCRM: false,
  crmLastSyncTime: null,
  
  // 智能识别状态
  customerIdentifications: new Map(),
  isIdentifyingCustomer: false,
  
  // 分析数据状态
  analyticsData: new Map(),
  lastAnalyticsUpdate: null,
  
  // 辅助方法
  getContactById: (contactId) => get().contacts.get(contactId),
  getContactsByStatus: (status) => {
    const contacts = get().contacts.values();
    return [...contacts].filter(contact => contact.onlineStatus === status);
  },
  getFavoriteContacts: () => {
    const { contacts, favoriteContacts } = get();
    return [...contacts.values()].filter(contact => favoriteContacts.has(contact.id));
  },
  getBlockedContacts: () => {
    const { contacts, blockedContacts } = get();
    return [...contacts.values()].filter(contact => blockedContacts.has(contact.id));
  },
  getContactsByTag: (tag) => {
    const contacts = get().contacts.values();
    return [...contacts].filter(contact => contact.tags?.includes(tag));
  },
  
  // CRM 相关方法
  syncContactWithCRM: async (contactId) => {
    console.log('[CRM_SYNC] Syncing contact with CRM:', contactId);
    const state = get();
    
    // 首先尝试从contacts中获取联系人
    let contact = state.contacts.get(contactId);
    
    // 如果联系人不存在，创建一个基于contactId的新联系人
    if (!contact) {
      console.log('[CRM_SYNC] Contact not found in contacts, creating new contact:', contactId);
      
      // 从contactId中提取名称（如果是whatsapp格式）
      let contactName = contactId;
      if (contactId.startsWith('whatsapp:+')) {
        contactName = `客户 ${contactId.replace('whatsapp:', '')}`;
      }
      
      // 创建一个新的联系人对象
      contact = {
        id: contactId,
        name: contactName,
        phone: contactId,
        onlineStatus: 'offline',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isGroup: contactId.includes('@g.us'),
        groupSize: 0
      };
      
      // 将联系人添加到contacts中
      state.addContact(contact);
      console.log('[CRM_SYNC] Created and added contact to contacts:', contact);
    }
    
    set({ isSyncingWithCRM: true });
    
    try {
      // 模拟 CRM API 调用
      console.log('[CRM_API] Syncing contact:', contact);
      
      // 检查联系人是否已在 CRM 中
      const existingCustomer = await state.getCustomerFromCRM(contact.phone);
      
      if (existingCustomer) {
        // 更新现有客户
        await state.updateCustomerInCRM(existingCustomer.id, {
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          company: contact.company,
          tags: contact.tags || [],
          updatedAt: Date.now(),
          lastContactTime: Date.now()
        });
        console.log('[CRM_SYNC] Updated existing customer in CRM:', existingCustomer.id);
      } else {
        // 创建新客户
        await state.createCustomerInCRM(contact);
        console.log('[CRM_SYNC] Created new customer in CRM:', contact.id);
      }
      
      set({ 
        crmLastSyncTime: Date.now(),
        isSyncingWithCRM: false 
      });
      console.log('[CRM_SYNC_SUCCESS] Contact synced with CRM:', contactId);
    } catch (error) {
      console.error('[CRM_SYNC_ERROR] Failed to sync contact with CRM:', error);
      set({ isSyncingWithCRM: false });
      throw error; // 重新抛出错误，让UI层显示错误提示
    }
  },
  
  getContactsFromCRM: async () => {
    console.log('[CRM_API] Getting contacts from CRM');
    set({ isSyncingWithCRM: true });
    
    try {
      // 模拟 CRM API 调用，返回示例客户数据
      const mockCustomers: CRMCustomer[] = [
        {
          id: 'crm_1',
          name: '张三',
          phone: '+8613800138000',
          email: 'zhangsan@example.com',
          company: '示例公司',
          tags: ['重要客户', 'VIP'],
          notes: '长期合作伙伴',
          createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
          lastContactTime: Date.now() - 2 * 24 * 60 * 60 * 1000,
          value: 100000,
          status: '活跃'
        },
        {
          id: 'crm_2',
          name: '李四',
          phone: '+8613900139000',
          email: 'lisi@example.com',
          company: '测试公司',
          tags: ['潜在客户'],
          notes: '正在跟进中',
          createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
          lastContactTime: Date.now() - 1 * 24 * 60 * 60 * 1000,
          value: 50000,
          status: '跟进中'
        }
      ];
      
      // 更新 CRM 客户数据
      const crmCustomersMap = new Map<string, CRMCustomer>();
      mockCustomers.forEach(customer => {
        crmCustomersMap.set(customer.phone, customer);
      });
      
      // 将 CRM 客户转换为联系人
      const contactsFromCRM: Contact[] = mockCustomers.map(customer => ({
        id: customer.phone,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        onlineStatus: 'offline' as ContactStatus,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        tags: customer.tags
      }));
      
      // 更新联系人列表
      const currentContacts = new Map(get().contacts);
      contactsFromCRM.forEach(contact => {
        currentContacts.set(contact.id, contact);
      });
      
      set({ 
        contacts: currentContacts,
        crmCustomers: crmCustomersMap,
        crmLastSyncTime: Date.now(),
        isSyncingWithCRM: false 
      });
      
      console.log('[CRM_API_SUCCESS] Got', contactsFromCRM.length, 'contacts from CRM');
      return contactsFromCRM;
    } catch (error) {
      console.error('[CRM_API_ERROR] Failed to get contacts from CRM:', error);
      set({ isSyncingWithCRM: false });
      return [];
    }
  },
  
  getCustomerFromCRM: async (phone) => {
    console.log('[CRM_API] Getting customer from CRM by phone:', phone);
    
    try {
      // 模拟 CRM API 调用
      // 实际项目中，这里应该调用真实的 CRM API
      console.log('[CRM_API] Mock API call to get customer:', phone);
      
      // 检查本地 CRM 客户缓存
      const state = get();
      const cachedCustomer = state.crmCustomers.get(phone);
      if (cachedCustomer) {
        console.log('[CRM_CACHE] Found cached customer:', phone);
        return cachedCustomer;
      }
      
      // 模拟 API 响应延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 模拟未找到客户
      console.log('[CRM_API] Customer not found in CRM:', phone);
      return null;
    } catch (error) {
      console.error('[CRM_API_ERROR] Failed to get customer from CRM:', error);
      return null;
    }
  },
  
  createCustomerInCRM: async (contact) => {
    console.log('[CRM_API] Creating customer in CRM:', contact);
    
    try {
      // 模拟 CRM API 调用
      console.log('[CRM_API] Mock API call to create customer:', contact);
      
      // 模拟 API 响应延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 创建模拟 CRM 客户
      const newCustomer: CRMCustomer = {
        id: `crm_${Date.now()}`,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        tags: contact.tags || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastContactTime: Date.now(),
        status: '新建'
      };
      
      // 更新 CRM 客户缓存
      const state = get();
      const updatedCRMCustomers = new Map(state.crmCustomers);
      updatedCRMCustomers.set(contact.phone, newCustomer);
      
      set({ crmCustomers: updatedCRMCustomers });
      console.log('[CRM_API_SUCCESS] Created customer in CRM:', newCustomer.id);
      return newCustomer;
    } catch (error) {
      console.error('[CRM_API_ERROR] Failed to create customer in CRM:', error);
      throw error;
    }
  },
  
  updateCustomerInCRM: async (customerId, updates) => {
    console.log('[CRM_API] Updating customer in CRM:', customerId, updates);
    
    try {
      // 模拟 CRM API 调用
      console.log('[CRM_API] Mock API call to update customer:', customerId, updates);
      
      // 模拟 API 响应延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 更新本地 CRM 客户缓存
      const state = get();
      const updatedCRMCustomers = new Map(state.crmCustomers);
      
      // 查找要更新的客户
      let customerToUpdate: CRMCustomer | undefined;
      for (const customer of updatedCRMCustomers.values()) {
        if (customer.id === customerId) {
          customerToUpdate = customer;
          break;
        }
      }
      
      if (!customerToUpdate) {
        console.error('[CRM_API_ERROR] Customer not found:', customerId);
        throw new Error('Customer not found');
      }
      
      // 更新客户信息
      const updatedCustomer: CRMCustomer = {
        ...customerToUpdate,
        ...updates,
        updatedAt: Date.now()
      };
      
      updatedCRMCustomers.set(updatedCustomer.phone, updatedCustomer);
      set({ crmCustomers: updatedCRMCustomers });
      
      console.log('[CRM_API_SUCCESS] Updated customer in CRM:', customerId);
      return updatedCustomer;
    } catch (error) {
      console.error('[CRM_API_ERROR] Failed to update customer in CRM:', error);
      throw error;
    }
  },
  
  // 智能客户识别功能实现
  identifyCustomer: async (contactId, message) => {
    console.log('[SMART_IDENTIFY] Identifying customer from message:', contactId, message.substring(0, 50) + '...');
    set({ isIdentifyingCustomer: true });
    
    try {
      // 模拟智能识别过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 提取客户信息
      const extractedInfo = get().extractCustomerInfo(message);
      
      // 生成识别结果
      const identificationResult: CustomerIdentificationResult = {
        contactId,
        identifiedInfo: {
          name: extractedInfo.name || undefined,
          email: extractedInfo.email || undefined,
          company: extractedInfo.company || undefined,
          needs: extractedInfo.needs ? extractedInfo.needs.split(',').map(n => n.trim()) : undefined,
          interests: extractedInfo.interests ? extractedInfo.interests.split(',').map(i => i.trim()) : undefined,
          budget: extractedInfo.budget ? parseFloat(extractedInfo.budget) : undefined,
          timeline: extractedInfo.timeline || undefined
        },
        confidence: Math.random() * 0.3 + 0.7, // 70-100% 置信度
        source: 'message_analysis',
        timestamp: Date.now()
      };
      
      // 更新识别结果缓存
      const updatedIdentifications = new Map(get().customerIdentifications);
      updatedIdentifications.set(contactId, identificationResult);
      
      set({ 
        customerIdentifications: updatedIdentifications,
        isIdentifyingCustomer: false 
      });
      
      console.log('[SMART_IDENTIFY_SUCCESS] Customer identified:', identificationResult);
      return identificationResult;
    } catch (error) {
      console.error('[SMART_IDENTIFY_ERROR] Failed to identify customer:', error);
      set({ isIdentifyingCustomer: false });
      throw error;
    }
  },
  
  extractCustomerInfo: (text) => {
    console.log('[INFO_EXTRACT] Extracting customer info from text:', text.substring(0, 100) + '...');
    
    // 简单的信息提取逻辑
    const extracted: Record<string, string> = {};
    
    // 提取邮箱
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) extracted.email = emailMatch[0];
    
    // 提取公司名称
    const companyKeywords = ['公司', '企业', '公司名称', '企业名称'];
    for (const keyword of companyKeywords) {
      const index = text.indexOf(keyword);
      if (index !== -1) {
        const companyMatch = text.substring(index + keyword.length).match(/[\u4e00-\u9fa5a-zA-Z0-9]+/);
        if (companyMatch) extracted.company = companyMatch[0];
      }
    }
    
    // 提取需求
    const needsKeywords = ['需要', '想要', '希望', '需求'];
    for (const keyword of needsKeywords) {
      const index = text.indexOf(keyword);
      if (index !== -1) {
        const needsMatch = text.substring(index + keyword.length).match(/[^，。！？；；]+/);
        if (needsMatch) extracted.needs = needsMatch[0];
      }
    }
    
    // 提取预算
    const budgetKeywords = ['预算', '价格', '费用'];
    for (const keyword of budgetKeywords) {
      const index = text.indexOf(keyword);
      if (index !== -1) {
        const budgetMatch = text.substring(index + keyword.length).match(/\d+(\.\d+)?/);
        if (budgetMatch) extracted.budget = budgetMatch[0];
      }
    }
    
    console.log('[INFO_EXTRACT_SUCCESS] Extracted info:', extracted);
    return extracted;
  },
  
  assessCustomerValue: async (contactId) => {
    console.log('[VALUE_ASSESS] Assessing customer value:', contactId);
    
    try {
      // 模拟价值评估过程
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const state = get();
      const contact = state.contacts.get(contactId);
      const customer = state.crmCustomers.get(contact?.phone || contactId);
      
      // 基于多种因素评估客户价值
      let baseValue = 10000;
      
      // 基于历史互动
      if (customer?.lastContactTime) {
        const daysSinceLastContact = (Date.now() - customer.lastContactTime) / (1000 * 60 * 60 * 24);
        if (daysSinceLastContact < 7) baseValue *= 1.5;
      }
      
      // 基于标签
      if (customer?.tags) {
        if (customer.tags.includes('VIP')) baseValue *= 2;
        if (customer.tags.includes('重要客户')) baseValue *= 1.5;
      }
      
      // 基于状态
      if (customer?.status === '活跃') baseValue *= 1.2;
      
      // 生成最终价值
      const finalValue = Math.round(baseValue * (Math.random() * 0.4 + 0.8)); // 80-120% 的随机波动
      
      console.log('[VALUE_ASSESS_SUCCESS] Customer value assessed:', finalValue);
      return finalValue;
    } catch (error) {
      console.error('[VALUE_ASSESS_ERROR] Failed to assess customer value:', error);
      return 10000; // 默认值
    }
  },
  
  categorizeCustomer: async (contactId) => {
    console.log('[CUSTOMER_CATEGORIZE] Categorizing customer:', contactId);
    
    try {
      // 模拟分类过程
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const state = get();
      const contact = state.contacts.get(contactId);
      const customer = state.crmCustomers.get(contact?.phone || contactId);
      
      const categories: string[] = [];
      
      // 基于互动频率
      if (customer?.lastContactTime) {
        const daysSinceLastContact = (Date.now() - customer.lastContactTime) / (1000 * 60 * 60 * 24);
        if (daysSinceLastContact < 7) categories.push('活跃客户');
        else if (daysSinceLastContact < 30) categories.push('近期客户');
        else categories.push('潜在客户');
      } else {
        categories.push('新客户');
      }
      
      // 基于价值
      if (customer?.value && customer.value > 50000) {
        categories.push('高价值客户');
      } else if (customer?.value && customer.value > 10000) {
        categories.push('中价值客户');
      } else {
        categories.push('普通客户');
      }
      
      // 基于状态
      if (customer?.status === '跟进中') categories.push('跟进中');
      if (customer?.status === '已成交') categories.push('已成交');
      
      console.log('[CUSTOMER_CATEGORIZE_SUCCESS] Customer categorized:', categories);
      return categories;
    } catch (error) {
      console.error('[CUSTOMER_CATEGORIZE_ERROR] Failed to categorize customer:', error);
      return ['普通客户'];
    }
  },
  
  updateCustomerProfileFromMessages: async (contactId) => {
    console.log('[PROFILE_UPDATE] Updating customer profile from messages:', contactId);
    
    try {
      // 模拟从消息更新客户资料
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const state = get();
      const contact = state.contacts.get(contactId);
      
      if (!contact) {
        console.error('[PROFILE_UPDATE_ERROR] Contact not found:', contactId);
        return;
      }
      
      // 这里应该从聊天记录中获取消息并分析
      // 由于没有实际的消息存储，这里模拟一个消息
      const mockMessage = `您好，我是${contact.name}，来自${contact.email ? contact.email.split('@')[1].split('.')[0] : '未知公司'}，我们需要了解您的产品和服务。`;
      
      // 识别客户信息
      const identification = await state.identifyCustomer(contactId, mockMessage);
      
      // 更新客户信息
      if (identification.identifiedInfo) {
        const updates: Partial<Contact> = {};
        
        if (identification.identifiedInfo.name) updates.name = identification.identifiedInfo.name;
        if (identification.identifiedInfo.email) updates.email = identification.identifiedInfo.email;
        if (identification.identifiedInfo.company) updates.country = identification.identifiedInfo.company;
        if (identification.identifiedInfo.needs) updates.status = identification.identifiedInfo.needs.join(', ');
        
        if (Object.keys(updates).length > 0) {
          state.updateContact(contactId, updates);
        }
      }
      
      // 同步到 CRM
      await state.syncContactWithCRM(contactId);
      
      console.log('[PROFILE_UPDATE_SUCCESS] Customer profile updated:', contactId);
    } catch (error) {
      console.error('[PROFILE_UPDATE_ERROR] Failed to update customer profile:', error);
    }
  },
  
  // 分析和报表功能实现
  getCustomerAnalytics: async (contactId) => {
    console.log('[ANALYTICS] Getting customer analytics:', contactId);
    
    try {
      const state = get();
      const contact = state.contacts.get(contactId);
      
      if (!contact) {
        console.error('[ANALYTICS_ERROR] Contact not found:', contactId);
        throw new Error('Contact not found');
      }
      
      // 检查缓存
      const cachedAnalytics = state.analyticsData.get(contactId);
      if (cachedAnalytics) {
        console.log('[ANALYTICS_CACHE] Using cached analytics:', contactId);
        return cachedAnalytics;
      }
      
      // 模拟分析过程
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 生成分析数据
      const analytics = {
        contactId,
        name: contact.name,
        totalMessages: Math.floor(Math.random() * 100) + 10,
        totalChats: Math.floor(Math.random() * 20) + 1,
        firstContactTime: contact.createdAt,
        lastContactTime: contact.updatedAt,
        responseTime: Math.floor(Math.random() * 300) + 30, // 秒
        conversionRate: Math.random() * 0.5 + 0.2, // 20-70%
        customerValue: await state.assessCustomerValue(contactId),
        taskCompletionRate: Math.random() * 0.4 + 0.6, // 60-100%
        interactionScore: Math.random() * 30 + 70, // 70-100
        tags: contact.tags || []
      };
      
      // 缓存分析结果
      const updatedAnalyticsData = new Map(state.analyticsData);
      updatedAnalyticsData.set(contactId, analytics);
      set({ 
        analyticsData: updatedAnalyticsData,
        lastAnalyticsUpdate: Date.now() 
      });
      
      console.log('[ANALYTICS_SUCCESS] Customer analytics generated:', contactId, analytics);
      return analytics;
    } catch (error) {
      console.error('[ANALYTICS_ERROR] Failed to get customer analytics:', error);
      throw error;
    }
  },
  
  getSalesFunnel: async () => {
    console.log('[ANALYTICS] Getting sales funnel data');
    
    try {
      // 模拟获取销售漏斗数据
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const state = get();
      const totalCustomers = state.contacts.size;
      
      // 生成销售漏斗数据
      const funnel = [
        {
          stage: 'lead',
          count: Math.floor(totalCustomers * 1.5),
          conversionRate: 1.0,
          averageTimeInStage: 7 * 24 * 60 * 60 * 1000
        },
        {
          stage: 'prospect',
          count: Math.floor(totalCustomers * 1.2),
          conversionRate: 0.8,
          averageTimeInStage: 14 * 24 * 60 * 60 * 1000
        },
        {
          stage: 'opportunity',
          count: totalCustomers,
          conversionRate: 0.67,
          averageTimeInStage: 30 * 24 * 60 * 60 * 1000
        },
        {
          stage: 'customer',
          count: Math.floor(totalCustomers * 0.6),
          conversionRate: 0.6,
          averageTimeInStage: 90 * 24 * 60 * 60 * 1000
        },
        {
          stage: 'loyal_customer',
          count: Math.floor(totalCustomers * 0.3),
          conversionRate: 0.5,
          averageTimeInStage: 180 * 24 * 60 * 60 * 1000
        }
      ];
      
      console.log('[ANALYTICS_SUCCESS] Sales funnel data generated:', funnel);
      return funnel;
    } catch (error) {
      console.error('[ANALYTICS_ERROR] Failed to get sales funnel:', error);
      return [];
    }
  },
  
  getTeamPerformance: async () => {
    console.log('[ANALYTICS] Getting team performance data');
    
    try {
      // 模拟获取团队绩效数据
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 生成团队绩效数据
      const performance = [
        {
          memberId: 'member_1',
          name: '销售顾问 1',
          totalCustomers: 50,
          totalMessages: 1200,
          totalTasks: 80,
          completedTasks: 75,
          responseTime: 120,
          customerSatisfaction: 4.8,
          revenueGenerated: 250000
        },
        {
          memberId: 'member_2',
          name: '销售顾问 2',
          totalCustomers: 35,
          totalMessages: 900,
          totalTasks: 60,
          completedTasks: 55,
          responseTime: 90,
          customerSatisfaction: 4.6,
          revenueGenerated: 180000
        },
        {
          memberId: 'member_3',
          name: '销售顾问 3',
          totalCustomers: 42,
          totalMessages: 1050,
          totalTasks: 70,
          completedTasks: 68,
          responseTime: 105,
          customerSatisfaction: 4.7,
          revenueGenerated: 210000
        }
      ];
      
      console.log('[ANALYTICS_SUCCESS] Team performance data generated:', performance);
      return performance;
    } catch (error) {
      console.error('[ANALYTICS_ERROR] Failed to get team performance:', error);
      return [];
    }
  },
  
  getTaskCompletionStats: async () => {
    console.log('[ANALYTICS] Getting task completion stats');
    
    try {
      // 模拟获取任务完成统计
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 生成统计数据
      const stats = {
        total: 120,
        completed: 95,
        completionRate: 0.79
      };
      
      console.log('[ANALYTICS_SUCCESS] Task completion stats generated:', stats);
      return stats;
    } catch (error) {
      console.error('[ANALYTICS_ERROR] Failed to get task completion stats:', error);
      return { total: 0, completed: 0, completionRate: 0 };
    }
  },
  
  getMessageStats: async (days) => {
    console.log('[ANALYTICS] Getting message stats for', days, 'days');
    
    try {
      // 模拟获取消息统计
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 生成统计数据
      const total = Math.floor(Math.random() * 500) + 100;
      const inbound = Math.floor(total * 0.6);
      const outbound = total - inbound;
      
      const stats = {
        total,
        inbound,
        outbound,
        averageResponseTime: Math.floor(Math.random() * 200) + 60
      };
      
      console.log('[ANALYTICS_SUCCESS] Message stats generated:', stats);
      return stats;
    } catch (error) {
      console.error('[ANALYTICS_ERROR] Failed to get message stats:', error);
      return { total: 0, inbound: 0, outbound: 0, averageResponseTime: 0 };
    }
  },
  
  generateCustomerReport: async (contactId, format) => {
    console.log('[REPORT] Generating customer report:', contactId, format);
    
    try {
      // 获取客户分析数据
      const analytics = await get().getCustomerAnalytics(contactId);
      
      // 模拟生成报表
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let reportData = '';
      
      switch (format) {
        case 'json':
          reportData = JSON.stringify(analytics, null, 2);
          break;
        case 'csv':
          reportData = `Contact ID,Name,Total Messages,Total Chats,First Contact,Last Contact,Response Time,Conversion Rate,Customer Value,Task Completion Rate,Interaction Score,Tags\n${contactId},${analytics.name},${analytics.totalMessages},${analytics.totalChats},${new Date(analytics.firstContactTime).toISOString()},${new Date(analytics.lastContactTime).toISOString()},${analytics.responseTime},${analytics.conversionRate},${analytics.customerValue},${analytics.taskCompletionRate},${analytics.interactionScore},${analytics.tags.join(',')}`;
          break;
        case 'pdf':
          reportData = `PDF Report for ${analytics.name} (${contactId})\n\nTotal Messages: ${analytics.totalMessages}\nTotal Chats: ${analytics.totalChats}\nFirst Contact: ${new Date(analytics.firstContactTime).toLocaleString()}\nLast Contact: ${new Date(analytics.lastContactTime).toLocaleString()}\nResponse Time: ${analytics.responseTime} seconds\nConversion Rate: ${(analytics.conversionRate * 100).toFixed(2)}%\nCustomer Value: $${analytics.customerValue}\nTask Completion Rate: ${(analytics.taskCompletionRate * 100).toFixed(2)}%\nInteraction Score: ${analytics.interactionScore}\nTags: ${analytics.tags.join(', ')}`;
          break;
      }
      
      console.log('[REPORT_SUCCESS] Customer report generated:', format, contactId);
      return reportData;
    } catch (error) {
      console.error('[REPORT_ERROR] Failed to generate customer report:', error);
      throw error;
    }
  },
  
  generateSalesReport: async (startDate, endDate, format) => {
    console.log('[REPORT] Generating sales report:', startDate, endDate, format);
    
    try {
      // 获取销售漏斗数据
      const funnel = await get().getSalesFunnel();
      // 获取团队绩效数据
      const performance = await get().getTeamPerformance();
      // 获取任务完成统计
      const taskStats = await get().getTaskCompletionStats();
      // 获取消息统计
      const messageStats = await get().getMessageStats(30);
      
      // 模拟生成报表
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const reportData = {
        period: {
          start: new Date(startDate).toISOString(),
          end: new Date(endDate).toISOString()
        },
        salesFunnel: funnel,
        teamPerformance: performance,
        taskStats,
        messageStats
      };
      
      let reportOutput = '';
      
      switch (format) {
        case 'json':
          reportOutput = JSON.stringify(reportData, null, 2);
          break;
        case 'csv':
          reportOutput = `Report Type,Period Start,Period End,Value\nSales Funnel Stages,${new Date(startDate).toISOString()},${new Date(endDate).toISOString()},${funnel.length}\nTotal Customers,${new Date(startDate).toISOString()},${new Date(endDate).toISOString()},${funnel.reduce((sum, stage) => sum + stage.count, 0)}\nTask Completion Rate,${new Date(startDate).toISOString()},${new Date(endDate).toISOString()},${taskStats.completionRate}\nTotal Messages,${new Date(startDate).toISOString()},${new Date(endDate).toISOString()},${messageStats.total}\nAverage Response Time,${new Date(startDate).toISOString()},${new Date(endDate).toISOString()},${messageStats.averageResponseTime}`;
          break;
        case 'pdf':
          reportOutput = `Sales Report\nPeriod: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}\n\nSales Funnel:\n${funnel.map(stage => `${stage.stage}: ${stage.count} customers (${(stage.conversionRate * 100).toFixed(2)}% conversion)`).join('\n')}\n\nTeam Performance:\n${performance.map(member => `${member.name}: ${member.totalCustomers} customers, $${member.revenueGenerated} revenue`).join('\n')}\n\nTask Stats:\nTotal Tasks: ${taskStats.total}\nCompleted Tasks: ${taskStats.completed}\nCompletion Rate: ${(taskStats.completionRate * 100).toFixed(2)}%\n\nMessage Stats:\nTotal Messages: ${messageStats.total}\nInbound: ${messageStats.inbound}\nOutbound: ${messageStats.outbound}\nAverage Response Time: ${messageStats.averageResponseTime} seconds`;
          break;
      }
      
      console.log('[REPORT_SUCCESS] Sales report generated:', format);
      return reportOutput;
    } catch (error) {
      console.error('[REPORT_ERROR] Failed to generate sales report:', error);
      throw error;
    }
  }
}));

// 导出 CRM 相关类型
export type { CRMCustomer, CustomerIdentificationResult };
