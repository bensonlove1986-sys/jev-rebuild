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

      {/* 主内容区：左右布局 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 客户列表 - 使用原始div结构 */}
        <div className={`${styles.customerList} customer-list`} style={{ overflowY: 'auto', flex: 1, borderRight: '1px solid #f0f0f0' }}>
          {customers.length > 0 ? (
          customers.map((customer, index) => {
            // 计算稳定的customerId，与key使用相同来源
            // 优先使用customer_id（Worker返回的字段）
            const customerId = customer.customer_id || customer.id || customer._id || `cid-${index}`;
            
            // 强制可视验证日志
            console.log('[RENDER_CUSTOMER_ITEM]', customer.customer_id, customer.display_name);
            
            return (
              <div
                key={customer.customer_id || customerId}
                data-customer-id={customerId}
                className={`${styles.customerItem} ${selectedCustomer?.id === customerId ? styles.selected : ''}`}
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
                  if (!customerId) return;
                  
                  console.log('[USER_CLICK]', customerId);
                  window.__FORCE_SELECT_CUSTOMER__(customerId);
                }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {/* 显示客户名，严格按优先级：display_name > customer_name > customer_id */}
                      <Text strong>{customer.display_name || customer.customer_name || customerId}</Text>
                      {/* 显示未读计数 */}
                      {(unreadCountMap[customer.id] || unreadCountMap[customerId]) > 0 && (
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
                          {unreadCountMap[customer.id] || unreadCountMap[customerId]}
                        </span>
                      )}
                    </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {/* 显示商业阶段标签 */}
                        <div style={{ marginRight: '8px' }}>
                          {getBusinessStageTag(customer.business_stage || 'new')}
                        </div>
                        {/* 显示来源标签 */}
                        <Tag color={customer.source === 'daojie' ? 'blue' : 'gray'} size="small">
                          {customer.source || '未知'}
                        </Tag>
                        {/* 显示新会话标签 */}
                        {(newSessionSet.has(customer.id) || newSessionSet.has(customerId)) && (
                          <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#fa8c16', color: 'white', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>NEW</span>
                        )}
                      </div>
                    </div>
                    
                    {/* 显示最后消息预览（如果有） */}
                    {customer.last_message_preview && (
                      <div style={{ marginBottom: '4px', fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {customer.last_message_preview}
                      </div>
                    )}
                    
                    {/* 显示最后消息时间 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {customer.last_timestamp ? new Date(customer.last_timestamp).toLocaleString() : '暂无消息'}
                      </Text>
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
        
        {/* 客户信息面板 */}
        <div style={{ width: '300px', padding: '16px', overflowY: 'auto', backgroundColor: '#fafafa' }}>
          {selectedCustomer ? (
            <Card title="客户信息" loading={loading} bordered={false}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>客户名：</Text>
                  <Text>{selectedCustomer.name || selectedCustomer.display_name || selectedCustomer.customer_name || selectedCustomer.id}</Text>
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>渠道：</Text>
                  <Text>{selectedCustomer.source || '未知'}</Text>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>当前阶段：</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Select
                      value={customerProfile?.business_stage || 'new'}
                      onChange={(value) => updateCustomerStage(selectedCustomer.id, value)}
                      style={{ width: '100%' }}
                    >
                      <Option value="new">新询盘</Option>
                      <Option value="following">跟进中</Option>
                      <Option value="quoting">报价中</Option>
                      <Option value="ordered">已下单</Option>
                      <Option value="lost">流失</Option>
                    </Select>
                  </div>
                </div>
                
                <div style={{ paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                  <Text strong>最后消息：</Text>
                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f2f5', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
                    {selectedCustomer.last_message || '暂无消息'}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <Text>请选择客户查看详情</Text>
            </div>
          )}
        </div>
      </div>
      
      {/* 添加客户模态框 */}
      <Modal
        title="添加聊天用户"
        open={isAddModalVisible}
        onOk={handleAddCustomer}
        onCancel={handleCancelAdd}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            username: '',
          }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
            ]}
          >
            <Input placeholder="请输入聊天用户名，例如：gakcvf3msauchq2dter9" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CrmPanel;
