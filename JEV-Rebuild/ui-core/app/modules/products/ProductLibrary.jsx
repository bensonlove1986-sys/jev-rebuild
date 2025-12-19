import React, { useState } from 'react';
import { Card, List, Input, Tag, Button, Space, Typography, Modal, message } from 'antd';
import styles from './ProductLibrary.module.css';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const ProductLibrary = ({ onProductSelect }) => {
  const [products, setProducts] = useState([
    {
      id: 1,
      name: 'Smart LED Bulb',
      category: 'Lighting',
      sku: 'SLB-2024-001',
      price: 12.50,
      currency: 'USD',
      stock: 1500,
      specs: {
        wattage: '10W',
        color: 'Warm White',
        lifespan: '25,000 hours',
        dimmable: 'Yes'
      }
    },
    {
      id: 2,
      name: 'Wireless Earbuds',
      category: 'Electronics',
      sku: 'WEB-2024-002',
      price: 49.99,
      currency: 'USD',
      stock: 800,
      specs: {
        battery: '24h total',
        bluetooth: '5.2',
        waterResistance: 'IPX7',
        noiseCancellation: 'Active'
      }
    },
    {
      id: 3,
      name: 'Stainless Steel Water Bottle',
      category: 'Household',
      sku: 'SSW-2024-003',
      price: 19.99,
      currency: 'USD',
      stock: 2000,
      specs: {
        capacity: '500ml',
        material: '304 Stainless Steel',
        insulation: '24h cold / 12h hot',
        color: 'Multiple colors'
      }
    },
    {
      id: 4,
      name: 'Bluetooth Speaker',
      category: 'Audio',
      sku: 'BTS-2024-004',
      price: 79.99,
      currency: 'USD',
      stock: 650,
      specs: {
        battery: '30h playback',
        power: '20W',
        waterResistance: 'IPX6',
        connectivity: 'Bluetooth 5.3 + AUX'
      }
    }
  ]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const showProductDetail = (product) => {
    setSelectedProduct(product);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedProduct(null);
  };

  const handleProductSelect = (product) => {
    setSelectedProducts(prev => {
      // 切换选择状态
      if (prev.some(p => p.id === product.id)) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
    message.success(`${product.name} ${selectedProducts.some(p => p.id === product.id) ? '已取消选择' : '已选择'}`);
    
    // 调用父组件回调
    if (onProductSelect) {
      onProductSelect(selectedProducts.some(p => p.id === product.id) ? 
        selectedProducts.filter(p => p.id !== product.id) : 
        [...selectedProducts, product]);
    }
  };

  return (
    <Card className={styles.productLibrary} styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}>
      <div className={styles.header}>
        <Title level={5} style={{ margin: 0 }}>
          产品库
        </Title>
        <Space>
          <Search
            placeholder="搜索产品"
            size="small"
            className={styles.search}
            style={{ width: 200 }}
          />
          <Button type="primary" size="small">
            添加产品
          </Button>
        </Space>
      </div>
      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={products}
        renderItem={(product) => (
          <List.Item>
            <Card 
              hoverable 
              className={styles.productCard}
              onClick={() => showProductDetail(product)}
            >
              <div className={styles.productHeader}>
                <div className={styles.productInfo}>
                  <Title level={5} style={{ margin: 0 }}>
                    {product.name}
                  </Title>
                  <Text type="secondary" className={styles.sku}>
                    SKU: {product.sku}
                  </Text>
                </div>
                <div className={styles.productPrice}>
                  <strong>{product.currency} {product.price.toFixed(2)}</strong>
                  <Tag color={product.stock > 500 ? 'green' : 'orange'}>
                    {product.stock} 库存
                  </Tag>
                </div>
              </div>
              <div className={styles.productSpecs}>
                <Space size="middle">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className={styles.specItem}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </Text>
                      <br />
                      <Text strong>{value}</Text>
                    </div>
                  ))}
                </Space>
              </div>
              <div className={styles.productFooter}>
                <Tag color="blue">{product.category}</Tag>
                <Space size="small" className={styles.productActions}>
                  <Button size="small">编辑</Button>
                  <Button 
                    size="small" 
                    type={selectedProducts.some(p => p.id === product.id) ? 'primary' : 'default'}
                    onClick={() => {
                      handleProductSelect(product);
                    }}
                  >
                    {selectedProducts.some(p => p.id === product.id) ? '已选择' : '选择产品'}
                  </Button>
                  <Button size="small" type="primary">添加到报价</Button>
                </Space>
              </div>
            </Card>
          </List.Item>
        )}
        className={styles.productList}
      />

      <Modal
        title={selectedProduct?.name}
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={600}
      >
        {selectedProduct && (
          <div className={styles.productModal}>
            <div className={styles.modalHeader}>
              <Text strong className={styles.modalSku}>SKU: {selectedProduct.sku}</Text>
              <Tag color="blue">{selectedProduct.category}</Tag>
            </div>
            <div className={styles.modalPrice}>
              <strong>{selectedProduct.currency} {selectedProduct.price.toFixed(2)}</strong>
              <Tag color={selectedProduct.stock > 500 ? 'green' : 'orange'}>
                {selectedProduct.stock} 库存
              </Tag>
            </div>
            <Title level={5} style={{ marginTop: '20px', marginBottom: '10px' }}>
              产品规格
            </Title>
            <div className={styles.modalSpecs}>
              {Object.entries(selectedProduct.specs).map(([key, value]) => (
                <div key={key} className={styles.modalSpecItem}>
                  <div className={styles.specKey}>
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                  </div>
                  <div className={styles.specValue}>{value}</div>
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <Button size="small">编辑产品</Button>
              <Button 
                size="small" 
                type={selectedProducts.some(p => p.id === selectedProduct.id) ? 'primary' : 'default'}
                style={{ marginLeft: '10px' }}
                onClick={() => {
                  handleProductSelect(selectedProduct);
                  setIsModalVisible(false);
                }}
              >
                {selectedProducts.some(p => p.id === selectedProduct.id) ? '取消选择' : '选择产品'}
              </Button>
              <Button size="small" type="primary" style={{ marginLeft: '10px' }}>
                添加到报价单
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default ProductLibrary;
