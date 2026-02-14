import React from 'react';
import { useCustomersStore } from '../../store/customersStore';

const CustomersList: React.FC<any> = ({ onSelectCustomer }) => {
  // 从store获取客户列表和选中的客户ID
  const { customers, selectedCustomerId } = useCustomersStore();

  // 控制台日志：验证数据是否进入组件
  console.log("[CUSTOMERSLIST_RENDER]", customers?.length, selectedCustomerId);

  // 处理客户点击事件
  const handleCustomerClick = (customer: any) => {
    console.log("[CUSTOMERSLIST_CLICK]", customer.customer_id);
    onSelectCustomer(customer.customer_id);
  };

  // 格式化时间
  const formatTime = (timestamp: any): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-v3-customers-list" style={{ width: '320px', height: '100%', borderRight: '1px solid #e9ecef', background: '#ffffff' }}>
      <div className="chat-v3-customers-header">
        <h3>客户列表</h3>
      </div>
      <div className="chat-v3-customers-scrollable" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {customers.length === 0 ? (
          <div className="chat-v3-customers-empty" style={{ padding: '16px', textAlign: 'center', color: '#999999' }}>
            <p>暂无客户数据</p>
          </div>
        ) : (
          customers.map((customer) => (
            <div
              key={customer.customer_id}
              className={`chat-v3-customer-item ${selectedCustomerId === customer.customer_id ? 'selected' : ''}`}
              onClick={() => handleCustomerClick(customer)}
              style={{ padding: '16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px', transition: 'background-color 0.2s' }}
            >
              <div className="chat-v3-customer-info" style={{ flex: 1, minWidth: 0 }}>
                <div className="chat-v3-customer-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {customer.stable_name || '未命名客户'}
                  {customer.status === 'active' && <span className="chat-v3-customer-status active" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#52c41a' }}></span>}
                </div>
                <div className="chat-v3-customer-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#999999' }}>
                  <span className="chat-v3-customer-source" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {customer.channel_sources?.[0] || customer.source || '未知来源'}
                  </span>
                  <span className="chat-v3-customer-time" style={{ whiteSpace: 'nowrap' }}>
                    {customer.last_message_at ? formatTime(customer.last_message_at) : '--:--'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CustomersList;