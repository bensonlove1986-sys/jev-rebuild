import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Empty, Tag, Table, Space, Modal, Form, Select, Divider, Tooltip, Popconfirm, Descriptions, InputNumber, Row, Col, message } from 'antd';
import { 
  PlusOutlined, DeleteOutlined, 
  EyeOutlined, ReloadOutlined, FileTextOutlined,
  CopyOutlined, PlusCircleOutlined, MinusCircleOutlined
} from '@ant-design/icons';
import { useCustomersStore } from '../../store/customersStore';
import { useOrdersStore, type OrderStatus, type ExtendedOrder } from '../../store/ordersStore';
import { useProductsStore } from '../../store/productsStore';
import { eventBus } from '../../utils/eventBus';

const { Title, Text } = Typography;
const { Option } = Select;

// 订单状态选项
const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: '待处理', color: 'orange' },
  { value: 'processing', label: '处理中', color: 'blue' },
  { value: 'shipped', label: '已发货', color: 'cyan' },
  { value: 'completed', label: '已完成', color: 'green' },
  { value: 'cancelled', label: '已取消', color: 'red' }
];

const OrderModule: React.FC = () => {
  const { selectedCustomerId, customers } = useCustomersStore();
  const {
    orders,
    currentOrder,
    isLoading,
    error,
    fetchOrdersByCustomer,
    updateOrderStatus,
    deleteOrder,
    selectOrder,
    clearCurrentOrder,
    createOrder
  } = useOrdersStore();
  
  const { products } = useProductsStore();
  
  const selectedCustomer = customers.find(c => c.customer_id === selectedCustomerId);
  
  // 状态管理
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'view' | 'edit' | 'create'>('view');
  const [form] = Form.useForm();
  const [orderProducts, setOrderProducts] = useState<Array<{
    productId: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>>([]);

  // 打开订单详情模态框
  const showOrderModal = (type: 'view' | 'edit' | 'create', order?: ExtendedOrder) => {
    setModalType(type);
    
    if (order) {
      // 设置表单值
      form.setFieldsValue({
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        orderDate: order.orderDate,
        status: order.status
      });
      
      // 设置订单产品
      setOrderProducts(order.products);
      
      // 选择订单
      selectOrder(order.id);
    } else {
      // 重置表单
      form.resetFields();
      clearCurrentOrder();
      
      // 如果没有订单产品，添加一个空产品
      if (orderProducts.length === 0) {
        setOrderProducts([{
          productId: '',
          name: '',
          category: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0
        }]);
      }
    }
    
    setIsModalVisible(true);
  };

  // 组件挂载时初始化事件监听
  useEffect(() => {
    // 监听CRM加载客户数据事件
    const handleCRMDataLoad = (customerId: string) => {
      console.log('Loading orders for customer:', customerId);
      // 使用ordersStore加载该客户的订单数据
      fetchOrdersByCustomer(customerId);
    };
    
    // 监听客户选择事件
    const handleCustomerSelected = (customer: Customer) => {
      console.log('Customer selected from CRM:', customer);
      fetchOrdersByCustomer(customer.customer_id);
    };
    
    // 监听从产品中心创建订单事件
    const handleCreateOrderFromProduct = (product: { id: string; name: string; category: string; price: number }) => {
      console.log('Creating order from product:', product);
      
      // 如果没有选中客户，提示用户先选择客户
      if (!selectedCustomerId) {
        message.warning('请先选择一个客户');
        return;
      }
      
      // 设置订单产品
      const newOrderProduct = {
        productId: product.id,
        name: product.name,
        category: product.category,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price
      };
      
      setOrderProducts([newOrderProduct]);
      
      // 打开创建订单模态框
      showOrderModal('create');
      
      message.success(`正在为产品 ${product.name} 创建订单`);
    };
    
    // 订阅事件
    eventBus.on('crm:loadCustomerData', handleCRMDataLoad);
    eventBus.on('customer:selected', handleCustomerSelected);
    eventBus.on('product:createOrder', handleCreateOrderFromProduct);
    
    // 初始加载当前选中客户的订单
    if (selectedCustomerId) {
      fetchOrdersByCustomer(selectedCustomerId);
    }
    
    return () => {
      // 取消订阅事件
      eventBus.off('crm:loadCustomerData', handleCRMDataLoad);
      eventBus.off('customer:selected', handleCustomerSelected);
      eventBus.off('product:createOrder', handleCreateOrderFromProduct);
    };
  }, [selectedCustomerId, fetchOrdersByCustomer, message]);
  
  // 计算订单总金额
  const calculateTotalAmount = () => {
    return orderProducts.reduce((total, product) => total + product.totalPrice, 0);
  };

  // 添加产品到订单
  const addProductToOrder = () => {
    if (orderProducts.length >= 10) {
      message.warning('每个订单最多只能添加10个产品');
      return;
    }
    
    setOrderProducts([...orderProducts, {
      productId: '',
      name: '',
      category: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    }]);
  };

  // 从订单中移除产品
  const removeProductFromOrder = (index: number) => {
    if (orderProducts.length <= 1) {
      message.warning('订单至少需要包含1个产品');
      return;
    }
    
    const newProducts = [...orderProducts];
    newProducts.splice(index, 1);
    setOrderProducts(newProducts);
  };

  // 更新订单产品
  const updateOrderProduct = (index: number, field: string, value: any) => {
    const newProducts = [...orderProducts];
    const product = newProducts[index];
    
    if (field === 'productId') {
      // 当选择产品时，自动填充产品信息
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        product.productId = selectedProduct.id;
        product.name = selectedProduct.name;
        product.category = selectedProduct.category;
        product.unitPrice = selectedProduct.price;
        product.totalPrice = selectedProduct.price * product.quantity;
      }
    } else if (field === 'quantity' || field === 'unitPrice') {
      // 当数量或单价变化时，重新计算总价
      product[field] = value;
      product.totalPrice = product.quantity * product.unitPrice;
    } else {
      product[field] = value;
    }
    
    newProducts[index] = product;
    setOrderProducts(newProducts);
  };


  
  // 关闭模态框
  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    clearCurrentOrder();
  };
  
  // 处理订单状态更新
  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status)
      .then(() => {
        message.success('订单状态更新成功');
      })
      .catch(() => {
        message.error('订单状态更新失败');
      });
  };
  
  // 处理订单删除
  const handleDeleteOrder = (orderId: string) => {
    deleteOrder(orderId)
      .then(() => {
        message.success('订单删除成功');
      })
      .catch(() => {
        message.error('订单删除失败');
      });
  };

  // 处理订单创建
  const handleCreateOrder = () => {
    // 验证订单产品
    if (orderProducts.some(p => !p.productId || p.quantity <= 0 || p.unitPrice <= 0)) {
      message.error('请填写完整的产品信息，数量和单价必须大于0');
      return;
    }

    // 检查是否有选中客户
    if (!selectedCustomerId || !selectedCustomer) {
      message.error('请先选择一个客户');
      return;
    }

    // 创建订单数据
    const orderData = {
      customerId: selectedCustomerId,
      customerName: selectedCustomer.display_name,
      orderDate: new Date().toISOString().split('T')[0],
      status: 'pending' as OrderStatus,
      products: orderProducts,
      totalAmount: calculateTotalAmount()
    };

    // 调用创建订单方法
    createOrder(orderData)
      .then(() => {
        message.success('订单创建成功');
        // 关闭模态框
        handleModalCancel();
        // 刷新订单列表
        fetchOrdersByCustomer(selectedCustomerId);
      })
      .catch(() => {
        message.error('订单创建失败');
      });
  };
  
  // 生成PI按钮点击处理
  const handleGeneratePI = (order: ExtendedOrder) => {
    if (order.customerId) {
      console.log('Generating PI for order:', order.id, 'customer:', order.customerId);
      // 触发生成PI事件
      eventBus.emit('order:generatePI', { 
        customerId: order.customerId, 
        orderId: order.id,
        orderData: order
      });
      message.success('正在生成PI...');
    }
  };
  
  // 复制订单
  const handleCopyOrder = (order: ExtendedOrder) => {
    console.log('Copying order:', order.id);
    // 触发复制订单事件
    eventBus.emit('order:copy', order);
    message.success('订单复制成功');
  };
  
  // 表格列配置
  const orderColumns = [
    {
      title: '订单ID',
      dataIndex: 'id',
      key: 'id',
      width: 120
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 150,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '订单日期',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 120
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 100,
      render: (amount: number) => (
        <Text strong className="text-blue-600">¥{amount.toFixed(2)}</Text>
      )
    },
    {
      title: '产品数量',
      key: 'productCount',
      width: 100,
      render: (_, record: ExtendedOrder) => record.products.length
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: OrderStatus) => {
        const statusOption = ORDER_STATUS_OPTIONS.find(option => option.value === status);
        return (
          <Tag color={statusOption?.color || 'gray'}>
            {statusOption?.label || status}
          </Tag>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (timestamp: number) => new Date(timestamp).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_, record: ExtendedOrder) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="link" icon={<EyeOutlined />} onClick={() => showOrderModal('view', record)}>
              详情
            </Button>
          </Tooltip>
          <Tooltip title="生成PI">
            <Button 
              type="link" 
              icon={<FileTextOutlined />} 
              onClick={() => handleGeneratePI(record)}
            >
              生成PI
            </Button>
          </Tooltip>
          <Tooltip title="更新状态">
            <Select
              value={record.status}
              onChange={(value) => handleUpdateStatus(record.id, value)}
              style={{ width: 120 }}
              size="small"
              placeholder="更新状态"
            >
              {ORDER_STATUS_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Option>
              ))}
            </Select>
          </Tooltip>
          <Tooltip title="复制订单">
            <Button type="link" icon={<CopyOutlined />} onClick={() => handleCopyOrder(record)}>
              复制
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除这个订单吗？"
            onConfirm={() => handleDeleteOrder(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除订单">
              <Button type="link" icon={<DeleteOutlined />} danger>
                删除
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="h-full bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="m-0">订单管理</Title>
        <Space size="middle">
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => selectedCustomerId && fetchOrdersByCustomer(selectedCustomerId)}
            loading={isLoading}
          >
            刷新
          </Button>
          {selectedCustomer && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => showOrderModal('create')}
              disabled={!selectedCustomerId}
            >
              新建订单
            </Button>
          )}
        </Space>
      </div>
      
      {error && (
        <Card className="mb-4" type="inner" title="错误信息" bordered={false}>
          <Text type="danger">{error}</Text>
        </Card>
      )}
      
      {!selectedCustomerId ? (
        <Empty description="请先选择一个客户" />
      ) : (
        <>
          <Card className="mb-4">
            <div className="flex items-center">
              <Text strong>客户:</Text>
              <Text className="ml-2">{selectedCustomer?.display_name}</Text>
              <Text className="ml-4 text-gray-500">ID: {selectedCustomerId}</Text>
            </div>
          </Card>
          
          {/* 获取当前客户的订单 */}
          {selectedCustomerId && (
            <>
              {orders[selectedCustomerId]?.length > 0 ? (
                <Card>
                  <Table
                    columns={orderColumns}
                    dataSource={orders[selectedCustomerId]}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1200 }}
                  />
                </Card>
              ) : (
                <Empty description="该客户暂无订单" />
              )}
            </>
          )}
        </>
      )}
      
      {/* 订单详情/创建模态框 */}
      <Modal
        title={`${modalType === 'view' ? '订单详情' : modalType === 'edit' ? '编辑订单' : '创建订单'}`}
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={[
          <Button key="cancel" onClick={handleModalCancel}>
            取消
          </Button>,
          modalType === 'create' && (
            <Button key="submit" type="primary" onClick={handleCreateOrder}>
              创建订单
            </Button>
          )
        ]}
        width={800}
        destroyOnHidden
      >
        {modalType === 'create' ? (
          <Form
            form={form}
            layout="vertical"
            className="space-y-6"
          >
            <Card size="small">
              <Title level={5} className="m-0 mb-4">订单基本信息</Title>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="客户名称" name="customerName" rules={[{ required: true, message: '请选择客户' }]}>
                    <InputNumber value={selectedCustomer?.display_name} disabled style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="客户ID" name="customerId" rules={[{ required: true, message: '请选择客户' }]}>
                    <InputNumber value={selectedCustomer?.customer_id} disabled style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
            
            <Card size="small">
              <div className="flex justify-between items-center mb-4">
                <Title level={5} className="m-0">产品列表</Title>
                <Button 
                  type="dashed" 
                  icon={<PlusCircleOutlined />} 
                  onClick={addProductToOrder}
                >
                  添加产品
                </Button>
              </div>
              
              <div className="space-y-4">
                {orderProducts.map((product, index) => (
                  <Card key={index} size="small" className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Text strong>产品 {index + 1}</Text>
                      {orderProducts.length > 1 && (
                        <Button 
                          type="text" 
                          danger 
                          icon={<MinusCircleOutlined />} 
                          onClick={() => removeProductFromOrder(index)}
                        >
                          移除
                        </Button>
                      )}
                    </div>
                    
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item 
                          label="选择产品" 
                          rules={[{ required: true, message: '请选择产品' }]}
                        >
                          <Select
                            value={product.productId}
                            placeholder="请选择产品"
                            style={{ width: '100%' }}
                            onChange={(value) => updateOrderProduct(index, 'productId', value)}
                          >
                            {products.map(p => (
                              <Option key={p.id} value={p.id}>
                                {p.name} ({p.category})
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item 
                          label="数量" 
                          rules={[{ required: true, message: '请输入数量' }]}
                        >
                          <InputNumber
                            min={1}
                            value={product.quantity}
                            onChange={(value) => updateOrderProduct(index, 'quantity', value)}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item 
                          label="单价" 
                          rules={[{ required: true, message: '请输入单价' }]}
                        >
                          <InputNumber
                            min={0.01}
                            step={0.01}
                            value={product.unitPrice}
                            onChange={(value) => updateOrderProduct(index, 'unitPrice', value)}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item label="小计">
                          <InputNumber
                            value={product.totalPrice}
                            disabled
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>
              
              <Divider orientation="right" style={{ margin: '16px 0 0 0' }}>
                <div className="flex items-center gap-2">
                  <Text strong>订单合计:</Text>
                  <Text strong className="text-blue-600 text-lg">¥{calculateTotalAmount().toFixed(2)}</Text>
                </div>
              </Divider>
            </Card>
          </Form>
        ) : (
          currentOrder && (
            <div className="space-y-6">
              <Card size="small">
                <Title level={5} className="m-0 mb-4">订单基本信息</Title>
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="订单ID" span={1}>
                    <Text strong>{currentOrder.id}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="客户名称" span={1}>
                    <Text strong>{currentOrder.customerName}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="客户ID">
                    {currentOrder.customerId}
                  </Descriptions.Item>
                  <Descriptions.Item label="订单日期">
                    {currentOrder.orderDate}
                  </Descriptions.Item>
                  <Descriptions.Item label="订单状态">
                    <Tag color={ORDER_STATUS_OPTIONS.find(option => option.value === currentOrder.status)?.color || 'gray'}>
                      {ORDER_STATUS_OPTIONS.find(option => option.value === currentOrder.status)?.label || currentOrder.status}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="总金额">
                    <Text strong className="text-blue-600">¥{currentOrder.totalAmount.toFixed(2)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {new Date(currentOrder.createdAt).toLocaleString()}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {new Date(currentOrder.updatedAt).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
              
              <Card size="small">
                <div className="flex justify-between items-center mb-4">
                  <Title level={5} className="m-0">产品列表</Title>
                  <Text type="secondary">共 {currentOrder.products.length} 个产品</Text>
                </div>
                
                <Table
                  columns={[
                    { title: '产品ID', dataIndex: 'productId', key: 'productId', width: 120 },
                    { title: '产品名称', dataIndex: 'name', key: 'name', width: 180, render: (text: string, record: any) => (
                      <Button type="link" onClick={() => eventBus.emit('product:view', { productId: record.productId })}>
                        {text}
                      </Button>
                    )},
                    { title: '分类', dataIndex: 'category', key: 'category', width: 100 },
                    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'center' },
                    { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', width: 100, align: 'right', render: (price: number) => `¥${price.toFixed(2)}` },
                    { title: '总价', dataIndex: 'totalPrice', key: 'totalPrice', width: 100, align: 'right', render: (price: number) => <Text strong>¥{price.toFixed(2)}</Text> }
                  ]}
                  dataSource={currentOrder.products}
                  rowKey="productId"
                  pagination={false}
                  size="small"
                  scroll={{ x: 600 }}
                />
                
                <Divider orientation="right" style={{ margin: '16px 0 0 0' }}>
                  <div className="flex items-center gap-2">
                    <Text strong>合计:</Text>
                    <Text strong className="text-blue-600 text-lg">¥{currentOrder.totalAmount.toFixed(2)}</Text>
                  </div>
                </Divider>
              </Card>
              
              <Card size="small">
                <Title level={5} className="m-0 mb-4">订单操作</Title>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="primary" 
                    icon={<FileTextOutlined />} 
                    onClick={() => handleGeneratePI(currentOrder)}
                  >
                    生成PI
                  </Button>
                  <Select
                    value={currentOrder.status}
                    onChange={(value) => handleUpdateStatus(currentOrder.id, value)}
                    style={{ width: 150 }}
                    placeholder="更新状态"
                  >
                    {ORDER_STATUS_OPTIONS.map(option => (
                      <Option key={option.value} value={option.value}>
                        <Tag color={option.color}>{option.label}</Tag>
                      </Option>
                    ))}
                  </Select>
                  <Button type="default" icon={<CopyOutlined />} onClick={() => handleCopyOrder(currentOrder)}>
                    复制订单
                  </Button>
                  <Popconfirm
                    title="确定要删除这个订单吗？"
                    onConfirm={() => handleDeleteOrder(currentOrder.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="danger" icon={<DeleteOutlined />}>
                      删除订单
                    </Button>
                  </Popconfirm>
                </div>
              </Card>
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

export default OrderModule;
