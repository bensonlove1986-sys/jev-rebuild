import React, { useState } from 'react';
import { Card, Input, Button, Space, Typography, Tabs, Select } from 'antd';
import styles from './BrowserPanel.module.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const BrowserPanel = () => {
  const [activeTabKey, setActiveTabKey] = useState('1');
  const [currentUrl, setCurrentUrl] = useState('https://www.example.com');
  const [historyUrls, setHistoryUrls] = useState([
    { id: 1, title: 'ABC Trading Co. Website', url: 'https://www.abctrading.com' },
    { id: 2, title: 'Product Catalog PDF', url: 'https://www.example.com/catalog.pdf' },
    { id: 3, title: 'Order History 2023', url: 'https://www.example.com/orders/2023' }
  ]);

  const handleUrlChange = (e) => {
    setCurrentUrl(e.target.value);
  };

  const handleNavigate = () => {
    // In a real implementation, this would update the iframe src
    console.log('Navigating to:', currentUrl);
  };

  const handleTabChange = (key) => {
    setActiveTabKey(key);
  };

  const tabItems = [
    {
      key: '1',
      label: '外部浏览',
      children: (
        <div className={styles.browserContent}>
          <div className={styles.browserControls}>
            <Space.Compact className={styles.addressBar}>
              <Button type="text" icon={<span>←</span>} size="small" disabled />
              <Button type="text" icon={<span>→</span>} size="small" disabled />
              <Button type="text" icon={<span>⟳</span>} size="small" disabled />
              <Input
                placeholder="输入网址..."
                value={currentUrl}
                onChange={handleUrlChange}
                onPressEnter={handleNavigate}
                size="small"
                className={styles.urlInput}
              />
              <Button type="primary" size="small" onClick={handleNavigate}>
                前往
              </Button>
            </Space.Compact>
          </div>
          <div className={styles.browserFrame}>
            <div className={styles.iframePlaceholder}>
              <Text type="secondary">浏览器视图</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                当前网址: {currentUrl}
              </Text>
            </div>
          </div>
        </div>
      )
    },
    {
      key: '2',
      label: '历史记录',
      children: (
        <div className={styles.historyContent}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {historyUrls.map((item) => (
              <Card 
                key={item.id} 
                size="small" 
                className={styles.historyItem}
                onClick={() => setCurrentUrl(item.url)}
              >
                <div className={styles.historyHeader}>
                  <Text strong>{item.title}</Text>
                  <Button type="text" size="small" className={styles.openButton}>
                    在浏览器中打开
                  </Button>
                </div>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  {item.url}
                </Text>
              </Card>
            ))}
          </Space>
        </div>
      )
    },
    {
      key: '3',
      label: '快捷访问',
      children: (
        <div className={styles.shortcutsContent}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className={styles.shortcutSection}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>客户资源</Text>
              <Select 
                style={{ width: '100%', marginBottom: '8px' }}
                placeholder="选择客户网站"
                size="small"
              >
                <Option value="https://www.abctrading.com">ABC Trading Co. Website</Option>
                <Option value="https://www.xyzelectronics.com">XYZ Electronics Inc. Website</Option>
                <Option value="https://www.globalimport.com">Global Import Group Website</Option>
              </Select>
            </div>
            <div className={styles.shortcutSection}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>文档中心</Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block type="default" size="small">产品手册</Button>
                <Button block type="default" size="small">报价模板</Button>
                <Button block type="default" size="small">订单流程</Button>
              </Space>
            </div>
          </Space>
        </div>
      )
    }
  ];

  return (
    <Card className={styles.browserPanel} bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={styles.header}>
        <Title level={5} style={{ margin: 0 }}>
          浏览器
        </Title>
      </div>
      <Tabs 
        activeKey={activeTabKey}
        onChange={handleTabChange}
        items={tabItems}
        className={styles.browserTabs}
      />
    </Card>
  );
};

export default BrowserPanel;
