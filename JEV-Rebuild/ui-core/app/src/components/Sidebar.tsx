import React, { useEffect } from 'react';
import { Skeleton, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useCustomersStore } from '../store/customersStore';

const { Title } = Typography;

const Sidebar: React.FC = () => {
  const { customers, selectedPhone, isLoading, error, fetchCustomers, selectCustomer } = useCustomersStore();

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <Title level={4} className="m-0">客户列表</Title>
      </div>
      
      {error && (
        <div className="p-4 text-red-500">
          <p>加载客户失败: {error}</p>
          <button 
            onClick={() => fetchCustomers()}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-2">
                <Skeleton active avatar paragraph={{ rows: 1 }} />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            暂无客户
          </div>
        ) : (
          <div className="space-y-0">
            {customers.map(customer => (
              <div
                key={customer.phone}
                className={`flex items-center p-2 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${selectedPhone === customer.phone ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                onClick={() => {
                  console.log('[SIDEBAR_SELECT] Selecting customer:', customer.phone);
                  selectCustomer(customer.phone);
                }}
              >
                <Skeleton avatar={false} paragraph={{ rows: 1 }} active={isLoading}>
                  <div className="mr-3 text-gray-400">
                    <UserOutlined />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{customer.stable_name || `客户 ${customer.phone}`}</div>
                    <div className="text-xs text-gray-500">
                      ID: {customer.phone}
                    </div>
                  </div>
                </Skeleton>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
