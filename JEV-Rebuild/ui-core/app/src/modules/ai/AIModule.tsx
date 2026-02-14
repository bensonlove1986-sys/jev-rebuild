import React from 'react';
import { Card, Typography, Button, Empty, Space, Tag } from 'antd';
import { MessageOutlined, BulbOutlined, RestOutlined } from '@ant-design/icons';
import { useCustomersStore } from '../../store/customersStore';
import { useMessagesStore } from '../../store/messagesStore';

const { Title, Text, Paragraph } = Typography;

const AIModule: React.FC = () => {
  const { selectedCustomerId } = useCustomersStore();
  const { messages } = useMessagesStore();
  
  const customerMessages = selectedCustomerId ? messages[selectedCustomerId] || [] : [];

  return (
    <div className="h-full bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="m-0">AI 助手</Title>
        <Button icon={<RestOutlined />} disabled={!selectedCustomerId}>
          刷新建议
        </Button>
      </div>
      
      {!selectedCustomerId ? (
        <Empty description="请先选择一个客户" />
      ) : customerMessages.length === 0 ? (
        <Empty description="暂无对话记录，无法生成建议" />
      ) : (
        <Space orientation="vertical" className="w-full">
          <Card title={<div className="flex items-center"><MessageOutlined className="mr-2" />对话总结</div>}>
            <Paragraph className="text-gray-600">
              AI 分析当前对话，为您提供关键信息总结和下一步建议。
            </Paragraph>
            <div className="mt-2">
              <Tag color="blue" className="mr-2">客户意向: 待定</Tag>
              <Tag color="green" className="mr-2">优先级: 中</Tag>
              <Tag color="orange">跟进建议: 发送产品报价</Tag>
            </div>
          </Card>
          
          <Card title={<div className="flex items-center"><BulbOutlined className="mr-2" />回复建议</div>}>
            <Space orientation="vertical" className="w-full">
              <div className="p-3 bg-gray-50 rounded-lg">
                <Text strong>建议回复 1:</Text>
                <Paragraph className="mb-0 mt-1">
                  您好，感谢您的咨询！关于您提到的产品，我们可以提供更多详细信息和报价。请问您需要了解哪些具体参数？
                </Paragraph>
                <Button type="primary" size="small" className="mt-2">
                  使用此回复
                </Button>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <Text strong>建议回复 2:</Text>
                <Paragraph className="mb-0 mt-1">
                  很高兴收到您的消息！根据您的需求，我们推荐以下解决方案。请查看附件中的产品手册，如有疑问随时联系。
                </Paragraph>
                <Button type="primary" size="small" className="mt-2">
                  使用此回复
                </Button>
              </div>
            </Space>
          </Card>
        </Space>
      )}
    </div>
  );
};

export default AIModule;
