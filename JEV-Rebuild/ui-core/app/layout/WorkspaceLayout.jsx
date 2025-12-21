/**
 * FREEZE_SNAPSHOT: crm_ui_baseline_before_active_fix
 * DO NOT refactor customer selection logic in this version
 */
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchJsonSafe } from '../utils/fetchSafe.js';
import { Layout, Tabs, Badge, Tag, Button, Space, Drawer } from 'antd';
import Topbar from '../components/Topbar';
import CrmPanel from '../modules/crm/CrmPanel';
import CustomerInfoPanel from '../modules/crm/CustomerInfoPanel';
import ChatPanel from '../modules/chat/ChatPanel';
import OrdersPanel from '../modules/orders/OrdersPanel';
import ProductLibrary from '../modules/products/ProductLibrary';
import BrowserPanel from '../modules/browser/BrowserPanel';
import styles from './WorkspaceLayout.module.css';

const { Header, Sider, Content } = Layout;

// 标准化customer_id的函数 - 与后端normalizeUserId保持一致
const canonicalCustomerId = (id) => {
  return String(id || '')
    .trim()
    .toLowerCase();
};

const WorkspaceLayout = () => {
  // 必须在最顶部的state声明
  const [activeCustomerId, setActiveCustomerId] = useState(null);
  const [messagesMap, setMessagesMap] = useState({});
  
  // 其他state声明
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [browserVisible, setBrowserVisible] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [aiDraftText, setAiDraftText] = useState('');
  const [aiReplyMode, setAiReplyMode] = useState('semi-auto');
  const [chatDraftText, setChatDraftText] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [semanticState, setSemanticState] = useState({
    intent: 'inquiry',
    next_action: 'ask_product',
    lang: 'en'
  });
  const [tempCustomers, setTempCustomers] = useState({});
  const [newSessionSet, setNewSessionSet] = useState(new Set());
  const [unreadCountMap, setUnreadCountMap] = useState({});
  const [uiVersion, setUiVersion] = useState(0);
  
  // 选中客户ID的ref，用于新会话检测
  const selectedCustomerIdRef = useRef(null);
  
  // 记录当前激活会话的时间戳
  const activeCustomerTsRef = useRef(0);
  
  // 用户选择锁：标记是否为用户手动选择的客户
  const userSelectedRef = useRef(false);
  
  // 修复 customers 派生排序（核心）
  const sortedCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    
    return [...customers].sort(
      (a, b) => (b.last_ts || 0) - (a.last_ts || 0)
    );
  }, [customers]);
  
  // 客户选择函数 - 由CrmPanel直接调用
  const handleSelectCustomer = (customerId) => {
    // 明确标记这是用户行为
    userSelectedRef.current = true;
    
    const normalizedId = canonicalCustomerId(customerId);
    setActiveCustomerId(normalizedId);
    try {
      localStorage.setItem('jev_selected_customer_id', normalizedId);
    } catch (error) {
      console.error('Failed to save selected customer ID to localStorage:', error);
    }
  };
  
  // AI 草稿操作回调函数
  const handleAdoptAiDraft = (draftText) => {
    setChatDraftText(draftText);
  };
  
  const handleRegenerateAiDraft = () => {
    setAiDraftText('');
  };
  
  const handleIgnoreAiDraft = () => {
    setAiDraftText('');
  };
  
  // 从URL参数中解析conversationId
  const getConversationIdFromUrl = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('conversationId') || null;
    } catch (error) {
      console.error('Failed to parse URL params:', error);
      return null;
    }
  };
  
  // 添加/更新客户方法（upsert）
  const upsertCustomer = (customerData) => {
    if (window.__UI_FREEZE__) {

      return;
    }
    
    setCustomers(prev => {
      const existingIndex = prev.findIndex(c => c.id === customerData.id);
      let updated;
      
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...customerData,
          lastContact: new Date().toISOString().split('T')[0],
          lastMessageAt: Date.now(),
          hasUnread: true
        };
      } else {
        updated = [{
          ...customerData,
          lastMessageAt: Date.now(),
          hasUnread: true
        }, ...prev];
      }
      
      updated.sort((a, b) => {
        const aHasUnread = unreadCountMap[a.id] > 0 || a.hasUnread;
        const bHasUnread = unreadCountMap[b.id] > 0 || b.hasUnread;
        if (aHasUnread && !bHasUnread) return -1;
        if (!aHasUnread && bHasUnread) return 1;
        return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
      });
      
      try {
        localStorage.setItem('jev_daojie_conversations', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save customers to localStorage:', error);
      }
      
      return updated;
    });
    
    if (customerData.id !== selectedCustomerIdRef.current) {
      setNewSessionSet(prev => {
        const updated = new Set(prev);
        if (!updated.has(customerData.id)) {
          updated.add(customerData.id);

        }
        return updated;
      });
      
      setUnreadCountMap(prev => {
        const currentCount = prev[customerData.id] || 0;
        return {
          ...prev,
          [customerData.id]: currentCount + 1
        };
      });
    }
  };
  
  // 处理 Daojie 消息
  const onDaojieMessage = (message) => {
    if (window.__UI_FREEZE__) {

      return;
    }
    

    const normalizedCustomerId = canonicalCustomerId(message.customer_id);
    
    upsertCustomer({
      id: normalizedCustomerId,
      customer_id: normalizedCustomerId,
      name: message.display_name || normalizedCustomerId,
      country: 'CN',
      status: 'active',
      lastMessageAt: Date.now(),
      source: 'daojie',
      display_name: message.display_name || normalizedCustomerId
    });
    
    appendMessage(normalizedCustomerId, message);
    
    if (!activeCustomerId) {

      setActiveCustomerId(normalizedCustomerId);
    }
  };
  
  // 聊天记录缓存管理函数
  const manageChatCache = (customerId, messages) => {
    try {
      const cache = JSON.parse(localStorage.getItem('jev_chat_cache_v1') || '{}');
      const customerMessages = [...(cache[customerId] || []), ...messages];
      cache[customerId] = customerMessages;
      localStorage.setItem('jev_chat_cache_v1', JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to manage chat cache:', error);
    }
  };
  
  // 添加新消息到指定客户，并写入缓存
  const appendMessage = (customerId, message) => {
    if (window.__UI_FREEZE__) {

      return;
    }
    
    setMessagesMap(prev => {
      const currentMessages = prev[customerId] || [];
      const updatedMessages = [...currentMessages, { ...message, customer_id: customerId }];
      manageChatCache(customerId, [{ ...message, customer_id: customerId }]);
      return {
        ...prev,
        [customerId]: updatedMessages
      };
    });
  };
  
  // 计算当前选中的客户（仅用于展示）
  const selectedCustomer = useMemo(() => {
    if (!activeCustomerId) return null;
    
    let customer = customers.find(c => c.id === activeCustomerId || c.customer_id === activeCustomerId);
    
    if (!customer) {
      customer = {
        id: activeCustomerId,
        conversationId: activeCustomerId,
        name: activeCustomerId,
        customer_id: activeCustomerId,
        display_name: activeCustomerId,
        country: '未知',
        status: 'active'
      };
    }
    
    return customer;
  }, [customers, activeCustomerId]);
  
  // 处理产品选择
  const handleProductSelect = (products) => {
    setSelectedProducts(products);
    
    if (products.length > 0) {
      setSemanticState(prev => ({
        ...prev,
        next_action: 'generate_pi'
      }));
    } else {
      setSemanticState(prev => ({
        ...prev,
        next_action: 'ask_product'
      }));
    }
  };
  
  // 删除客户功能
  const deleteCustomer = (customerId) => {
    if (window.__UI_FREEZE__) {

      return;
    }
    
    if (!customerId) return;
    

    
    setCustomers(prev => {
      const nextCustomers = prev.filter(c => c.id !== customerId);
      
      try {
        localStorage.setItem('jev_daojie_conversations', JSON.stringify(nextCustomers));
      } catch (error) {
        console.error('[CUSTOMER][DELETE] failed to update localStorage:', error);
      }
      
      return nextCustomers;
    });
    
    if (activeCustomerId === customerId) {
      setActiveCustomerId(null);
      try {
        localStorage.removeItem('jev_selected_customer_id');
      } catch (error) {
        console.error('[CUSTOMER][DELETE] failed to clear selected customer from localStorage:', error);
      }
    }
  };
  
  // 检查HTTP状态，判断系统是否在线
  useEffect(() => {
    if (window.__UI_FREEZE__) return;
    
    const checkHttpStatus = async () => {
      if (window.__UI_FREEZE__) return;
      
      try {
        const url = `/api/health`;
        const result = await fetchJsonSafe(url);
        
        if (window.__UI_FREEZE__) return;
        
        if (result.ok && result.data.ok === true) {
          setIsOnline(true);
          // 简化日志输出，避免重复刷屏
          if (window.__DEV_LOG__ === true) {
            console.info('[SYSTEM_STATUS] ONLINE (http-only, stable)');
          }
        } else {
          setIsOnline(false);
        }
      } catch (error) {
        if (!window.__UI_FREEZE__) {
          setIsOnline(false);
          console.error('[SYSTEM_STATUS_ERROR]', error.message);
        }
      }
    };
    
    checkHttpStatus();
    
    let interval;
    if (!window.__UI_FREEZE__) {
      interval = setInterval(checkHttpStatus, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);
  
  // 全局桥接函数 - 必须进useEffect
  useEffect(() => {
    window.__FORCE_SELECT_CUSTOMER__ = (customerId) => {
      if (!customerId) return;
      // 明确标记这是用户行为
      userSelectedRef.current = true;
      const normalizedId = canonicalCustomerId(customerId);
      setActiveCustomerId(normalizedId);
      console.log("[ACTIVE_CUSTOMER]", normalizedId);
      try {
        localStorage.setItem('jev_selected_customer_id', normalizedId);
      } catch (error) {
        console.error('Failed to save selected customer ID to localStorage:', error);
      }
    };
    
    // 强制设置全局状态
    window.__WS_DISABLED = true;
    window.__CHANNEL = 'http-only';
    
    return () => {
      delete window.__FORCE_SELECT_CUSTOMER__;
    };
  }, []);
  
  // 从Worker获取客户列表
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // 1. 定义相对路径的API端点
        const CUSTOMERS_API = '/api/inbox/customers';
        
        // 2. 防御校验：确保API路径是相对路径
        if (CUSTOMERS_API.startsWith('http')) {
          throw new Error('CUSTOMERS_API must be relative path');
        }
        
        const url = `${CUSTOMERS_API}`;
        
        // 5. 发起请求 - 固定cache bust参数（止血用）
        const cacheBustedUrl = `${url}?_t=1234567890`; // 固定为常量，防止缓存风暴
        const result = await fetchJsonSafe(cacheBustedUrl, {
          cache: "no-store"
        });
        
        const customersFromWorker = Array.isArray(result.data.customers) ? result.data.customers : [];
        
        // ✅ 新逻辑（必须）：强制深拷贝，彻底打断引用关系
        const nextCustomers = customersFromWorker.map(c => ({
          customer_id: c.customer_id,
          display_name: c.display_name,
          last_ts: c.last_ts,
          last_message_at: c.last_message_at,
          last_message: c.last_message,
          business_stage: c.business_stage,
          source: c.source
        }));
        
        // ✅ 相同数据拦截：避免不必要的render
        setCustomers(prev => {
          // 检查长度是否相同
          if (prev.length !== nextCustomers.length) {
            return nextCustomers;
          }
          // 检查每个客户的ID是否相同
          const isSame = prev.every((p, i) => p.customer_id === nextCustomers[i].customer_id);
          if (isSame) {
            return prev; // 相同数据不触发render
          }
          return nextCustomers;
        });
      } catch (error) {
        // 静默处理错误，避免控制台刷屏
        console.error('[CUSTOMERS_FETCH_ERROR]', error.message);
      }
    };
    
    fetchCustomers();
    
    const interval = setInterval(fetchCustomers, 30000);
    
    return () => clearInterval(interval);
  }, []); // 移除customers依赖，避免effect → fetch → set → effect闭环
  
  // 自动选择最新客户（如果没有活跃客户或新消息）
  useEffect(() => {
    // 使用sortedCustomers而不是customers，确保与UI显示顺序一致
    if (!sortedCustomers || sortedCustomers.length === 0) return;

    // 如果是用户已选择的客户，禁止自动覆盖
    if (userSelectedRef.current) {
      return;
    }

    const latestId = sortedCustomers[0].customer_id;

    // 保护条件：仅在当前activeCustomerId为空时触发
    if (latestId && latestId !== activeCustomerId && !activeCustomerId) {
      setActiveCustomerId(latestId);
    }
  }, [sortedCustomers, activeCustomerId]);
  
  // 更新ref当activeCustomerId变化时
  useEffect(() => {
    selectedCustomerIdRef.current = activeCustomerId;
  }, [activeCustomerId]);
  
  // 当activeCustomerId改变时，更新时间戳ref
  useEffect(() => {
    const current = customers.find(
      c => c.customer_id === activeCustomerId
    );
    if (current?.last_ts) {
      activeCustomerTsRef.current = current.last_ts;
    }
  }, [activeCustomerId, customers]);
  
  // 新会话提示状态管理 - 初始化
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jev_new_session_set');
      if (saved) {
        setNewSessionSet(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Failed to load new session set from localStorage:', error);
    }
  }, []);
  
  // 保存newSessionSet到localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jev_new_session_set', JSON.stringify([...newSessionSet]));
    } catch (error) {
      console.error('Failed to save new session set to localStorage:', error);
    }
  }, [newSessionSet]);
  
  // 会话级未读计数管理 - 初始化
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jev_unread_count_map');
      if (saved) {
        setUnreadCountMap(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load unread count map from localStorage:', error);
    }
  }, []);
  
  // 保存unreadCountMap到localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jev_unread_count_map', JSON.stringify(unreadCountMap));
    } catch (error) {
      console.error('Failed to save unread count map to localStorage:', error);
    }
  }, [unreadCountMap]);
  
  // 初始化选中的客户ID
  useEffect(() => {
    try {
      const urlConversationId = getConversationIdFromUrl();
      if (urlConversationId) {
        const normalizedId = canonicalCustomerId(urlConversationId);
        setActiveCustomerId(normalizedId);
        return;
      }
      
      const cachedId = localStorage.getItem('jev_selected_customer_id');
      if (cachedId) {
        const normalizedId = canonicalCustomerId(cachedId);
        setActiveCustomerId(normalizedId);
      }
    } catch (error) {
      console.error('Failed to load selected customer ID:', error);
    }
  }, []);
  
  // 在 customers 更新时，做 last_ts 对比切换
  useEffect(() => {
    if (!customers || customers.length === 0) return;

    // 如果是用户已选择的客户，禁止自动覆盖
    if (userSelectedRef.current) {
      return;
    }

    const latest = customers[0];
    const latestTs = latest.last_ts || 0;
    const activeTs = activeCustomerTsRef.current || 0;

    // 保护条件：只在没有activeCustomerId时触发，尊重用户手动选择
    if (!activeCustomerId && latest.customer_id !== activeCustomerId && latestTs > activeTs) {
      setActiveCustomerId(latest.customer_id);
    }
  }, [customers.length, activeCustomerId, customers.map(c => c.customer_id).join(',')]);
  
  const tabItems = [
    {
      key: 'chat',
      label: '聊天',
      children: <ChatPanel 
          activeCustomerId={activeCustomerId}
          messagesMap={messagesMap}
          setMessagesMap={setMessagesMap}
          customer={selectedCustomer} 
          onAIDraftChange={setAiDraftText} 
          aiReplyMode={aiReplyMode}
          chatDraftText={chatDraftText}
          onNewMessageCustomer={upsertCustomer}
        />
    },
    {
      key: 'orders',
      label: (
        <span>
          PI / 订单
          {semanticState.next_action === 'ask_product' && (
            <Tag color="gray" size="small" style={{ marginLeft: 8 }}>
              尚未创建
            </Tag>
          )}
        </span>
      ),
      children: <OrdersPanel 
          customer={selectedCustomer} 
        />
    },
    {
      key: 'products',
      label: (
        <Space size="small">
          <Badge dot={semanticState.intent === 'inquiry'}>
            <span>产品库</span>
          </Badge>
          {semanticState.next_action === 'ask_product' && activeTab !== 'products' && (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setActiveTab('products');
              }}
            >
              去选择产品
            </Button>
          )}
        </Space>
      ),
      children: <ProductLibrary 
          onProductSelect={handleProductSelect} 
        />
    }
  ];

  return (
    <Layout className={styles.workspace}>
      <Header className={styles.header}>
        <Topbar 
          customer={selectedCustomer} 
          activeTab={activeTab}
          semanticState={semanticState}
          onTabChange={setActiveTab}
          onBrowserToggle={() => setBrowserVisible(true)}
        />
      </Header>
      <Layout className={styles.mainLayout}>
        <Sider className={styles.leftSider} width={280}>
          <div data-customer-id="">
            <CrmPanel 
              key={`crm-${activeCustomerId}-${uiVersion}`}
              customers={sortedCustomers || []}
              selectedCustomer={selectedCustomer}
              newSessionSet={newSessionSet}
              unreadCountMap={unreadCountMap}
              onSelectCustomer={handleSelectCustomer}
              onDeleteCustomer={deleteCustomer}
            />
          </div>
        </Sider>
        <Content className={styles.content}>
          <div 
            data-customer-id={activeCustomerId}
          >
            <Tabs 
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              className={styles.tabs}
            />
          </div>
        </Content>
        <Sider className={styles.rightSider} width={320}>
          <div 
            data-customer-id={activeCustomerId}
          >
            <CustomerInfoPanel 
              customer={selectedCustomer} 
              aiDraftText={aiDraftText} 
              messages={messagesMap[activeCustomerId] || []} 
              aiReplyMode={aiReplyMode}
              setAiReplyMode={setAiReplyMode}
              onAdoptAiDraft={handleAdoptAiDraft}
              onRegenerateAiDraft={handleRegenerateAiDraft}
              onIgnoreAiDraft={handleIgnoreAiDraft}
            />
          </div>
        </Sider>
      </Layout>

      {/* 浏览器抽屉 */}
      <Drawer
        title="浏览器"
        placement="right"
        onClose={() => setBrowserVisible(false)}
        open={browserVisible}
        width={800}
      >
        <BrowserPanel />
      </Drawer>
    </Layout>
  );
};

export default WorkspaceLayout;