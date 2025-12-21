import React, { useState, useEffect } from 'react';
import { Typography, Space, Avatar, Tag, Image, Button } from 'antd';
import { fetchJsonSafe } from '../utils/fetchSafe.js';
import styles from './Topbar.module.css';

const { Title, Text } = Typography;

const Topbar = ({ customer, activeTab, semanticState, onTabChange, onBrowserToggle }) => {
  const [systemOnline, setSystemOnline] = useState(false);
  
  // 鼓励语列表
  const encouragementList = [
    "客户正在等待回复哦~",
    "让我们给客户一个友好的回应吧！",
    "保持微笑，提供优质服务！",
    "客户是我们的上帝，用心服务！",
    "及时回复，提升客户满意度！",
    "专业解答，赢得客户信任！",
    "耐心倾听，精准回应！",
    "积极沟通，促成合作！",
    "用真诚打动客户的心！",
    "高效服务，创造价值！"
  ];
  
  // 获取随机鼓励语
  const getRandomEncouragement = () => {
    const randomIndex = Math.floor(Math.random() * encouragementList.length);
    return encouragementList[randomIndex];
  };
  
  // 鼓励语状态
  const [encouragement, setEncouragement] = useState(getRandomEncouragement());

  const getStatusLabel = (tab) => {
    switch (tab) {
      case 'chat':
        return <Tag color="blue">聊天中</Tag>;
      case 'orders':
        return <Tag color="green">处理订单</Tag>;
      case 'products':
        return <Tag color="purple">产品查询</Tag>;
      default:
        return <Tag color="gray">就绪</Tag>;
    }
  };

  // 获取系统状态
  useEffect(() => {
    const checkStatus = async () => {
      try {
        console.log('[STATUS_CHECK_START] Checking system status...');
        const url = `/api/status`;
        const result = await fetchJsonSafe(url);
        setSystemOnline(true);
        console.log('[STATUS_CHECK_SUCCESS] System is online');
      } catch (error) {
        console.error('[STATUS_FETCH_ERROR] Error checking system status:', error.message);
        setSystemOnline(false);
        console.log('[STATUS_CHECK_FAILED] System is offline');
      }
    };

    // 初始化检查
    checkStatus();
    
    // 定期检查
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 防御性检查：如果没有客户信息，返回简化版本
  if (!customer) {
    return (
      <div className={styles.topbar}>
        <div className={styles.leftSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div 
              className={styles.logo} 
              style={{ 
                width: 32, 
                height: 32, 
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
                borderRadius: 6, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#fff', 
                fontWeight: 'bold', 
                fontSize: 16, 
                boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              JEV
            </div>
            <span style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
              嘉尔威
            </span>
          </div>
        </div>
        
        <div className={styles.middleSection}>
          <Space direction="vertical" size="small">
            <div className={styles.customerInfo}>
              <span className={styles.customerName}>—</span>
            <span className={styles.encouragementBox}>{encouragement}</span>
            </div>
            <div className={styles.statusInfo}>
              {getStatusLabel(activeTab)}
              <Tag color={systemOnline ? 'green' : 'red'} style={{ marginLeft: '8px' }}>
                {systemOnline ? '系统在线' : '系统离线'}
              </Tag>
            </div>
          </Space>
        </div>
        
        <div className={styles.rightSection}>
          <Space size="middle">
            <Button
              type="default"
              size="small"
              onClick={onBrowserToggle}
            >
              浏览器
            </Button>
            <Avatar size="large">JD</Avatar>
          </Space>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.topbar}>
      <div className={styles.leftSection}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div 
            className={styles.logo} 
            style={{ 
              width: 32, 
              height: 32, 
              background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
              borderRadius: 6, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#fff', 
              fontWeight: 'bold', 
              fontSize: 16, 
              boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            JEV
          </div>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>
            嘉尔威
          </span>
        </div>
      </div>
      
      <div className={styles.middleSection}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className={styles.customerInfo}>
            <span className={styles.customerName}>{customer?.display_name || customer?.customer_name || customer?.name || '—'}</span>
            {customer?.country && customer.country !== '—' && (
              <span className={styles.customerCountry}>· {customer.country}</span>
            )}
            <span className={styles.encouragementBox}>{encouragement}</span>
          </div>
          <div className={styles.statusInfo}>
            {getStatusLabel(activeTab)}
            <Tag color={systemOnline ? 'green' : 'red'} style={{ marginLeft: '8px' }}>
              {systemOnline ? '系统在线' : '系统离线'}
            </Tag>
          </div>
          {/* 业务阶段轻提示 */}
          {semanticState?.intent && (
            <Text type="secondary" style={{ fontSize: '11px', lineHeight: '1.2' }}>
              当前业务阶段：
              {semanticState.intent === 'inquiry' ? '询价中' : '未知阶段'}
              {' · '}
              可下一步：
              {semanticState.next_action === 'ask_product' ? '选择产品' : '默认操作'}
            </Text>
          )}
          

        </div>
      </div>
      
      <div className={styles.rightSection}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {semanticState?.lang && (
            <Tag size="small">
              🌐 {semanticState.lang.toUpperCase()}
            </Tag>
          )}
          {semanticState?.next_action === 'ask_product' && (
            <Button
              size="small"
              type="default"
              onClick={() => onTabChange && onTabChange('products')}
              style={{ padding: '2px 8px', fontSize: '11px' }}
            >
              选择产品
            </Button>
          )}

          <Button
            type="default"
            size="small"
            onClick={onBrowserToggle}
            style={{ padding: '2px 8px', fontSize: '11px' }}
          >
            浏览器
          </Button>
          <Avatar size="small">JD</Avatar>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
