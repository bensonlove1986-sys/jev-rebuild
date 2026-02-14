import React, { useState } from 'react';
import { Card, Typography, Space, Button, List, Avatar, Input, Modal, Tag } from 'antd';
const { TextArea } = Input;
import { MessageOutlined, PlusOutlined, LikeOutlined, CommentOutlined, UserOutlined, CalendarOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

const ForumModule: React.FC = () => {
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 用户信息 - 实际应从系统全局状态获取
  // 注册系统时自动注册论坛账号，无需额外操作
  const currentUser = {
    id: 'user123',
    name: '系统用户名', // 未来将从系统注册信息中获取真实用户名
    avatar: <UserOutlined />
  };

  // 模拟帖子数据
  const posts = [
    {
      id: 'post1',
      title: '系统使用体验分享',
      content: '我使用这个系统已经有一段时间了，感觉非常方便，特别是客户管理和聊天功能，大大提高了工作效率。希望系统能继续优化，添加更多实用功能。',
      author: {
        id: 'user1',
        name: '张三',
        avatar: <UserOutlined />
      },
      createdAt: '2025-12-26',
      likes: 15,
      comments: 8,
      views: 120,
      tags: ['系统体验', '功能建议']
    },
    {
      id: 'post2',
      title: '如何提高客户回复率？',
      content: '最近客户回复率有些下降，想请教一下大家有什么好的方法和技巧可以提高客户回复率吗？',
      author: {
        id: 'user2',
        name: '李四',
        avatar: <UserOutlined />
      },
      createdAt: '2025-12-25',
      likes: 23,
      comments: 15,
      views: 200,
      tags: ['客户管理', '销售技巧']
    },
    {
      id: 'post3',
      title: 'AI助手功能使用心得',
      content: 'AI助手功能真的很强大，能自动分析客户意图，提供回复建议，节省了很多时间。大家有什么使用AI助手的小技巧吗？',
      author: {
        id: 'user3',
        name: '王五',
        avatar: <UserOutlined />
      },
      createdAt: '2025-12-24',
      likes: 30,
      comments: 12,
      views: 250,
      tags: ['AI助手', '使用技巧']
    },
    {
      id: 'post4',
      title: '内置浏览器无法访问某些网站',
      content: '我发现内置浏览器无法访问某些特定网站，总是提示加载失败，大家有没有遇到类似问题？',
      author: {
        id: 'user4',
        name: '赵六',
        avatar: <UserOutlined />
      },
      createdAt: '2025-12-23',
      likes: 8,
      comments: 5,
      views: 95,
      tags: ['内置浏览器', '问题反馈']
    },
    {
      id: 'post5',
      title: '系统更新后遇到的问题',
      content: '系统更新到最新版本后，我遇到了一些小问题，比如某些按钮点击没有反应，希望能尽快修复。',
      author: {
        id: 'user5',
        name: '孙七',
        avatar: <UserOutlined />
      },
      createdAt: '2025-12-22',
      likes: 12,
      comments: 7,
      views: 140,
      tags: ['系统更新', '问题反馈']
    }
  ];

  // 过滤帖子
  const filteredPosts = searchQuery
    ? posts.filter(post => 
        post.title.includes(searchQuery) || 
        post.content.includes(searchQuery) ||
        post.tags.some(tag => tag.includes(searchQuery))
      )
    : posts;

  // 显示发帖模态框
  const showPostModal = () => {
    setIsPostModalVisible(true);
  };

  // 关闭发帖模态框
  const handlePostModalCancel = () => {
    setIsPostModalVisible(false);
    setPostTitle('');
    setPostContent('');
  };

  // 提交发帖
  const handlePostSubmit = () => {
    // 实际应该提交到服务器
    console.log('提交帖子:', { title: postTitle, content: postContent });
    setIsPostModalVisible(false);
    setPostTitle('');
    setPostContent('');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={4} className="m-0">社区论坛</Title>
        <Text className="text-gray-600 block mt-1">交流讨论，分享经验</Text>
      </div>

      <Space direction="vertical" size="large" className="w-full">
        {/* 论坛头部 */}
        <Card>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <Search
                placeholder="搜索帖子"
                allowClear
                enterButton={<MessageOutlined />}
                size="large"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              size="large"
              onClick={showPostModal}
            >
              发帖
            </Button>
          </div>
        </Card>

        {/* 论坛提示 */}
        <Card className="bg-blue-50">
          <div className="flex items-start">
            <MessageOutlined className="text-blue-500 mt-1 mr-2" />
            <div>
              <Text strong className="block mb-1">论坛使用说明</Text>
              <Text className="text-sm text-gray-600">
                <ul className="list-disc list-inside space-y-1">
                  <li>您已通过系统自动注册论坛账号，无需额外登录</li>
                  <li>可以直接在论坛发言，发帖和回帖</li>
                  <li>请遵守社区规则，文明发言</li>
                  <li>如有问题或建议，欢迎发帖讨论</li>
                </ul>
              </Text>
            </div>
          </div>
        </Card>

        {/* 帖子列表 */}
        <Card>
          <List
            className="forum-posts-list"
            dataSource={filteredPosts}
            renderItem={post => (
              <List.Item
                key={post.id}
                className="forum-post-item border-b pb-4 mb-4"
              >
                <List.Item.Meta
                  avatar={post.author.avatar}
                  title={
                    <Space direction="vertical" size="small" className="w-full">
                      <div className="flex justify-between items-center">
                        <Text strong className="text-lg">{post.title}</Text>
                        <Space>
                          <Text className="text-xs text-gray-500">
                            <CalendarOutlined className="mr-1" /> {post.createdAt}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            <EyeOutlined className="mr-1" /> {post.views}
                          </Text>
                        </Space>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map(tag => (
                          <Tag key={tag} color="blue" className="text-xs">{tag}</Tag>
                        ))}
                      </div>
                    </Space>
                  }
                  description={
                    <div className="space-y-3">
                      <Text className="text-gray-600 line-clamp-2">{post.content}</Text>
                      <div className="flex justify-between items-center">
                        <Text className="text-sm text-gray-500">
                          作者: {post.author.name}
                        </Text>
                        <Space>
                          <Button 
                            type="text" 
                            icon={<LikeOutlined />} 
                            size="small"
                            className="text-gray-500"
                          >
                            {post.likes}
                          </Button>
                          <Button 
                            type="text" 
                            icon={<CommentOutlined />} 
                            size="small"
                            className="text-gray-500"
                          >
                            {post.comments}
                          </Button>
                        </Space>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Space>

      {/* 发帖模态框 */}
      <Modal
        title="发布新帖"
        open={isPostModalVisible}
        onOk={handlePostSubmit}
        onCancel={handlePostModalCancel}
        okText="发布"
        cancelText="取消"
        width={600}
      >
        <Space direction="vertical" size="large" className="w-full">
          <div>
            <Text strong className="block mb-2">帖子标题</Text>
            <Input
              placeholder="请输入帖子标题"
              value={postTitle}
              onChange={e => setPostTitle(e.target.value)}
              size="large"
            />
          </div>
          <div>
            <Text strong className="block mb-2">帖子内容</Text>
            <TextArea
              rows={6}
              placeholder="请输入帖子内容"
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              size="large"
            />
          </div>
          <div className="flex items-center">
            <Avatar size={32} className="mr-2">{currentUser.avatar}</Avatar>
            <Text className="text-sm text-gray-600">
              当前用户：{currentUser.name}
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default ForumModule;