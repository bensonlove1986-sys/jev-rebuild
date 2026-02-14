import React, { useMemo } from 'react';
import { Card, List, Avatar, Badge, Typography, Space } from 'antd';
import { usePresenceStore } from '../store/presenceStore';

const { Title, Text } = Typography;

export const PresencePanel: React.FC = () => {
  console.log('[PresencePanel_RENDER]');
  const { radarData, isLoading } = usePresenceStore(state => ({
    radarData: state.radarData,
    isLoading: state.isLoading
  }));

  console.log('[RADAR_RENDER]', radarData.length);

  // 按时间排序，最新的在前面（使用 useMemo 缓存结果）
  const sortedRadar = useMemo(() => {
    return [...radarData].sort((a, b) => b.ts - a.ts);
  }, [radarData]);

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>Presence Radar</Title>
          <Badge count={radarData.length} showZero color="blue" />
        </Space>
      }
      bordered={false}
      style={{ width: '100%', maxHeight: 400, overflow: 'auto' }}
    >
      {isLoading ? (
        <Text>Loading radar data...</Text>
      ) : sortedRadar.length === 0 ? (
        <Text>No presence data yet</Text>
      ) : (
        <List
          dataSource={sortedRadar}
          renderItem={(item) => (
            <List.Item
              key={item.message_id}
              avatar={
                <Avatar size="small">
                  {item.customer_id.slice(-2)}
                </Avatar>
              }
            >
              <List.Item.Meta
                title={
                  <Space size="small">
                    <Text strong>{item.customer_id}</Text>
                    <Badge status="success" text={item.source} />
                  </Space>
                }
                description={
                  <Space direction="vertical" size={2}>
                    <Text type="secondary">Message ID: {item.message_id}</Text>
                    <Text type="secondary">
                      {new Date(item.ts).toLocaleString()}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};
