import React from 'react';
import { Card, Typography, Space, Divider, Tag } from 'antd';
import { InfoCircleOutlined, ClockCircleOutlined, CodeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const AboutModule: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={4} className="m-0">关于系统</Title>
        <Text className="text-gray-600 block mt-1">系统介绍、版本信息和更新日志</Text>
      </div>

      <Space direction="vertical" size="large" className="w-full">
        {/* 系统概览 */}
        <Card>
          <div className="flex items-center mb-4">
            <InfoCircleOutlined className="text-blue-500 text-xl mr-2" />
            <Title level={5} className="m-0">系统概览</Title>
          </div>
          <Divider className="my-3" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">系统名称</Text>
              <Text strong>嘉尔威跨境电商业务工作台</Text>
            </div>
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">当前版本</Text>
              <Tag color="green">v1.0.0</Tag>
            </div>
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">开发团队</Text>
              <Text>嘉尔威技术团队</Text>
            </div>
            <div className="flex items-center justify-between">
              <Text className="text-gray-600">系统状态</Text>
              <Tag color="green">正常运行</Tag>
            </div>
          </div>
        </Card>

        {/* 版本信息 */}
        <Card>
          <div className="flex items-center mb-4">
            <CodeOutlined className="text-blue-500 text-xl mr-2" />
            <Title level={5} className="m-0">版本信息</Title>
          </div>
          <Divider className="my-3" />
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Title level={6} className="m-0">v1.0.0</Title>
                <Text className="text-xs text-gray-500">2025-12-27</Text>
              </div>
              <div className="ml-4 space-y-2">
                <div className="flex items-start">
                  <Text className="text-green-500 mr-2">✓</Text>
                  <Text>初始版本发布</Text>
                </div>
                <div className="flex items-start">
                  <Text className="text-green-500 mr-2">✓</Text>
                  <Text>支持客户聊天功能</Text>
                </div>
                <div className="flex items-start">
                  <Text className="text-green-500 mr-2">✓</Text>
                  <Text>集成CRM客户管理</Text>
                </div>
                <div className="flex items-start">
                  <Text className="text-green-500 mr-2">✓</Text>
                  <Text>添加使用社区版块</Text>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 更新日志 */}
        <Card>
          <div className="flex items-center mb-4">
            <ClockCircleOutlined className="text-blue-500 text-xl mr-2" />
            <Title level={5} className="m-0">更新日志</Title>
          </div>
          <Divider className="my-3" />
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Title level={6} className="m-0">2025-12-27</Title>
                <Tag color="blue">最新</Tag>
              </div>
              <div className="ml-4 space-y-2">
                <div className="flex items-start">
                  <Text className="text-green-500 mr-2">+</Text>
                  <Text>新增使用社区版块</Text>
                </div>
                <div className="flex items-start">
                  <Text className="text-green-500 mr-2">+</Text>
                  <Text>添加关于系统页面</Text>
                </div>
                <div className="flex items-start">
                  <Text className="text-green-500 mr-2">+</Text>
                  <Text>添加FQA页面</Text>
                </div>
                <div className="flex items-start">
                  <Text className="text-green-500 mr-2">+</Text>
                  <Text>添加论坛页面</Text>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Space>
    </div>
  );
};

export default AboutModule;