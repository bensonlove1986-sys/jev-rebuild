import React from 'react';
import { Card, Typography, Button, Space, Switch } from 'antd';
import { FacebookOutlined, LinkOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const FacebookModule: React.FC = () => {
  return (
    <div className="h-full bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="m-0 flex items-center">
          <FacebookOutlined className="mr-2" /> FACEBOOK集成
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
              <Text strong className="block mb-1">Facebook页面</Text>
              <Text className="text-gray-600">未连接</Text>
            </div>
            <div className="text-4xl">🔴</div>
          </div>
          
          <Button 
            type="primary" 
            icon={<LinkOutlined />} 
            className="mt-4 w-full"
          >
            连接Facebook页面
          </Button>
        </Card>
        
        {/* 功能开关卡片 */}
        <Card title="功能开关">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">自动发布产品</Text>
              <Switch defaultChecked={false} disabled />
            </div>
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">同步Facebook评论</Text>
              <Switch defaultChecked={false} disabled />
            </div>
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">自动回复</Text>
              <Switch defaultChecked={false} disabled />
            </div>
          </div>
        </Card>
        
        {/* 功能说明卡片 */}
        <Card title="功能说明" className="md:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl mb-2">📦</div>
              <Text strong className="block mb-1">产品发布</Text>
              <Text className="text-sm text-gray-600">
                将产品自动发布到Facebook商店
              </Text>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl mb-2">💬</div>
              <Text strong className="block mb-1">评论管理</Text>
              <Text className="text-sm text-gray-600">
                同步和管理Facebook评论
              </Text>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl mb-2">🤖</div>
              <Text strong className="block mb-1">自动回复</Text>
              <Text className="text-sm text-gray-600">
                设置Facebook消息自动回复
              </Text>
            </div>
          </div>
        </Card>
        
        {/* 集成说明卡片 */}
        <Card title="集成说明" className="md:col-span-2 bg-blue-50 border-blue-100">
          <div className="flex items-start gap-3">
            <div className="text-blue-500">💡</div>
            <div className="flex-1">
              <Text strong className="block mb-1">Facebook集成功能</Text>
              <Text className="text-sm text-gray-600 mb-4">
                通过Facebook集成，您可以：
              </Text>
              <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                <li>将产品自动发布到Facebook商店</li>
                <li>同步Facebook页面的评论</li>
                <li>设置消息自动回复</li>
                <li>查看Facebook广告效果</li>
                <li>管理Facebook活动和帖子</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FacebookModule;