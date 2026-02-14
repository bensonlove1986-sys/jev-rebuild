import React, { useEffect } from 'react';
import { Card, Typography, Button, Space, Tag, Table, Modal, Input, InputNumber, Select, Upload } from 'antd';
import { ShoppingOutlined, PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, UserOutlined, ShoppingCartOutlined, UploadOutlined } from '@ant-design/icons';
const { Option } = Select;
import { eventBus } from '../../utils/eventBus';
import { useProductsStore } from '../../store/productsStore';

const { Title, Text } = Typography;

const ProductsModule: React.FC = () => {
  // 使用productsStore获取产品数据
  const {
    products,
    isLoading,
    fetchProducts,
    getProductSalesData,
    selectProduct,
    addProduct,
    batchAddProducts,
    updateProduct,
    deleteProduct
  } = useProductsStore();
  
  const [customerModalVisible, setCustomerModalVisible] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<ReturnType<typeof useProductsStore>['products'][0] | null>(null);
  const [productModalVisible, setProductModalVisible] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [currentProduct, setCurrentProduct] = React.useState<ReturnType<typeof useProductsStore>['products'][0] | null>(null);
  
  // 批量识别状态
  const [batchRecognitionVisible, setBatchRecognitionVisible] = React.useState(false);
  const [batchInputText, setBatchInputText] = React.useState('');
  const [recognizedProducts, setRecognizedProducts] = React.useState<ReturnType<typeof useProductsStore>['products']>([]);
  const [isRecognizing, setIsRecognizing] = React.useState(false);
  
  // 表单状态
  const [productForm, setProductForm] = React.useState({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    status: 'active' as 'active' | 'inactive'
  });

  // 组件挂载时初始化事件监听
  useEffect(() => {
    // 加载产品数据
    fetchProducts();
    
    // 监听CRM加载客户数据事件
    const handleCRMDataLoad = (customerId: string) => {
      console.log('Loading product interactions for customer:', customerId);
    };
    
    // 监听订单模块的产品查看事件
    const handleProductView = (data: { productId: string }) => {
      console.log('Viewing product from order:', data.productId);
      // 这里可以实现跳转到产品详情或高亮显示产品
      selectProduct(data.productId);
    };
    
    // 订阅事件
    eventBus.on('crm:loadCustomerData', handleCRMDataLoad);
    eventBus.on('product:view', handleProductView);
    
    return () => {
      // 取消订阅事件
      eventBus.off('crm:loadCustomerData', handleCRMDataLoad);
      eventBus.off('product:view', handleProductView);
    };
  }, [fetchProducts, selectProduct]);

  // 打开客户列表模态框
  const showCustomerModal = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setCustomerModalVisible(true);
  };

  // 获取购买该产品的客户列表
  const getCustomersForProduct = (): never[] => {
    // Return empty array - no mock customers allowed
    return [];
  };

  // 创建订单
  const handleCreateOrder = (product: typeof products[0]) => {
    console.log('Creating order for product:', product.id);
    // 触发创建订单事件，传递产品信息
    eventBus.emit('product:createOrder', product);
  };
  
  // 打开产品添加模态框
  const openAddProductModal = () => {
    setIsEditing(false);
    setCurrentProduct(null);
    setProductForm({
      name: '',
      category: '',
      price: 0,
      stock: 0,
      status: 'active'
    });
    setProductModalVisible(true);
  };
  
  // 打开产品编辑模态框
  const openEditProductModal = (product: typeof products[0]) => {
    setIsEditing(true);
    setCurrentProduct(product);
    setProductForm({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      status: product.status
    });
    setProductModalVisible(true);
  };
  
  // 关闭产品模态框
  const closeProductModal = () => {
    setProductModalVisible(false);
    setIsEditing(false);
    setCurrentProduct(null);
  };
  
  // 处理表单变化
  const handleFormChange = (field: keyof typeof productForm, value: any) => {
    setProductForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // 处理产品保存
  const handleSaveProduct = () => {
    if (!productForm.name.trim()) {
      alert('产品名称不能为空');
      return;
    }
    
    if (isEditing && currentProduct) {
      // 编辑现有产品
      updateProduct({
        ...currentProduct,
        ...productForm
      });
    } else {
      // 添加新产品
      const newProduct = {
        id: `product_${Date.now()}`,
        ...productForm,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      addProduct(newProduct);
    }
    
    closeProductModal();
  };
  
  // 处理产品删除
  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('确定要删除该产品吗？')) {
      deleteProduct(productId);
    }
  };
  
  // 批量识别逻辑
  const handleBatchRecognition = () => {
    if (!batchInputText.trim()) {
      alert('请输入产品信息');
      return;
    }
    
    setIsRecognizing(true);
    
    // 模拟识别过程，实际项目中可以调用API或更复杂的算法
    setTimeout(() => {
      const lines = batchInputText.trim().split('\n').filter(line => line.trim());
      const products = lines.map((line, index) => {
        // 基本信息提取
        const normalizedLine = line.replace(/[\s\n\r]+/g, ' ').trim();
        
        // 使用正则表达式提取价格
        const priceRegex = /([¥$]?)(\d+(?:\.\d{1,2})?)(?:元|元整|USD|CNY)?/i;
        const priceMatch = normalizedLine.match(priceRegex);
        const price = priceMatch ? parseFloat(priceMatch[2]) : 0;
        
        // 提取库存
        const stockRegex = /(?:库存:?|stock:?|数量:?)\s*(\d+)/i;
        const stockMatch = normalizedLine.match(stockRegex);
        const stock = stockMatch ? parseInt(stockMatch[1]) : 0;
        
        // 提取产品名称和分类
        // 尝试匹配多种分隔符: -, ,, |, / 等
        const delimiters = /[-|,\/]/g;
        const parts = normalizedLine.split(delimiters);
        const name = parts[0]?.replace(priceRegex, '').trim() || `产品${index + 1}`;
        const category = parts[1]?.trim() || '未分类';
        
        return {
          id: `batch_product_${Date.now()}_${index}`,
          name: name,
          category: category,
          price: price,
          stock: stock,
          status: 'active' as 'active' | 'inactive'
        };
      });
      
      setRecognizedProducts(products);
      setIsRecognizing(false);
    }, 1000);
  };
  
  // 批量保存逻辑
  const handleBatchSave = () => {
    if (recognizedProducts.length === 0) {
      alert('没有可保存的产品');
      return;
    }
    
    // 调用批量添加方法
    const productsToAdd = recognizedProducts.map(product => ({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      status: product.status
    }));
    
    batchAddProducts(productsToAdd);
    
    // 关闭模态框并重置状态
    setBatchRecognitionVisible(false);
    setBatchInputText('');
    setRecognizedProducts([]);
    
    // 刷新产品列表
    fetchProducts();
  };

  // 产品表格列配置
  const productColumns = [
    {
      title: '产品ID',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category'
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (text: number) => <Text>¥{text.toFixed(2)}</Text>
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'gray'}>
          {status === 'active' ? '在售' : '下架'}
        </Tag>
      )
    },
    {
      title: '购买客户',
      key: 'customers',
      render: (_: unknown, product: typeof products[0]) => {
        const customers = getCustomersForProduct();
        return (
          <Button 
            type="link" 
            size="small"
            onClick={() => showCustomerModal(product)}
          >
            {customers.length} 个客户
          </Button>
        );
      }
    },
    { title: '操作',
      key: 'action',
      render: (_: unknown, product: typeof products[0]) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => openEditProductModal(product)}>编辑</Button>
          <Button type="link" icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteProduct(product.id)}>删除</Button>
          <Button 
            type="primary" 
            icon={<ShoppingCartOutlined />} 
            size="small"
            onClick={() => handleCreateOrder(product)}
          >
            创建订单
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="h-full bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="m-0 flex items-center">
          <ShoppingOutlined className="mr-2" /> 产品中心
        </Title>
        <Space>
          <Button icon={<SearchOutlined />}>搜索产品</Button>
          <Button type="default" icon={<UploadOutlined />} onClick={() => setBatchRecognitionVisible(true)}>批量识别</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddProductModal}>添加产品</Button>
        </Space>
      </div>
      
      <Card>
        <div className="mb-6">
          <Title level={5} className="mb-4">产品管理</Title>
          <Text className="text-gray-600 mb-4 block">
            用于管理和展示产品信息，支持添加、编辑、删除和搜索产品
          </Text>
        </div>
        
        <Table 
          columns={productColumns} 
          dataSource={products} 
          rowKey="id" 
          size="middle"
          pagination={{ pageSize: 10 }}
          loading={isLoading}
        />
        
        {/* 销售数据统计 */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {products.map((product) => {
            const salesData = getProductSalesData(product.id);
            return (
              <Card key={product.id} size="small" title={`${product.name}销售数据`}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Text className="text-gray-500">总销量:</Text>
                    <Text strong>{salesData.totalSales}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text className="text-gray-500">总销售额:</Text>
                    <Text strong className="text-blue-600">¥{salesData.totalRevenue.toFixed(2)}</Text>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        
        {/* 产品与CRM协同说明 */}
        <Card className="mt-6 bg-blue-50 border-blue-100">
          <div className="flex items-center gap-3">
            <div className="text-blue-500">💡</div>
            <div>
              <Text strong className="block mb-1">产品中心与CRM协同</Text>
              <Text className="text-sm">
                1. 在产品中心查看购买该产品的客户列表
                2. 分析产品销售数据
                3. 为不同客户群体推荐合适的产品
                4. 在CRM中查看客户的产品购买历史
                5. 从产品中心直接创建订单
              </Text>
            </div>
          </div>
        </Card>
      </Card>

      {/* 客户列表模态框 */}
      <Modal
        title={`购买${selectedProduct?.name || ''}的客户`}
        open={customerModalVisible}
        onCancel={() => setCustomerModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedProduct && (
          <div>
            <Card className="mb-4">
              <div className="flex justify-between">
                <div>
                  <Text strong>{selectedProduct.name}</Text>
                  <Text className="ml-2 text-gray-500">{selectedProduct.category}</Text>
                </div>
                <Tag color={selectedProduct.status === 'active' ? 'green' : 'gray'}>
                  {selectedProduct.status === 'active' ? '在售' : '下架'}
                </Tag>
              </div>
            </Card>

            <Title level={5} className="mb-3">客户列表</Title>
            <div className="space-y-4">
              {getCustomersForProduct().map((customer: unknown) => {
                // Type assertion for customer object
                const typedCustomer = customer as { customer_id: string; display_name: string; status: 'active' | 'inactive' };
                return (
                <div key={typedCustomer.customer_id} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl text-gray-400">
                    <UserOutlined />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{typedCustomer.display_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Text className="text-sm">客户ID: {typedCustomer.customer_id}</Text>
                      <Tag color={typedCustomer.status === 'active' ? 'green' : 'gray'}>
                        {typedCustomer.status === 'active' ? '活跃' : '非活跃'}
                      </Tag>
                    </div>
                  </div>
                  <div>
                    <Button type="link" size="small">查看CRM详情</Button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
      
      {/* 产品添加/编辑模态框 */}
      <Modal
        title={isEditing ? '编辑产品' : '添加产品'}
        open={productModalVisible}
        onCancel={closeProductModal}
        footer={[
          <Button key="cancel" onClick={closeProductModal}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveProduct}>
            {isEditing ? '保存修改' : '添加产品'}
          </Button>
        ]}
        width={600}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 产品名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品名称 *</label>
              <Input
                placeholder="请输入产品名称"
                value={productForm.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
              />
            </div>
            
            {/* 产品分类 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品分类</label>
              <Input
                placeholder="请输入产品分类"
                value={productForm.category}
                onChange={(e) => handleFormChange('category', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* 产品价格 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品价格 *</label>
              <InputNumber
                placeholder="请输入产品价格"
                value={productForm.price}
                onChange={(value) => handleFormChange('price', value || 0)}
                style={{ width: '100%' }}
                min={0}
                step={0.01}
              />
            </div>
            
            {/* 产品库存 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品库存 *</label>
              <InputNumber
                placeholder="请输入产品库存"
                value={productForm.stock}
                onChange={(value) => handleFormChange('stock', value || 0)}
                style={{ width: '100%' }}
                min={0}
              />
            </div>
          </div>
          
          {/* 产品状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产品状态 *</label>
            <Select
              value={productForm.status}
              onChange={(value) => handleFormChange('status', value as 'active' | 'inactive')}
              style={{ width: '100%' }}
            >
              <Option value="active">在售</Option>
              <Option value="inactive">下架</Option>
            </Select>
          </div>
          
          {/* 图片上传/识别区域 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">产品图片识别（可选）</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <div className="text-gray-500 mb-2">点击或拖拽图片到此处上传，自动识别产品信息</div>
              <Button type="default" icon={<UploadOutlined />}>上传图片</Button>
              <div className="mt-2 text-xs text-gray-500">支持 JPG、PNG 格式，最大 5MB</div>
            </div>
          </div>
        </div>
      </Modal>
      
      {/* 批量识别模态框 */}
      <Modal
        title="批量识别产品"
        open={batchRecognitionVisible}
        onCancel={() => setBatchRecognitionVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setBatchRecognitionVisible(false)}>取消</Button>,
          <Button key="reset" onClick={() => {
            setBatchInputText('');
            setRecognizedProducts([]);
          }}>重置</Button>,
          <Button key="recognize" type="primary" loading={isRecognizing} onClick={handleBatchRecognition}>
            识别
          </Button>,
          <Button key="save" type="primary" disabled={recognizedProducts.length === 0} onClick={handleBatchSave}>
            保存
          </Button>
        ]}
        width={900}
      >
        <div className="space-y-6">
          {/* 示例格式提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <div className="text-blue-500 mt-1">💡</div>
              <div>
                <Text strong className="block mb-2">示例格式</Text>
                <Text className="text-sm text-gray-600 block mb-2">请按照以下格式输入产品信息，每行一条：</Text>
                <pre className="bg-white border border-gray-200 rounded p-3 text-sm overflow-x-auto">
{`产品A - 电子产品 - ¥199.99 - 库存: 100
产品B - 家居用品 - $49.99 - 50
产品C, 服装, 89.99元, 200件`}
                </pre>
              </div>
            </div>
          </div>
          
          {/* 信息输入区 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">批量产品信息</label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input.TextArea
                  placeholder="请输入或粘贴批量产品信息，每行一条"
                  value={batchInputText}
                  onChange={(e) => setBatchInputText(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* 识别结果预览区 */}
          {recognizedProducts.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">识别结果</label>
                <Text type="secondary">共识别出 {recognizedProducts.length} 个产品</Text>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table
                  columns={[
                    {
                      title: '产品名称',
                      dataIndex: 'name',
                      key: 'name',
                      render: (_: unknown, record: typeof recognizedProducts[0], index: number) => (
                        <Input
                          value={record.name}
                          onChange={(e) => {
                            const updated = [...recognizedProducts];
                            updated[index].name = e.target.value;
                            setRecognizedProducts(updated);
                          }}
                        />
                      )
                    },
                    {
                      title: '分类',
                      dataIndex: 'category',
                      key: 'category',
                      render: (_: unknown, record: typeof recognizedProducts[0], index: number) => (
                        <Input
                          value={record.category}
                          onChange={(e) => {
                            const updated = [...recognizedProducts];
                            updated[index].category = e.target.value;
                            setRecognizedProducts(updated);
                          }}
                        />
                      )
                    },
                    {
                      title: '价格',
                      dataIndex: 'price',
                      key: 'price',
                      render: (_: unknown, record: typeof recognizedProducts[0], index: number) => (
                        <InputNumber
                          value={record.price}
                          onChange={(value) => {
                            const updated = [...recognizedProducts];
                            updated[index].price = value || 0;
                            setRecognizedProducts(updated);
                          }}
                          style={{ width: '100%' }}
                          min={0}
                          step={0.01}
                        />
                      )
                    },
                    {
                      title: '库存',
                      dataIndex: 'stock',
                      key: 'stock',
                      render: (_: unknown, record: typeof recognizedProducts[0], index: number) => (
                        <InputNumber
                          value={record.stock}
                          onChange={(value) => {
                            const updated = [...recognizedProducts];
                            updated[index].stock = value || 0;
                            setRecognizedProducts(updated);
                          }}
                          style={{ width: '100%' }}
                          min={0}
                        />
                      )
                    },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      key: 'status',
                      render: (_: unknown, record: typeof recognizedProducts[0], index: number) => (
                        <Select
                          value={record.status}
                          onChange={(value) => {
                            const updated = [...recognizedProducts];
                            updated[index].status = value as 'active' | 'inactive';
                            setRecognizedProducts(updated);
                          }}
                          style={{ width: '100%' }}
                        >
                          <Option value="active">在售</Option>
                          <Option value="inactive">下架</Option>
                        </Select>
                      )
                    },
                    {
                      title: '操作',
                      key: 'action',
                      render: (_: unknown, record: typeof recognizedProducts[0], index: number) => (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() => {
                            const updated = recognizedProducts.filter((_, i) => i !== index);
                            setRecognizedProducts(updated);
                          }}
                        >
                          删除
                        </Button>
                      )
                    }
                  ]}
                  dataSource={recognizedProducts}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProductsModule;