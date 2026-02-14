import React from 'react';
import { Card, Typography, Button, Space, Switch } from 'antd';
import { ShoppingCartOutlined, LinkOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ShopifyModule: React.FC = () => {
  return (
    <div className="h-full bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="m-0 flex items-center">
          <ShoppingCartOutlined className="mr-2" /> SHOPIFY集成
        </Title>
        <Space>
          <Button icon={<SyncOutlined />}>同步数据</Button>
          <Button type="primary" icon={<SettingOutlined />}>配置</Button>
        </Space>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 连接状态卡片 */}
        <Card title="连接状态">
          <div className="flex items-center justify-between">
            <div>
              <Text strong className="block mb-1">SHOPIFY商店</Text>
              <Text className="text-gray-600">未连接</Text>
            </div>
            <div className="text-4xl">🔴</div>
          </div>
          
          <Button 
            type="primary" 
            icon={<LinkOutlined />} 
            className="mt-4 w-full"
          >
            连接SHOPIFY商店
          </Button>
        </Card>
        
        {/* 同步状态卡片 */}
        <Card title="同步状态">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">最后同步时间</Text>
              <Text className="text-gray-500">从未同步</Text>
            </div>
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">产品同步</Text>
              <Switch defaultChecked={false} disabled />
            </div>
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">订单同步</Text>
              <Switch defaultChecked={false} disabled />
            </div>
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">客户同步</Text>
              <Switch defaultChecked={false} disabled />
            </div>
          </div>
        </Card>
        
        {/* 功能说明卡片 */}
        <Card title="功能说明" className="md:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl mb-2">📦</div>
              <Text strong className="block mb-1">产品同步</Text>
              <Text className="text-sm text-gray-600">
                将产品数据同步到SHOPIFY商店
              </Text>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl mb-2">📋</div>
              <Text strong className="block mb-1">订单管理</Text>
              <Text className="text-sm text-gray-600">
                管理SHOPIFY商店的订单
              </Text>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl mb-2">👥</div>
              <Text strong className="block mb-1">客户同步</Text>
              <Text className="text-sm text-gray-600">
                同步客户数据到SHOPIFY
              </Text>
            </div>
          </div>
        </Card>
        
        {/* 集成说明卡片 */}
        <Card title="集成说明" className="md:col-span-2 bg-blue-50 border-blue-100">
          <div className="flex items-start gap-3">
            <div className="text-blue-500">💡</div>
            <div className="flex-1">
              <Text strong className="block mb-1">SHOPIFY集成功能</Text>
              <Text className="text-sm text-gray-600 mb-4">
                通过SHOPIFY集成，您可以：
              </Text>
              <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                <li>将产品数据同步到SHOPIFY商店</li>
                <li>管理SHOPIFY商店的订单</li>
                <li>同步客户数据</li>
                <li>自动更新库存信息</li>
                <li>查看销售统计数据</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ShopifyModule;