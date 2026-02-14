import React, { useState, useEffect } from 'react';
import { Card, Button, Tabs, Input, Space, Typography, Select, Form, InputNumber, Table, Tag, Modal, Steps, message } from 'antd';
import { SearchOutlined, PlusOutlined, DownloadOutlined, EyeOutlined, EditOutlined, DeleteOutlined, SaveOutlined, SendOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOrdersStore } from '../../store/ordersStore';
import { useCustomersStore } from '../../store/customersStore';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

interface Product {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Template {
  id: string;
  name: string;
  createdAt: string;
  variableCount: number;
  content: string;
}

interface TemplateModalState {
  visible: boolean;
  mode: 'create' | 'edit';
  template: Partial<Template>;
};

interface PIDetailsModalState {
  visible: boolean;
  pi: PI | null;
};

interface PI {
  id: string;
  piNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  createdAt: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  products: Product[];
  shippingInfo: {
    address: string;
    method: string;
    estimatedDelivery: string;
  };
  paymentInfo: {
    method: string;
    terms: string;
    bankInfo: string;
  };
}

const PiModule: React.FC = () => {
  // 订单和客户状态
  const { orders, fetchOrdersByCustomer, fetchOrders } = useOrdersStore();
  const { fetchCustomers, selectedCustomerId } = useCustomersStore();
  
  const [activeTab, setActiveTab] = useState('create');
  const [currentStep, setCurrentStep] = useState(0); // 0: 基本信息, 1: 产品信息, 2: 配送信息, 3: 付款信息, 4: 预览
  const [products, setProducts] = useState<Product[]>([{ id: '1', name: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [pis, setPis] = useState<PI[]>([]);
  const [templates, setTemplates] = useState<Template[]>([
    { id: 'default', name: '默认模板', createdAt: '2025-12-24', variableCount: 12, content: '<h1>PI #{{piNumber}}</h1>' }
  ]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [templateModal, setTemplateModal] = useState<TemplateModalState>({
    visible: false,
    mode: 'create',
    template: {}
  });
  const [templateForm] = Form.useForm<Template>();
  
  // PI详情模态框状态
  const [piDetailsModal, setPiDetailsModal] = useState<PIDetailsModalState>({
    visible: false,
    pi: null
  });
  
  // 订单选择状态
  const [selectedOrderId, setSelectedOrderId] = useState('');
  
  // 组件挂载时获取订单和客户数据
  useEffect(() => {
    fetchCustomers();
    fetchOrders();
  }, [fetchCustomers, fetchOrders]);
  
  // 当选中客户变化时，获取该客户的订单
  useEffect(() => {
    if (selectedCustomerId) {
      fetchOrdersByCustomer(selectedCustomerId);
    }
  }, [selectedCustomerId, fetchOrdersByCustomer]);
  
  // 使用useMemo计算可用订单列表，避免useEffect中的setState
  const availableOrders = React.useMemo(() => {
    if (selectedCustomerId && orders[selectedCustomerId]) {
      return orders[selectedCustomerId];
    } else {
      // 如果没有选中客户，显示所有订单
      const allOrders = Object.values(orders).flat();
      return allOrders;
    }
  }, [orders, selectedCustomerId]);
  
  // 查看PI详情
  const viewPIDetails = (pi: PI) => {
    setPiDetailsModal({ visible: true, pi });
  };
  
  // 关闭PI详情模态框
  const closePIDetailsModal = () => {
    setPiDetailsModal({ visible: false, pi: null });
  };

  // 表单实例
  const [form] = Form.useForm();

  // 生成唯一ID
  const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  // 生成PI编号
  const generatePINumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = String(pis.length + 1).padStart(4, '0');
    return `PI-${year}${month}-${count}`;
  };
  
  // 从订单导入产品
  const handleImportFromOrder = (orderId: string) => {
    const allOrders = Object.values(orders).flat();
    const selectedOrder = allOrders.find(order => order.id === orderId);
    
    if (selectedOrder) {
      // 转换订单产品为PI产品格式
      const importedProducts = selectedOrder.products.map((product: any) => ({
        id: product.productId,
        name: product.name,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        total: product.totalPrice
      }));
      
      setProducts(importedProducts);
      message.success(`从订单 ${selectedOrder.id} 成功导入 ${importedProducts.length} 个产品`);
    } else {
      message.error('未找到指定订单');
    }
  };

  // 添加产品
  const addProduct = () => {
    setProducts([...products, { id: generateId(), name: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  // 删除产品
  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    } else {
      message.warning('至少需要一个产品');
    }
  };

  // 更新产品
  const updateProduct = (id: string, field: keyof Product, value: any) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        const updatedProduct = { ...p, [field]: value };
        // 自动计算总价
        updatedProduct.total = updatedProduct.quantity * updatedProduct.unitPrice;
        return updatedProduct;
      }
      return p;
    }));
  };

  // 计算总计
  const calculateTotal = () => {
    return products.reduce((sum, p) => sum + p.total, 0);
  };

  // 预览PI
  const previewPI = () => {
    // 验证当前步骤的表单
    form.validateFields().then(values => {
      // 生成完整的PI数据用于预览
      const piData: PI = {
        id: generateId(),
        piNumber: values.piNumber || generatePINumber(),
        customerId: values.customerId || generateId(),
        customerName: values.customerName,
        amount: calculateTotal(),
        createdAt: new Date().toISOString(),
        status: 'draft',
        products: products,
        shippingInfo: {
          address: values.shippingAddress || '',
          method: values.shippingMethod,
          estimatedDelivery: values.estimatedDelivery || ''
        },
        paymentInfo: {
          method: values.paymentMethod,
          terms: values.paymentTerms,
          bankInfo: values.bankInfo || ''
        }
      };
      
      // 渲染PI模板
      const htmlContent = `
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .container { max-width: 800px; margin: 0 auto; }
            .section { margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .total { text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Proforma Invoice - ${piData.piNumber}</h1>
            
            <div class="section">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${piData.customerName}</p>
              <p><strong>Contact:</strong> ${values.contact || ''}</p>
              <p><strong>Email:</strong> ${values.email || ''}</p>
              <p><strong>Phone:</strong> ${values.phone || ''}</p>
              <p><strong>Address:</strong> ${values.address || ''}</p>
            </div>
            
            <div class="section">
              <h3>Product Details</h3>
              <table class="table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${piData.products.map(product => `
                    <tr>
                      <td>${product.name}</td>
                      <td>${product.quantity}</td>
                      <td>¥${product.unitPrice.toFixed(2)}</td>
                      <td>¥${product.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="total">
                <p>Total Amount: ¥${piData.amount.toFixed(2)}</p>
              </div>
            </div>
            
            <div class="section">
              <h3>Shipping Information</h3>
              <p><strong>Address:</strong> ${piData.shippingInfo.address}</p>
              <p><strong>Method:</strong> ${piData.shippingInfo.method === 'express' ? '快递' : piData.shippingInfo.method === 'air' ? '空运' : '海运'}</p>
              <p><strong>Estimated Delivery:</strong> ${piData.shippingInfo.estimatedDelivery}</p>
            </div>
            
            <div class="section">
              <h3>Payment Information</h3>
              <p><strong>Method:</strong> ${piData.paymentInfo.method === 'bankTransfer' ? '银行转账' : piData.paymentInfo.method === 'paypal' ? 'PayPal' : '信用卡'}</p>
              <p><strong>Terms:</strong> ${piData.paymentInfo.terms === '15days' ? '15天' : piData.paymentInfo.terms === '30days' ? '30天' : '60天'}</p>
              <p><strong>Bank Info:</strong> ${piData.paymentInfo.bankInfo}</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      setPreviewContent(htmlContent);
      setPreviewVisible(true);
    }).catch(() => {
      message.error('请填写完整信息');
    });
  };

  // 生成PI
  const generatePI = () => {
    form.validateFields().then(values => {
      const newPI: PI = {
        id: generateId(),
        piNumber: values.piNumber || generatePINumber(),
        customerId: values.customerId || generateId(),
        customerName: values.customerName,
        amount: calculateTotal(),
        createdAt: new Date().toISOString(),
        status: 'draft',
        products: products,
        shippingInfo: {
          address: values.shippingAddress || '',
          method: values.shippingMethod,
          estimatedDelivery: values.estimatedDelivery || ''
        },
        paymentInfo: {
          method: values.paymentMethod,
          terms: values.paymentTerms,
          bankInfo: values.bankInfo || ''
        }
      };
      setPis([newPI, ...pis]);
      message.success('PI生成成功');
      // 自动下载生成的PI
      downloadPI(newPI);
      
      // 重置表单和步骤
      form.resetFields();
      setProducts([{ id: '1', name: '', quantity: 1, unitPrice: 0, total: 0 }]);
      setCurrentStep(0);
    }).catch(() => {
      message.error('请填写完整信息');
    });
  };
  
  // 步骤导航 - 下一步
  const handleNextStep = () => {
    // 验证当前步骤的表单
    form.validateFields().then(() => {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        // 如果是最后一步，生成预览
        if (currentStep + 1 === 4) {
          previewPI();
        }
      }
    }).catch(() => {
      message.error('请填写完整信息');
    });
  };
  
  // 步骤导航 - 上一步
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  

  // 下载PI
  const downloadPI = (pi: PI) => {
    // 这里可以实现真正的PDF生成和下载逻辑
    // 目前使用简单的HTML下载作为示例
    const htmlContent = `
      <html>
        <head>
          <title>PI - ${pi.piNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .container { max-width: 800px; margin: 0 auto; }
            .section { margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .total { text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Proforma Invoice - ${pi.piNumber}</h1>
            
            <div class="section">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${pi.customerName}</p>
            </div>
            
            <div class="section">
              <h3>Product Details</h3>
              <table class="table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${pi.products.map(product => `
                    <tr>
                      <td>${product.name}</td>
                      <td>${product.quantity}</td>
                      <td>¥${product.unitPrice.toFixed(2)}</td>
                      <td>¥${product.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="total">
                <p>Total Amount: ¥${pi.amount.toFixed(2)}</p>
              </div>
            </div>
            
            <div class="section">
              <h3>Shipping Information</h3>
              <p><strong>Address:</strong> ${pi.shippingInfo.address}</p>
              <p><strong>Method:</strong> ${pi.shippingInfo.method === 'express' ? '快递' : pi.shippingInfo.method === 'air' ? '空运' : '海运'}</p>
              <p><strong>Estimated Delivery:</strong> ${pi.shippingInfo.estimatedDelivery}</p>
            </div>
            
            <div class="section">
              <h3>Payment Information</h3>
              <p><strong>Method:</strong> ${pi.paymentInfo.method === 'bankTransfer' ? '银行转账' : pi.paymentInfo.method === 'paypal' ? 'PayPal' : '信用卡'}</p>
              <p><strong>Terms:</strong> ${pi.paymentInfo.terms === '15days' ? '15天' : pi.paymentInfo.terms === '30days' ? '30天' : '60天'}</p>
              <p><strong>Bank Info:</strong> ${pi.paymentInfo.bankInfo}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // 使用数据URL替代blob URL，避免安全限制问题
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `PI-${pi.piNumber}.html`;
    document.body.appendChild(a);
    a.click();
    if (a && a.parentNode) {
        a.parentNode.removeChild(a);
    }
    message.success('PI下载成功');
  };

  // 打开创建模板模态框
  const openCreateTemplateModal = () => {
    setTemplateModal({
      visible: true,
      mode: 'create',
      template: {}
    });
    templateForm.resetFields();
  };

  // 打开编辑模板模态框
  const openEditTemplateModal = (template: Template) => {
    setTemplateModal({
      visible: true,
      mode: 'edit',
      template: template
    });
    templateForm.setFieldsValue(template);
  };

  // 关闭模板模态框
  const closeTemplateModal = () => {
    setTemplateModal(prev => ({ ...prev, visible: false }));
    templateForm.resetFields();
  };

  // 保存模板
  const saveTemplate = () => {
    templateForm.validateFields().then(values => {
      const variableCount = (values.content.match(/\{\{/g) || []).length;
      const newTemplate: Template = {
        id: templateModal.mode === 'create' ? generateId() : values.id,
        name: values.name,
        content: values.content,
        createdAt: templateModal.mode === 'create' ? new Date().toISOString() : values.createdAt,
        variableCount: variableCount
      };

      if (templateModal.mode === 'create') {
        setTemplates([...templates, newTemplate]);
        message.success('模板创建成功');
      } else {
        setTemplates(templates.map(t => t.id === newTemplate.id ? newTemplate : t));
        message.success('模板更新成功');
      }
      closeTemplateModal();
    }).catch(() => {
      message.error('请填写完整信息');
    });
  };

  // 删除模板
  const deleteTemplate = (templateId: string) => {
    if (templateId === 'default') {
      message.warning('默认模板不能删除');
      return;
    }
    setTemplates(templates.filter(t => t.id !== templateId));
    message.success('模板删除成功');
    if (selectedTemplate === templateId) {
      setSelectedTemplate('default');
    }
  };

  // 预览模板
  const previewTemplate = (template: Template) => {
    setPreviewContent(template.content);
    setPreviewVisible(true);
  };

  // 表格列配置
  const piColumns = [
    {
      title: 'PI编号',
      dataIndex: 'piNumber',
      key: 'piNumber',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName'
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (text: number) => <Text>¥{text.toFixed(2)}</Text>
    },
    {
      title: '创建日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleDateString()
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = '';
        switch (status) {
          case 'draft':
            color = 'gray';
            break;
          case 'sent':
            color = 'blue';
            break;
          case 'paid':
            color = 'green';
            break;
          case 'cancelled':
            color = 'red';
            break;
        }
        return <Tag color={color}>{status === 'draft' ? '草稿' : status === 'sent' ? '已发送' : status === 'paid' ? '已付款' : '已取消'}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PI) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => viewPIDetails(record)}>查看</Button>
          <Button type="link" icon={<EditOutlined />} size="small">编辑</Button>
          <Button type="link" icon={<DownloadOutlined />} size="small" onClick={() => downloadPI(record)}>下载</Button>
          <Button type="link" icon={<SendOutlined />} size="small">发送</Button>
        </Space>
      )
    }
  ];

  return (
    <div className="h-full bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="m-0 flex items-center">
          <FileTextOutlined className="mr-2" />
          PI制作
        </Title>
        <Space>
          <Button type="default" icon={<SearchOutlined />}>搜索PI</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setActiveTab('create')}>创建PI</Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'create',
          label: '创建PI',
          children: (
            <Card className="mt-4">
              <Steps current={currentStep} className="mb-6">
                <Step title="基本信息" description="填写客户和PI基本信息" />
                <Step title="产品信息" description="添加或导入产品" />
                <Step title="配送信息" description="填写配送相关信息" />
                <Step title="付款信息" description="填写付款相关信息" />
                <Step title="预览" description="预览并生成PI" />
              </Steps>
              
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  shippingMethod: 'express',
                  paymentMethod: 'bankTransfer',
                  paymentTerms: '30days'
                }}
              >
                {/* 步骤1：基本信息 */}
                {currentStep === 0 && (
                  <div className="grid grid-cols-3 gap-6">
                    {/* 客户信息 */}
                    <div className="col-span-1">
                      <Card title="客户信息" size="small">
                        <Form.Item name="piNumber" label="PI编号">
                          <Input placeholder="自动生成" />
                        </Form.Item>
                        <Form.Item name="customerId" label="客户ID" hidden>
                          <Input placeholder="客户ID" />
                        </Form.Item>
                        <Form.Item name="customerName" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
                          <Input placeholder="客户名称" />
                        </Form.Item>
                        <Form.Item name="contact" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                          <Input placeholder="联系人" />
                        </Form.Item>
                        <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入正确的邮箱地址' }]}>
                          <Input placeholder="邮箱" />
                        </Form.Item>
                        <Form.Item name="phone" label="电话" rules={[{ required: true, message: '请输入电话' }]}>
                          <Input placeholder="电话" />
                        </Form.Item>
                        <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
                          <TextArea rows={3} placeholder="地址" />
                        </Form.Item>
                      </Card>
                      
                      {/* 模板选择 */}
                      <Card title="模板选择" size="small" className="mt-4">
                        <Select
                          value={selectedTemplate}
                          onChange={setSelectedTemplate}
                          style={{ width: '100%' }}
                        >
                          {templates.map(template => (
                            <Option key={template.id} value={template.id}>{template.name}</Option>
                          ))}
                        </Select>
                      </Card>
                    </div>
                    
                    {/* 步骤说明 */}
                    <div className="col-span-2">
                      <Card title="步骤说明" size="small">
                        <div className="space-y-2">
                          <p>1. 填写客户的基本信息，包括名称、联系人、邮箱、电话和地址</p>
                          <p>2. PI编号可以手动输入或留空自动生成</p>
                          <p>3. 选择合适的PI模板，将用于最终生成的PI文档</p>
                          <p>4. 点击「下一步」进入产品信息填写</p>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
                
                {/* 步骤2：产品信息 */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {/* 从订单导入 */}
                    <Card title="从订单导入" size="small">
                      <div className="flex gap-2 items-center">
                        <Select
                          value={selectedOrderId}
                          onChange={(value) => {
                            setSelectedOrderId(value);
                            if (value) {
                              handleImportFromOrder(value);
                            }
                          }}
                          placeholder="选择订单"
                          style={{ width: 300 }}
                        >
                          {availableOrders.map(order => (
                            <Option key={order.id} value={order.id}>
                              {order.id} - {order.customerName} - ¥{order.totalAmount.toFixed(2)}
                            </Option>
                          ))}
                        </Select>
                        <Button
                          type="default"
                          icon={<ReloadOutlined />}
                          onClick={() => {
                            fetchOrders();
                            message.success('订单列表已刷新');
                          }}
                        >
                          刷新订单
                        </Button>
                        <Text type="secondary">选择订单后自动导入产品</Text>
                      </div>
                    </Card>
                    
                    {/* 产品信息 */}
                    <Card title="产品信息" size="small">
                      <Space orientation="vertical" className="w-full">
                        {products.map((product) => (
                          <div key={product.id} className="flex items-center gap-2 border p-2 rounded">
                            <div className="w-1/3">
                              <Input
                                placeholder="产品名称"
                                value={product.name}
                                onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                                required
                              />
                            </div>
                            <div className="w-1/6">
                              <InputNumber
                                min={1}
                                placeholder="数量"
                                value={product.quantity}
                                onChange={(value) => updateProduct(product.id, 'quantity', value || 1)}
                                style={{ width: '100%' }}
                                required
                              />
                            </div>
                            <div className="w-1/6">
                              <InputNumber
                                min={0.01}
                                step={0.01}
                                placeholder="单价"
                                value={product.unitPrice}
                                onChange={(value) => updateProduct(product.id, 'unitPrice', value || 0)}
                                style={{ width: '100%' }}
                                required
                              />
                            </div>
                            <div className="w-1/6">
                              <InputNumber
                                min={0}
                                placeholder="总价"
                                value={product.total}
                                disabled
                                style={{ width: '100%' }}
                              />
                            </div>
                            <Button
                              type="default"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeProduct(product.id)}
                            >
                              删除
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="default"
                          icon={<PlusOutlined />}
                          onClick={addProduct}
                        >
                          添加产品
                        </Button>
                        <div className="flex justify-end">
                          <Text strong>总计: ¥{calculateTotal().toFixed(2)}</Text>
                        </div>
                      </Space>
                    </Card>
                  </div>
                )}
                
                {/* 步骤3：配送信息 */}
                {currentStep === 2 && (
                  <div className="grid grid-cols-3 gap-6">
                    {/* 配送信息 */}
                    <div className="col-span-2">
                      <Card title="配送信息" size="small">
                        <div className="grid grid-cols-2 gap-4">
                          <Form.Item name="shippingAddress" label="配送地址" rules={[{ required: true, message: '请输入配送地址' }]}>
                            <TextArea rows={3} placeholder="配送地址" />
                          </Form.Item>
                          <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="shippingMethod" label="配送方式" rules={[{ required: true, message: '请选择配送方式' }]}>
                              <Select>
                                <Option value="express">快递</Option>
                                <Option value="air">空运</Option>
                                <Option value="sea">海运</Option>
                              </Select>
                            </Form.Item>
                            <Form.Item name="estimatedDelivery" label="预计送达" rules={[{ required: true, message: '请输入预计送达时间' }]}>
                              <Input placeholder="预计送达时间" />
                            </Form.Item>
                          </div>
                        </div>
                      </Card>
                    </div>
                    
                    {/* 步骤说明 */}
                    <div className="col-span-1">
                      <Card title="步骤说明" size="small">
                        <div className="space-y-2">
                          <p>1. 填写客户的配送地址</p>
                          <p>2. 选择合适的配送方式</p>
                          <p>3. 填写预计送达时间</p>
                          <p>4. 点击「下一步」进入付款信息填写</p>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
                
                {/* 步骤4：付款信息 */}
                {currentStep === 3 && (
                  <div className="grid grid-cols-3 gap-6">
                    {/* 付款信息 */}
                    <div className="col-span-2">
                      <Card title="付款信息" size="small">
                        <div className="grid grid-cols-2 gap-4">
                          <Form.Item name="paymentMethod" label="付款方式" rules={[{ required: true, message: '请选择付款方式' }]}>
                            <Select>
                              <Option value="bankTransfer">银行转账</Option>
                              <Option value="paypal">PayPal</Option>
                              <Option value="creditCard">信用卡</Option>
                            </Select>
                          </Form.Item>
                          <Form.Item name="paymentTerms" label="付款期限" rules={[{ required: true, message: '请选择付款期限' }]}>
                            <Select>
                              <Option value="15days">15天</Option>
                              <Option value="30days">30天</Option>
                              <Option value="60days">60天</Option>
                            </Select>
                          </Form.Item>
                          <Form.Item name="bankInfo" label="银行信息" className="col-span-2" rules={[{ required: true, message: '请输入银行信息' }]}>
                            <TextArea rows={3} placeholder="银行信息" />
                          </Form.Item>
                        </div>
                      </Card>
                    </div>
                    
                    {/* 步骤说明 */}
                    <div className="col-span-1">
                      <Card title="步骤说明" size="small">
                        <div className="space-y-2">
                          <p>1. 选择合适的付款方式</p>
                          <p>2. 填写付款期限</p>
                          <p>3. 填写银行信息</p>
                          <p>4. 点击「下一步」进入预览</p>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
                
                {/* 步骤5：预览 */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    {/* 预览区域 */}
                    <Card title="PI预览" size="small">
                      <div className="border p-4 rounded" style={{ height: 500, overflow: 'auto' }}>
                        <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                      </div>
                    </Card>
                  </div>
                )}
                
                {/* 步骤导航按钮 */}
                <div className="flex justify-between mt-6">
                  {currentStep > 0 && (
                    <Button type="default" onClick={handlePrevStep}>
                      上一步
                    </Button>
                  )}
                  
                  <div className="flex gap-2">
                    {currentStep === 4 ? (
                      <>
                        <Button type="default" onClick={() => setPreviewVisible(true)}>
                          单独预览
                        </Button>
                        <Button type="primary" icon={<SaveOutlined />} onClick={generatePI}>
                          生成并保存
                        </Button>
                        <Button type="primary" icon={<DownloadOutlined />} onClick={generatePI}>
                          生成并下载
                        </Button>
                      </>
                    ) : (
                      <Button type="primary" onClick={handleNextStep}>
                        下一步
                      </Button>
                    )}
                  </div>
                </div>
              </Form>
            </Card>
          )
        },
        {
          key: 'manage',
          label: '管理PI',
          children: (
            <Card className="mt-4">
              <Table
                columns={piColumns}
                dataSource={pis}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          )
        },
        {
          key: 'templates',
          label: '模板管理',
          children: (
            <Card className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <Title level={5} className="m-0">模板列表</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTemplateModal}>新建模板</Button>
              </div>
              <Table
                columns={[
                  {
                    title: '模板名称',
                    dataIndex: 'name',
                    key: 'name'
                  },
                  {
                    title: '创建日期',
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    render: (text: string) => new Date(text).toLocaleDateString()
                  },
                  {
                    title: '变量数量',
                    dataIndex: 'variableCount',
                    key: 'variableCount'
                  },
                  {
                    title: '操作',
                    key: 'action',
                    render: (_: any, record: Template) => (
                      <Space size="small">
                        <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => previewTemplate(record)}>预览</Button>
                        <Button type="link" icon={<EditOutlined />} size="small" onClick={() => openEditTemplateModal(record)}>编辑</Button>
                        <Button type="link" danger icon={<DeleteOutlined />} size="small" onClick={() => deleteTemplate(record.id)}>删除</Button>
                      </Space>
                    )
                  }
                ]}
                dataSource={templates}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          )
        }
      ]} />

      {/* 预览模态框 */}
      <Modal
        title="PI预览"
        visible={previewVisible}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>关闭</Button>
        ]}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <div dangerouslySetInnerHTML={{ __html: previewContent }} />
      </Modal>

      {/* 模板编辑模态框 */}
      <Modal
        title={templateModal.mode === 'create' ? '创建模板' : '编辑模板'}
        visible={templateModal.visible}
        footer={[
          <Button key="cancel" onClick={closeTemplateModal}>取消</Button>,
          <Button key="save" type="primary" onClick={saveTemplate}>保存</Button>
        ]}
        onCancel={closeTemplateModal}
        width={800}
      >
        <Form
          form={templateForm}
          layout="vertical"
          initialValues={templateModal.template}
        >
          <Form.Item
            name="id"
            hidden
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="模板名称" />
          </Form.Item>
          <Form.Item
            name="content"
            label="模板内容"
            rules={[{ required: true, message: '请输入模板内容' }]}
          >
            <TextArea
              rows={10}
              placeholder="模板内容，支持变量如 {{piNumber}}、{{customerName}} 等"
            />
          </Form.Item>
          <Form.Item
            name="createdAt"
            hidden
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* PI详情模态框 */}
      <Modal
        title={`PI详情 - ${piDetailsModal.pi?.piNumber}`}
        visible={piDetailsModal.visible}
        footer={[
          <Button key="close" onClick={closePIDetailsModal}>关闭</Button>
        ]}
        onCancel={closePIDetailsModal}
        width={900}
      >
        {piDetailsModal.pi && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card title="基本信息" size="small">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Text strong>PI编号:</Text>
                    <Text>{piDetailsModal.pi.piNumber}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text strong>客户名称:</Text>
                    <Text>{piDetailsModal.pi.customerName}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text strong>创建日期:</Text>
                    <Text>{new Date(piDetailsModal.pi.createdAt).toLocaleDateString()}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text strong>状态:</Text>
                    <Tag color={piDetailsModal.pi.status === 'draft' ? 'gray' : piDetailsModal.pi.status === 'sent' ? 'blue' : piDetailsModal.pi.status === 'paid' ? 'green' : 'red'}>
                      {piDetailsModal.pi.status === 'draft' ? '草稿' : piDetailsModal.pi.status === 'sent' ? '已发送' : piDetailsModal.pi.status === 'paid' ? '已付款' : '已取消'}
                    </Tag>
                  </div>
                </div>
              </Card>
              <Card title="金额信息" size="small">
                <div className="flex justify-between items-center py-2">
                  <Text strong>总计金额:</Text>
                  <Text strong className="text-xl">¥{piDetailsModal.pi.amount.toFixed(2)}</Text>
                </div>
              </Card>
            </div>

            <Card title="产品列表" size="small">
              <Table
                columns={[
                  { title: '产品名称', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'quantity', key: 'quantity' },
                  { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', render: (text: number) => `¥${text.toFixed(2)}` },
                  { title: '总价', dataIndex: 'total', key: 'total', render: (text: number) => `¥${text.toFixed(2)}` }
                ]}
                dataSource={piDetailsModal.pi.products}
                rowKey="id"
                pagination={false}
              />
            </Card>

            <div className="grid grid-cols-2 gap-6">
              <Card title="配送信息" size="small">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Text strong>配送地址:</Text>
                    <Text>{piDetailsModal.pi.shippingInfo.address}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text strong>配送方式:</Text>
                    <Text>{piDetailsModal.pi.shippingInfo.method === 'express' ? '快递' : piDetailsModal.pi.shippingInfo.method === 'air' ? '空运' : '海运'}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text strong>预计送达:</Text>
                    <Text>{piDetailsModal.pi.shippingInfo.estimatedDelivery}</Text>
                  </div>
                </div>
              </Card>
              <Card title="付款信息" size="small">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Text strong>付款方式:</Text>
                    <Text>{piDetailsModal.pi.paymentInfo.method === 'bankTransfer' ? '银行转账' : piDetailsModal.pi.paymentInfo.method === 'paypal' ? 'PayPal' : '信用卡'}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text strong>付款期限:</Text>
                    <Text>{piDetailsModal.pi.paymentInfo.terms === '15days' ? '15天' : piDetailsModal.pi.paymentInfo.terms === '30days' ? '30天' : '60天'}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text strong>银行信息:</Text>
                    <Text>{piDetailsModal.pi.paymentInfo.bankInfo}</Text>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PiModule;