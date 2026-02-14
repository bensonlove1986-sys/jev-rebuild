import React, { useState } from 'react';
import { Card, Typography, Collapse, Input, Button } from 'antd';
import { QuestionCircleOutlined, SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { Search } = Input;

const FQAModule: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // 模拟FAQ数据
  const faqs = [
    {
      key: '1',
      question: '如何注册系统账号？',
      answer: '系统账号由管理员统一创建和分配，员工无法自行注册。请联系系统管理员获取账号和密码。'
    },
    {
      key: '2',
      question: '如何添加新客户？',
      answer: '在CRM模块中，点击"新增客户"按钮，填写客户信息并保存即可添加新客户。'
    },
    {
      key: '3',
      question: '如何发送消息给客户？',
      answer: '在聊天模块中选择客户，在输入框中输入消息内容，点击"发送"按钮即可发送消息给客户。'
    },
    {
      key: '4',
      question: '如何查看订单详情？',
      answer: '在订单模块中，点击订单列表中的订单编号，即可查看订单的详细信息。'
    },
    {
      key: '5',
      question: '如何使用AI助手功能？',
      answer: '在聊天模块中，系统会自动分析客户消息并提供AI建议，您可以参考AI建议回复客户。'
    },
    {
      key: '6',
      question: '如何修改个人信息？',
      answer: '目前系统暂不支持个人信息自行修改，请联系系统管理员进行修改。'
    },
    {
      key: '7',
      question: '如何使用内置浏览器？',
      answer: '在浏览器模块中，输入网址并点击"访问"按钮即可使用内置浏览器访问网页。'
    },
    {
      key: '8',
      question: '如何查看系统更新日志？',
      answer: '在使用社区模块的"关于系统"页面中，可以查看系统的更新日志。'
    },
    {
      key: '9',
      question: '如何在论坛发帖？',
      answer: '在论坛模块中，点击"发帖"按钮，填写帖子标题和内容，点击"发布"按钮即可发帖。'
    },
    {
      key: '10',
      question: '如何联系技术支持？',
      answer: '请联系系统管理员或发送邮件至技术支持邮箱：support@jiaerwei.com。'
    }
  ];

  // 过滤FAQ
  const filteredFaqs = searchQuery
    ? faqs.filter(faq => 
        faq.question.includes(searchQuery) || 
        faq.answer.includes(searchQuery)
      )
    : faqs;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={4} className="m-0">常见问题解答</Title>
        <Text className="text-gray-600 block mt-1">查找您遇到的问题和解决方案</Text>
      </div>

      <Card className="mb-6">
        <Search
          placeholder="搜索问题"
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </Card>

      <Card>
        <Collapse
          bordered={false}
          defaultActiveKey={['1']}
          className="faq-collapse"
        >
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map(faq => (
              <Panel
                header={faq.question}
                key={faq.key}
                className="faq-panel"
              >
                <Text className="text-gray-600">{faq.answer}</Text>
              </Panel>
            ))
          ) : (
            <div className="text-center py-6">
              <QuestionCircleOutlined className="text-gray-400 text-4xl mb-2" />
              <div>
                <Text className="text-gray-500">未找到相关问题</Text>
              </div>
              <Button 
                type="default" 
                className="mt-3"
                onClick={() => setSearchQuery('')}
              >
                查看所有问题
              </Button>
            </div>
          )}
        </Collapse>
      </Card>

      <Card className="mt-6 bg-gray-50">
        <div className="flex items-start">
          <QuestionCircleOutlined className="text-blue-500 mt-1 mr-2" />
          <div>
            <Text strong className="block mb-1">找不到您的问题？</Text>
            <Text className="text-sm text-gray-600">
              如果您在FAQ中找不到解决问题的方法，可以联系系统管理员或在论坛中提问，我们的技术团队会尽快为您解答。
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FQAModule;