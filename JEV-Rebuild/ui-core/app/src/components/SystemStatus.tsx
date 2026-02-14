import React, { useEffect } from 'react';
import { Tag, Typography, Space } from 'antd';
import { useSystemStore } from '../store/systemStore';

const { Text } = Typography;

const SystemStatus: React.FC = () => {
  const { isHealthy, isLoading, checkHealth, startPeriodicHealthCheck, stopPeriodicHealthCheck } = useSystemStore();

  useEffect(() => {
    startPeriodicHealthCheck();
    
    return () => {
      stopPeriodicHealthCheck();
    };
  }, [startPeriodicHealthCheck, stopPeriodicHealthCheck]);

  return (
    <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
      <Space>
        <Text strong>系统状态:</Text>
        <Tag 
          color={isHealthy ? 'green' : 'red'}
        >
          {isLoading ? '检查中...' : (isHealthy ? '在线' : '离线')}
        </Tag>
      </Space>
      
      <button 
        onClick={() => checkHealth()}
        className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
      >
        刷新状态
      </button>
    </div>
  );
};

export default SystemStatus;
