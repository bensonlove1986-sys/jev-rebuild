/**
 * FREEZE_SNAPSHOT: crm_ui_baseline_before_active_fix
 * Visual behavior frozen for rollback safety
 */
import React, { useState, useEffect } from 'react';
import { Typography, Tag, Input, Modal, Form, Button, Select, Card } from 'antd';
import styles from './CrmPanel.module.css';
import { WORKER_BASE } from '../../config/constants.js';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const CrmPanel = ({ customers = [], selectedCustomer, onSelectCustomer, onDeleteCustomer = () => {}, newSessionSet = new Set(), unreadCountMap = {} }) => {
  // 状态管理：添加客户模态框
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  // 状态管理：表单数据
  const [form] = Form.useForm();
  // 状态管理：客户配置文件
  const [customerProfile, setCustomerProfile] = useState(null);
  // 状态管理：加载状态
  const [loading, setLoading] = useState(false);
  
  // 商业阶段映射（英文 -> 中文显示）
  const businessStageMap = {
    'new': { label: '新询盘', color: 'red' },
    'following': { label: '跟进中', color: 'orange' },
    'quoting': { label: '报价中', color: 'blue' },
    'ordered': { label: '已下单', color: 'green' },
    'lost': { label: '流失', color: 'gray' }
  };
  
  // 获取商业阶段标签
  const getBusinessStageTag = (stage) => {
    const stageInfo = businessStageMap[stage] || businessStageMap['new'];
    return <Tag color={stageInfo.color}>{stageInfo.label}</Tag>;
  };
  
  // 获取客户配置文件
  const fetchCustomerProfile = async (customerId) => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${WORKER_BASE}/api/customer/profile?customer_id=${customerId}`);
      const data = await response.json();
      if (data.ok) {
        setCustomerProfile(data.profile);
      }
    } catch (error) {
      console.error('[CRM] Failed to fetch customer profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 更新客户阶段
  const updateCustomerStage = async (customerId, businessStage) => {
    if (!customerId || !businessStage) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${WORKER_BASE}/api/customer/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: customerId,
          business_stage: businessStage
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        // 刷新客户配置文件
        await fetchCustomerProfile(customerId);
        // 触发父组件刷新客户列表
        window.location.reload();
      }
    } catch (error) {
      console.error('[CRM] Failed to update customer stage:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 监听选中客户变化
  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchCustomerProfile(selectedCustomer.id);
    }
  }, [selectedCustomer?.id]);
  
  const getStatusTag = (status) => {
    switch (status) {
      case 'active':
        return <Tag color="green">活跃</Tag>;
      case 'pending':
        return <Tag color="orange">跟进中</Tag>;
      case 'inactive':
        return <Tag color="gray">休眠</Tag>;
      default:
        return <Tag color="gray">未知</Tag>;
    }
  };
  
  // 处理添加客户
  const handleAddCustomer = () => {
    form.validateFields()
      .then(values => {
        // 关闭模态框
        setIsAddModalVisible(false);
        // 这里可以添加调用父组件添加客户的逻辑
        console.log('[CRM] Adding customer:', values);
        // 重置表单
        form.resetFields();
      })
      .catch(info => {
        console.error('[CRM] Form validation failed:', info);
      });
  };
  
  // 处理模态框取消
  const handleCancelAdd = () => {
    setIsAddModalVisible(false);
    form.resetFields();
  };
  
  return (
    <div className={styles.crmPanel}>
      <div className={styles.header}>
        <Title level={4} className={styles.title}>
          客户列表
        </Title>
        <Search
          placeholder="搜索客户"
          size="small"
          className={styles.search}
        />
      </div>

      {/* 主内容区：仅客户列表 */}
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden' 
      }}>
        {/* 视觉顺序断言日志 */}
        {console.log(
          '[CRM_VISUAL_ORDER]',
          customers.map(c => c.customer_id)
        )}
        
        {/* 客户列表 - 仅显示用户名和未读 */}
        <div className={`${styles.customerList} customer-list`} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          overflowY: 'auto', 
          flex: 1 
        }}>
          {customers.length > 0 ? (
          customers.map((customer, index) => {
            // 计算稳定的customerId，与key使用相同来源
            // 优先使用customer_id（Worker返回的字段）
            const customerId = customer.customer_id || customer.id || customer._id || `cid-${index}`;
            
            // 强制可视验证日志
            console.log('[RENDER_CUSTOMER_ITEM]', customer.customer_id, customer.display_name);
            
            // 计算未读数量
            const unreadCount = unreadCountMap[customer.id] || unreadCountMap[customerId] || 0;
            
            return (
              <div
                key={customer.customer_id}
                data-customer-id={customer.customer_id}
                className={`${styles.customerItem} ${selectedCustomer?.customer_id === customer.customer_id ? styles.selected : ''}`}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  position: 'relative',
                  zIndex: 1
                }}
                onClick={() => {
                  // 显式防御undefined
                  if (!customer.customer_id) return;
                  
                  console.log('[USER_CLICK]', customer.customer_id);
                  onSelectCustomer(customer.customer_id);
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  width: '100%' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {/* 显示客户名，严格按优先级：display_name > customer_name > customer_id */}
                    <Text strong>{customer.display_name || customer.customer_name || customerId}</Text>
                    {/* 显示未读计数 */}
                    {unreadCount > 0 && (
                      <span style={{ 
                        marginLeft: '8px',
                        padding: '2px 8px', 
                        backgroundColor: '#ff4d4f', 
                        color: 'white', 
                        borderRadius: '12px', 
                        fontSize: '12px',
                        fontWeight: 'bold',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
          ) : (
            <div className={styles.emptyList}>
              <h4>暂无客户</h4>
              <p>客户数据将从服务器获取</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrmPanel;
