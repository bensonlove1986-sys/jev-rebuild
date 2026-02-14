import { create } from 'zustand';
import { eventBus } from '../utils/eventBus';

// 完整的客户类型，支持CRM系统
export interface Customer {
  customer_id: string;
  phone: string;
  stable_name?: string;
  display_name?: string;
  status: string;
  email?: string;
  address?: string;
  tags: string[];
  channel_sources: string[];
  last_message_at?: number;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
}

interface CustomersState {
  customers: Customer[];
  selectedCustomerId: string | null;
  isLoading: boolean;
  error: string | null;
  addMessage: (payload: any) => void;
  selectCustomer: (customerId: string) => void;
  markAsRead: (customerId: string) => void;
  fetchCustomers: () => Promise<void>;
  getCustomerById: (customerId: string) => Customer | undefined;
  createCustomer: (customerData: Omit<Customer, 'customer_id' | 'unreadCount'>) => void;
  updateCustomer: (customerId: string, customerData: Partial<Customer>) => void;
  deleteCustomer: (customerId: string) => void;
  deleteCustomers: (customerIds: string[]) => void;
  initCustomers: () => void;
}

// 创建完整的customersStore，支持CRM系统
export const useCustomersStore = create<CustomersState>((set, get) => {
  // 生成唯一客户ID
  const generateCustomerId = () => {
    return `customer_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  };

  // 处理新消息，更新客户列表
  const addMessage = (payload: any) => {
    set((state) => {
      // 处理不同来源的消息格式
      let from: string;
      let text: string;
      let timestamp: number;
      
      // 处理来自 WhatsAppInboxService 的消息（customer_id 格式）
      if (payload.customer_id) {
        from = payload.customer_id;
        text = payload.text || '';
        timestamp = payload.timestamp || 0;
      }
      // 处理直接来自 WhatsAppInboxService 的消息（from 格式）
      else if (payload.from && payload.text) {
        from = payload.from;
        text = payload.text;
        timestamp = payload.timestamp || 0;
      } 
      // 处理来自 Twilio Webhook 的消息
      else if (payload.message && payload.message.from) {
        from = payload.message.from.replace('whatsapp:', '');
        text = payload.message.body || '';
        timestamp = payload.timestamp || 0;
      } 
      // 处理来自 SSE 的消息
      else if (payload.channel === 'whatsapp') {
        from = payload.from;
        text = payload.text || '';
        timestamp = payload.timestamp || 0;
      } 
      // 处理其他格式的消息
      else {
        from = payload.from || payload.phone || '';
        text = payload.text || payload.message || payload.body || '';
        timestamp = payload.timestamp || 0;
      }
      
      // 清理手机号，移除可能的 whatsapp: 前缀
      const phone = from.replace(/^whatsapp:/i, '');
      
      // 检查是否已存在该手机号的会话
      const existingIndex = state.customers.findIndex(c => c.phone === phone || c.customer_id === phone);
      
      if (existingIndex !== -1) {
        // 更新现有会话
        const updatedCustomers = [...state.customers];
        const customer = updatedCustomers[existingIndex];
        
        updatedCustomers[existingIndex] = {
          ...customer,
          lastMessage: text,
          lastMessageTime: timestamp,
          last_message_at: timestamp,
          unreadCount: customer.unreadCount + 1
        };
        
        // 将更新后的会话移到列表顶部
        const [updatedCustomer] = updatedCustomers.splice(existingIndex, 1);
        updatedCustomers.unshift(updatedCustomer);
        
        return {
          customers: updatedCustomers
        };
      } else {
        // 创建新会话
        const newCustomer: Customer = {
          customer_id: generateCustomerId(),
          phone,
          status: 'active',
          tags: [],
          channel_sources: [],
          lastMessage: text,
          lastMessageTime: timestamp,
          last_message_at: timestamp,
          unreadCount: 1
        };
        
        return {
          customers: [newCustomer, ...state.customers],
          // 自动选中新会话
          selectedCustomerId: newCustomer.customer_id
        };
      }
    });
  };

  // 选择客户
  const selectCustomer = (customerId: string) => {
    set((state) => {
      console.log('[CUSTOMERS_STORE] Selecting customer:', customerId);
      // 标记为已读
      const updatedCustomers = state.customers.map(c => 
        c.customer_id === customerId ? { ...c, unreadCount: 0 } : c
      );
      
      return {
        selectedCustomerId: customerId,
        customers: updatedCustomers
      };
    });
  };

  // 标记为已读
  const markAsRead = (customerId: string) => {
    set((state) => {
      const updatedCustomers = state.customers.map(c => 
        c.customer_id === customerId ? { ...c, unreadCount: 0 } : c
      );
      
      return {
        customers: updatedCustomers
      };
    });
  };

  // 根据ID获取客户
  const getCustomerById = (customerId: string) => {
    return get().customers.find(c => c.customer_id === customerId);
  };

  // 创建客户
  const createCustomer = (customerData: Omit<Customer, 'customer_id' | 'unreadCount'>) => {
    set((state) => {
      const newCustomer: Customer = {
        ...customerData,
        customer_id: generateCustomerId(),
        unreadCount: 0,
        tags: customerData.tags || [],
        channel_sources: customerData.channel_sources || []
      };
      
      return {
        customers: [newCustomer, ...state.customers]
      };
    });
  };

  // 更新客户
  const updateCustomer = (customerId: string, customerData: Partial<Customer>) => {
    set((state) => {
      const updatedCustomers = state.customers.map(c => 
        c.customer_id === customerId ? { ...c, ...customerData } : c
      );
      
      return {
        customers: updatedCustomers
      };
    });
  };

  // 删除客户
  const deleteCustomer = (customerId: string) => {
    set((state) => {
      const updatedCustomers = state.customers.filter(c => c.customer_id !== customerId);
      
      return {
        customers: updatedCustomers,
        selectedCustomerId: state.selectedCustomerId === customerId ? null : state.selectedCustomerId
      };
    });
  };

  // 批量删除客户
  const deleteCustomers = (customerIds: string[]) => {
    set((state) => {
      const updatedCustomers = state.customers.filter(c => !customerIds.includes(c.customer_id));
      
      return {
        customers: updatedCustomers,
        selectedCustomerId: customerIds.includes(state.selectedCustomerId || '') ? null : state.selectedCustomerId
      };
    });
  };

  // 初始化客户
  const initCustomers = () => {
    get().fetchCustomers();
  };

  // 加载客户列表
  const fetchCustomers = async () => {
    set({ isLoading: true, error: null });
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 添加测试客户数据
      const testCustomers: Customer[] = [
        {
          customer_id: 'customer_1',
          phone: '+1234567890',
          stable_name: '测试客户 1',
          display_name: '测试客户 1',
          status: 'active',
          email: 'test1@example.com',
          address: '北京市朝阳区',
          tags: ['VIP', '新客户'],
          channel_sources: ['chat', 'orders'],
          last_message_at: Date.now() - 3600000,
          lastMessage: '你好，这是一条测试消息',
          lastMessageTime: Date.now() - 3600000,
          unreadCount: 2
        },
        {
          customer_id: 'customer_2',
          phone: '+0987654321',
          stable_name: '测试客户 2',
          display_name: '测试客户 2',
          status: 'inactive',
          email: 'test2@example.com',
          address: '上海市浦东新区',
          tags: ['老客户'],
          channel_sources: ['products', 'shopify'],
          last_message_at: Date.now() - 7200000,
          lastMessage: 'Hello, this is a test message',
          lastMessageTime: Date.now() - 7200000,
          unreadCount: 1
        },
        {
          customer_id: 'customer_3',
          phone: '+1112223334',
          stable_name: '测试客户 3',
          display_name: '测试客户 3',
          status: 'pending',
          email: 'test3@example.com',
          address: '广州市天河区',
          tags: ['高价值'],
          channel_sources: ['facebook', 'youtube'],
          last_message_at: Date.now() - 10800000,
          lastMessage: 'I have a question about your products',
          lastMessageTime: Date.now() - 10800000,
          unreadCount: 0
        }
      ];
      
      set({ 
        customers: testCustomers, 
        isLoading: false,
        error: null
      });
      console.log('CUSTOMERS_UPDATED', testCustomers.length);
      console.log('[CUSTOMERS_STORE] Loaded test customers:', testCustomers.length);
    } catch (error) {
      set({ 
        error: '加载客户失败', 
        isLoading: false 
      });
      console.error('[CUSTOMERS_STORE] Error loading customers:', error);
    }
  };

  return {
    customers: [], // 初始值为空数组
    selectedCustomerId: null,
    isLoading: false,
    error: null,
    addMessage,
    selectCustomer,
    markAsRead,
    fetchCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    deleteCustomers,
    initCustomers
  };
});
