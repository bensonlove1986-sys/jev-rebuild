import React, { useState } from 'react';
import { 
  Card, Typography, Descriptions, Empty, Tag, Button, Modal, Form, Input, Select, 
  Table, Space, Divider, Tooltip, Popconfirm, Row, Col, Menu 
} from 'antd';
import { 
  UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, 
  MessageOutlined, ShoppingCartOutlined, PieChartOutlined, ReloadOutlined,
  SearchOutlined, MailOutlined, PhoneOutlined 
} from '@ant-design/icons';
import { useCustomersStore } from '../../store/customersStore';
import { eventBus } from '../../utils/eventBus';

const { Title, Text } = Typography;
const { Item } = Descriptions;
const { Option } = Select;
const { Search } = Input;

// 客户状态选项
const STATUS_OPTIONS = [
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '不活跃' },
  { value: 'pending', label: '待处理' }
];

const CustomerModule: React.FC = () => {
  const {
    customers,
    selectedCustomerId,
    isLoading,
    fetchCustomers,
    selectCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    deleteCustomers,
    getCustomerById,
    initCustomers
  } = useCustomersStore();
  
  const selectedCustomer = getCustomerById(selectedCustomerId || '');
  
  // 状态管理
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  // 搜索状态
  const [searchText, setSearchText] = useState('');
  // 右键菜单状态
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuCustomerId, setContextMenuCustomerId] = useState<string | null>(null);
  // 批量选择状态
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  
  // 集成模块数据状态
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [productInteractions, setProductInteractions] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>({});
  
  // 组件挂载时初始化事件监听
  React.useEffect(() => {
    // 监听客户选择事件
    const handleCustomerSelected = (customer: any) => {
      console.log('Customer selected from other module:', customer);
      selectCustomer(customer.customer_id);
      
      // 触发加载相关模块数据
      eventBus.emit('crm:loadCustomerData', customer.customer_id);
    };
    
    // 监听聊天记录更新事件
    const handleChatHistoryUpdated = (data: any) => {
      if (data.customerId === selectedCustomerId) {
        setChatHistory(data.messages);
      }
    };
    
    // 监听订单历史更新事件
    const handleOrderHistoryUpdated = (data: any) => {
      if (data.customerId === selectedCustomerId) {
        setOrderHistory(data.orders);
      }
    };
    
    // 监听产品交互更新事件
    const handleProductInteractionsUpdated = (data: any) => {
      if (data.customerId === selectedCustomerId) {
        setProductInteractions(data.interactions);
      }
    };
    
    // 监听分析数据更新事件
    const handleAnalyticsDataUpdated = (data: any) => {
      if (data.customerId === selectedCustomerId) {
        setAnalyticsData(data);
      }
    };
    
    // 订阅事件
    eventBus.on('customer:selected', handleCustomerSelected);
    eventBus.on('chat:historyUpdated', handleChatHistoryUpdated);
    eventBus.on('orders:historyUpdated', handleOrderHistoryUpdated);
    eventBus.on('products:interactionsUpdated', handleProductInteractionsUpdated);
    eventBus.on('analytics:dataUpdated', handleAnalyticsDataUpdated);
    
    // 初始加载客户数据
    initCustomers();
    
    // 组件卸载时清理事件监听
    return () => {
      eventBus.off('customer:selected', handleCustomerSelected);
      eventBus.off('chat:historyUpdated', handleChatHistoryUpdated);
      eventBus.off('orders:historyUpdated', handleOrderHistoryUpdated);
      eventBus.off('products:interactionsUpdated', handleProductInteractionsUpdated);
      eventBus.off('analytics:dataUpdated', handleAnalyticsDataUpdated);
    };
  }, [selectedCustomerId, initCustomers, selectCustomer]);
  
  // 模拟数据加载函数
  const simulateDataLoading = () => {
    // 模拟聊天记录
    setChatHistory([
      { id: 1, content: '你好，我想了解你们的产品', timestamp: Date.now() - 3600000, sender: 'customer' },
      { id: 2, content: '您好，请问有什么可以帮您的？', timestamp: Date.now() - 3500000, sender: 'agent' },
      { id: 3, content: '我对你们的VIP服务很感兴趣', timestamp: Date.now() - 3400000, sender: 'customer' }
    ]);
    
    // 模拟订单历史
    setOrderHistory([
      { id: 'order-123', amount: 99.99, status: 'completed', date: Date.now() - 86400000 },
      { id: 'order-456', amount: 199.99, status: 'pending', date: Date.now() - 3600000 },
      { id: 'order-789', amount: 299.99, status: 'shipped', date: Date.now() - 172800000 }
    ]);
    
    // 模拟产品交互
    setProductInteractions([
      { productId: 'prod-1', name: '产品A', type: 'view', timestamp: Date.now() - 7200000 },
      { productId: 'prod-2', name: '产品B', type: 'add_to_cart', timestamp: Date.now() - 3600000 },
      { productId: 'prod-3', name: '产品C', type: 'purchase', timestamp: Date.now() - 86400000 }
    ]);
    
    // 模拟分析数据
    setAnalyticsData({
      totalSpent: 599.97,
      averageOrderValue: 199.99,
      orderCount: 3,
      lastPurchase: Date.now() - 86400000,
      engagementScore: 85
    });
  };
  
  // 当选中客户变化时，加载相关模块数据
  React.useEffect(() => {
    if (selectedCustomerId) {
      eventBus.emit('crm:loadCustomerData', selectedCustomerId);
      
      // 模拟数据加载（实际项目中会从真实模块获取）
      simulateDataLoading();
    }
  }, [selectedCustomerId]);
  
  // 显示所有真实客户，不再按source过滤
  const displayCustomers = customers;
  
  // 打印客户数据，确认已成功获取
  console.log('[CUSTOMER_MODULE] displayCustomers:', displayCustomers);
  console.log('[CUSTOMER_MODULE] customers.length:', displayCustomers.length);
  console.log('[CUSTOMER_MODULE] displayCustomers names:', displayCustomers.map(c => c.stable_name));
  
  // 检测测试客户，但只打印日志，不崩溃UI
  const testCustomers = customers.filter(c => c.customer_id?.includes('test'));
  if (testCustomers.length > 0) {
    console.warn('[TEST_CUSTOMER_DETECTED] Found test customers:', testCustomers.map(c => c.customer_id));
  }
  
  // 打开创建客户模态框
  const showCreateModal = () => {
    setIsCreateModalVisible(true);
    createForm.resetFields();
  };
  
  // 打开编辑客户模态框
  const showEditModal = (customerId: string) => {
    const customer = getCustomerById(customerId);
    if (customer) {
      setEditingCustomerId(customerId);
      editForm.setFieldsValue(customer);
      setIsEditModalVisible(true);
    }
  };
  
  // 打开客户详情模态框
  const showViewModal = (customerId: string) => {
    selectCustomer(customerId);
    setIsViewModalVisible(true);
  };
  
  // 关闭所有模态框
  const handleModalCancel = () => {
    setIsCreateModalVisible(false);
    setIsEditModalVisible(false);
    setIsViewModalVisible(false);
    setEditingCustomerId(null);
    createForm.resetFields();
    editForm.resetFields();
  };
  
  // 处理创建客户
  const handleCreateCustomer = () => {
    createForm.validateFields()
      .then(values => {
        createCustomer({
          display_name: values.display_name,
          status: values.status,
          email: values.email,
          phone: values.phone,
          address: values.address,
          tags: values.tags || [],
          channel_sources: values.channel_sources || [],
          last_message_at: Date.now()
        });
        handleModalCancel();
      })
      .catch(info => {
        console.log('Validate Failed:', info);
      });
  };
  
  // 处理编辑客户
  const handleEditCustomer = () => {
    editForm.validateFields()
      .then(values => {
        if (editingCustomerId) {
          updateCustomer(editingCustomerId, values);
          handleModalCancel();
        }
      })
      .catch(info => {
        console.log('Validate Failed:', info);
      });
  };
  
  // 处理删除客户
  const handleDeleteCustomer = (customerId: string) => {
    deleteCustomer(customerId);
    setContextMenuVisible(false);
  };

  // 处理右键菜单显示
  const handleContextMenu = (e: React.MouseEvent, customerId: string) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuCustomerId(customerId);
    setContextMenuVisible(true);
  };

  // 处理右键菜单关闭
  const handleContextMenuClose = () => {
    setContextMenuVisible(false);
  };
  
  // 处理刷新客户列表
  const handleRefreshCustomers = () => {
    fetchCustomers();
  };
  
  // 删除指定的假客户
  const deleteFakeCustomers = () => {
    // 查找并删除名称为Benson Sensor、电话号码为+8612345678901和+8612345678902的客户
    const fakeCustomers = customers.filter(customer => 
      customer.stable_name === 'Benson Sensor' && 
      (customer.phone === '+8612345678901' || customer.phone === '+8612345678902')
    );
    
    // 删除找到的假客户
    fakeCustomers.forEach(customer => {
      deleteCustomer(customer.customer_id);
    });
    
    console.log(`[DELETE_FAKE_CUSTOMERS] Deleted ${fakeCustomers.length} fake customers`);
  };
  
  // 批量删除客户
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '确认批量删除',
      content: `您确定要删除选中的 ${selectedCustomerIds.length} 个客户吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        // 调用批量删除方法
        deleteCustomers(selectedCustomerIds);
        // 清空选中状态
        setSelectedCustomerIds([]);
        // 显示成功提示
        Modal.success({
          title: '删除成功',
          content: `已成功删除 ${selectedCustomerIds.length} 个客户。`
        });
      }
    });
  };
  
  // 表格列配置
  const customerColumns = [
    {
      title: '',
      key: 'selection',
      type: 'checkbox',
      width: 40
    },
    {
      title: '客户ID',
      dataIndex: 'customer_id',
      key: 'customer_id',
      width: 180
    },
    {
      title: '客户名称',
      key: 'display_name',
      render: (_, record: any) => {
        const name = record.stable_name;
        
        return (
          <div 
            style={{ cursor: 'pointer' }}
            onContextMenu={(e) => handleContextMenu(e, record.customer_id)}
            onClick={() => selectCustomer(record.customer_id)}
          >
            <Text strong>{name}</Text>
          </div>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusMap = {
          active: { color: 'green', text: '活跃' },
          inactive: { color: 'gray', text: '不活跃' },
          pending: { color: 'yellow', text: '待处理' }
        };
        const { color, text } = statusMap[status as keyof typeof statusMap] || { color: 'gray', text: status };
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 150
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space wrap>
          {tags?.map(tag => (
            <Tag key={tag} color="blue">{tag}</Tag>
          )) || <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无标签" />
          }
        </Space>
      )
    },
    {
      title: '渠道来源',
      dataIndex: 'channel_sources',
      key: 'channel_sources',
      render: (sources: string[]) => (
        <Space wrap>
          {sources?.map(source => (
            <Tag key={source} color="orange">{source}</Tag>
          )) || <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无渠道" />
          }
        </Space>
      )
    },
    {
      title: '最近消息',
      dataIndex: 'last_message_at',
      key: 'last_message_at',
      render: (timestamp: number) => (
        <Text type="secondary">{new Date(timestamp).toLocaleString()}</Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="查看详情">
            <Button 
              type="link" 
              icon={<UserOutlined />} 
              onClick={() => showViewModal(record.customer_id)}
            >
              详情
            </Button>
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => showEditModal(record.customer_id)}
            >
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除这个客户吗？"
            onConfirm={() => handleDeleteCustomer(record.customer_id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button 
                type="link" 
                icon={<DeleteOutlined />} 
                danger
              >
                删除
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];
  
  return (
    <div className="h-full bg-gray-50 p-4 rounded-lg shadow">
      <Title level={3} className="mb-6 flex items-center">
        <UserOutlined className="mr-2" />
        CRM客户管理
      </Title>
      
      {/* 操作栏 */}
      <div className="flex justify-between items-center mb-6">
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={showCreateModal}
          >
            新增客户
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefreshCustomers}
            loading={isLoading}
          >
            刷新
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={deleteFakeCustomers}
          >
            删除假客户
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleBatchDelete()}
            disabled={selectedCustomerIds.length === 0}
          >
            批量删除 ({selectedCustomerIds.length})
          </Button>
        </Space>
        
        <Search
          placeholder="搜索客户名称或ID"
          allowClear
          enterButton={<SearchOutlined />}
          size="middle"
          onSearch={value => setSearchText(value)}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>
      
      {/* 客户列表 */}
      <Card className="mb-6">
        <Table
          columns={customerColumns}
          dataSource={displayCustomers}
          rowKey="customer_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
          rowSelection={{
            selectedRowKeys: selectedCustomerIds,
            onChange: (selectedRowKeys) => {
              setSelectedCustomerIds(selectedRowKeys as string[]);
            }
          }}
          onRow={(record) => ({
            onClick: () => selectCustomer(record.customer_id)
          })}
        />
      </Card>
      
      {/* 客户360度视图 */}
      {selectedCustomer && (
        <Card title="客户360度视图">
          <Descriptions column={2} bordered>
            <Item label="客户ID">{selectedCustomer.customer_id}</Item>
            <Item label="客户名称">
              <Text strong>{selectedCustomer.stable_name}</Text>
            </Item>
            <Item label="邮箱">{selectedCustomer.email || '无'}</Item>
            <Item label="电话">{selectedCustomer.phone || '无'}</Item>
            {selectedCustomer.address && (
              <Item label="地址" span={2}>{selectedCustomer.address}</Item>
            )}
          </Descriptions>
          
          {/* 模块集成卡片 */}
          <Divider orientation="left">
            <Text strong>模块集成</Text>
          </Divider>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 聊天记录 */}
            <Card 
              title={<div className="flex items-center"><MessageOutlined className="mr-2" />聊天记录</div>}
              bordered={false}
              hoverable
            >
              {chatHistory.length > 0 ? (
              <>
                <div className="list-container">
                  {chatHistory.slice(-3).map((item) => (
                    <div key={item.id} className="list-item p-2">
                      <div className={`flex ${item.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-2 rounded-lg ${item.sender === 'customer' ? 'bg-blue-100 text-right' : 'bg-gray-100'}`}>
                          <Text className={item.sender === 'customer' ? 'text-blue-800' : 'text-gray-800'}>
                            {item.content}
                          </Text>
                          <br />
                          <Text type="secondary" className="text-xs">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </Text>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {chatHistory.length > 3 && (
                  <div className="mt-2 text-center">
                    <Button type="link" size="small" onClick={() => eventBus.emit('chat:open', selectedCustomerId)}>
                      查看完整聊天记录 ({chatHistory.length})
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Empty description="暂无聊天记录" />
            )}
            </Card>
            
            {/* 订单历史 */}
            <Card 
              title={<div className="flex items-center"><ShoppingCartOutlined className="mr-2" />订单历史</div>}
              bordered={false}
              hoverable
            >
              {orderHistory.length > 0 ? (
              <>
                <div className="list-container">
                  {orderHistory.slice(0, 3).map((item) => (
                    <div key={item.id} className="list-item py-2 border-b border-gray-100">
                      <div className="flex justify-between items-start w-full">
                        <div>
                          <Text strong>{item.id}</Text>
                          <br />
                          <Text type="secondary" className="text-xs">
                            {new Date(item.date).toLocaleDateString()}
                          </Text>
                        </div>
                        <div className="text-right">
                          <Text strong>${item.amount.toFixed(2)}</Text>
                          <br />
                          <Tag color={item.status === 'completed' ? 'green' : item.status === 'shipped' ? 'blue' : 'orange'}>
                            {item.status}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {orderHistory.length > 3 && (
                  <div className="mt-2 text-center">
                    <Button type="link" size="small" onClick={() => eventBus.emit('orders:open', selectedCustomerId)}>
                      查看完整订单记录 ({orderHistory.length})
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Empty description="暂无订单记录" />
            )}
            </Card>
            
            {/* 产品交互 */}
            <Card 
              title={<div className="flex items-center"><ShoppingCartOutlined className="mr-2" />产品交互</div>}
              bordered={false}
              hoverable
            >
              {productInteractions.length > 0 ? (
              <>
                <div className="list-container">
                  {productInteractions.slice(0, 3).map((item) => (
                    <div key={`${item.productId}-${item.timestamp}`} className="list-item py-2 border-b border-gray-100">
                      <div className="flex justify-between items-start w-full">
                        <div>
                          <Text strong>{item.name}</Text>
                          <br />
                          <Tag color={item.type === 'purchase' ? 'green' : item.type === 'add_to_cart' ? 'orange' : 'blue'}>
                            {item.type === 'view' ? '浏览' : item.type === 'add_to_cart' ? '加入购物车' : '购买'}
                          </Tag>
                        </div>
                        <div>
                          <Text type="secondary" className="text-xs">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </Text>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {productInteractions.length > 3 && (
                  <div className="mt-2 text-center">
                    <Button type="link" size="small" onClick={() => eventBus.emit('products:open', selectedCustomerId)}>
                      查看完整产品交互 ({productInteractions.length})
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Empty description="暂无产品交互" />
            )}
            </Card>
            
            {/* 数据分析 */}
            <Card 
              title={<div className="flex items-center"><PieChartOutlined className="mr-2" />数据分析</div>}
              bordered={false}
              hoverable
            >
              <div className="space-y-3">
                <Descriptions size="small" column={1}>
                  <Item label="总消费">
                    <Text strong>${analyticsData.totalSpent?.toFixed(2) || '0.00'}</Text>
                  </Item>
                  <Item label="平均订单价值">
                    <Text strong>${analyticsData.averageOrderValue?.toFixed(2) || '0.00'}</Text>
                  </Item>
                  <Item label="订单数量">
                    <Text strong>{analyticsData.orderCount || 0}</Text>
                  </Item>
                  <Item label="最近购买">
                    <Text type="secondary">
                      {analyticsData.lastPurchase ? new Date(analyticsData.lastPurchase).toLocaleDateString() : '无'}
                    </Text>
                  </Item>
                  <Item label="活跃度得分">
                    <div className="flex items-center">
                      <Text strong>{analyticsData.engagementScore || 0}</Text>
                      <div className="ml-2 w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${analyticsData.engagementScore || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </Item>
                </Descriptions>
                <div className="mt-2 text-center">
                  <Button type="link" size="small" onClick={() => eventBus.emit('analytics:open', selectedCustomerId)}>
                    查看完整数据分析
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </Card>
      )}
      
      {/* 创建客户模态框 */}
      <Modal
        title="新增客户"
        open={isCreateModalVisible}
        onOk={handleCreateCustomer}
        onCancel={handleModalCancel}
        okText="创建"
        cancelText="取消"
        width={700}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{
            status: 'active'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="display_name"
                label="客户名称"
                rules={[{ required: true, message: '请输入客户名称' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="请输入客户名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="客户状态"
                rules={[{ required: true, message: '请选择客户状态' }]}
              >
                <Select placeholder="请选择客户状态">
                  {STATUS_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="请输入邮箱地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="电话"
              >
                <Input prefix={<PhoneOutlined />} placeholder="请输入电话" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="address"
            label="地址"
          >
            <Input.TextArea placeholder="请输入地址" rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="请选择或输入标签"
                  style={{ width: '100%' }}
                >
                  <Option value="VIP">VIP客户</Option>
                  <Option value="新客户">新客户</Option>
                  <Option value="老客户">老客户</Option>
                  <Option value="高价值">高价值</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="channel_sources"
                label="渠道来源"
              >
                <Select
                  mode="multiple"
                  placeholder="请选择或输入渠道来源"
                  style={{ width: '100%' }}
                >
                  <Option value="chat">聊天</Option>
                  <Option value="orders">订单</Option>
                  <Option value="products">产品</Option>
                  <Option value="shopify">Shopify</Option>
                  <Option value="facebook">Facebook</Option>
                  <Option value="youtube">YouTube</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
      
      {/* 编辑客户模态框 */}
      <Modal
        title="编辑客户"
        open={isEditModalVisible}
        onOk={handleEditCustomer}
        onCancel={handleModalCancel}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form
          form={editForm}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="display_name"
                label="客户名称"
                rules={[{ required: true, message: '请输入客户名称' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="请输入客户名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="客户状态"
                rules={[{ required: true, message: '请选择客户状态' }]}
              >
                <Select placeholder="请选择客户状态">
                  {STATUS_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="请输入邮箱地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="电话"
              >
                <Input prefix={<PhoneOutlined />} placeholder="请输入电话" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="address"
            label="地址"
          >
            <Input.TextArea placeholder="请输入地址" rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="请选择或输入标签"
                  style={{ width: '100%' }}
                >
                  <Option value="VIP">VIP客户</Option>
                  <Option value="新客户">新客户</Option>
                  <Option value="老客户">老客户</Option>
                  <Option value="高价值">高价值</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="channel_sources"
                label="渠道来源"
              >
                <Select
                  mode="multiple"
                  placeholder="请选择或输入渠道来源"
                  style={{ width: '100%' }}
                >
                  <Option value="chat">聊天</Option>
                  <Option value="orders">订单</Option>
                  <Option value="products">产品</Option>
                  <Option value="shopify">Shopify</Option>
                  <Option value="facebook">Facebook</Option>
                  <Option value="youtube">YouTube</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 右键菜单 */}
      {contextMenuVisible && contextMenuCustomerId && (
        <Menu
          openKeys={['delete']}
          selectedKeys={[]}
          onSelect={() => handleDeleteCustomer(contextMenuCustomerId!)}
          onOpenChange={handleContextMenuClose}
          style={{
            position: 'fixed',
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            zIndex: 10000,
            background: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            minWidth: 120,
            padding: '4px 0',
          }}
          items={[
            {
              key: 'delete',
              label: '删除客户',
              danger: true,
            },
          ]}
        />
      )}
    </div>
  );
};

export default CustomerModule;
