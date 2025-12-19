import React from 'react';
import { Space, Button, Divider, Switch, Input } from 'antd';
import styles from './BusinessTools.module.css';

const BusinessTools = ({ 
  autoTranslate, 
  setAutoTranslate, 
  piGeneration, 
  setPiGeneration, 
  productLibrary, 
  setProductLibrary, 
  productSearch, 
  setProductSearch,
  onDaojieMessage
}) => {
  return (
    <div className={styles.businessTools}>
      <Divider orientation="left" orientationMargin={0} style={{ margin: '8px 0' }}>
        智能助手
      </Divider>
      <Space wrap size="middle">
        <Space size="small">
          <Button 
            size="small" 
            onClick={() => {
              // 模拟 Daojie WhatsApp 消息
              onDaojieMessage({
                text: 'Hello, I want to buy some products.',
                source: {
                  channel: 'whatsapp',
                  account: '+91****1234',
                  external_id: 'wa_123456789'
                }
              });
            }}
          >
            模拟 WhatsApp 消息
          </Button>
          <Button 
            size="small" 
            onClick={() => {
              // 模拟 Daojie Facebook 消息
              onDaojieMessage({
                text: 'I am interested in your latest products.',
                source: {
                  channel: 'facebook',
                  account: 'facebook_user_123',
                  external_id: 'fb_987654321'
                }
              });
            }}
          >
            模拟 Facebook 消息
          </Button>
          <Button 
            size="small" 
            onClick={() => {
              // 模拟 Daojie Web 消息
              onDaojieMessage({
                text: 'Can you provide more product details?',
                source: {
                  channel: 'web',
                  external_id: 'web_abc123'
                }
              });
            }}
          >
            模拟 Web 消息
          </Button>
          <Button 
            size="small" 
            onClick={() => {
              // 模拟 Daojie Email 消息
              onDaojieMessage({
                text: 'Please send me your product catalog.',
                source: {
                  channel: 'email',
                  account: 'customer@example.com',
                  external_id: 'email_def456'
                }
              });
            }}
          >
            模拟 Email 消息
          </Button>
          <Button 
            size="small" 
            onClick={() => {
              // 模拟 Daojie 原始入站信息
              onDaojieMessage({
                text: 'Hello, I want to buy some products.',
                source: {
                  platform: "daojie",
                  channel: "whatsapp"
                },
                type: "inbound-message",
                customer_id: "123456",
                customer_name: "John Doe",
                phone: "+1234567890",
                email: "john@example.com",
                company: "ABC Trading Co.",
                platform_conversation_id: "conv_12345",
                timestamp: "2025-01-14T10:30:00Z"
              });
            }}
          >
            模拟原始入站信息
          </Button>
        </Space>
        <div className={styles.switchItem}>
          <span>自动翻译</span>
          <Switch 
            checked={autoTranslate} 
            onChange={setAutoTranslate} 
          />
        </div>
        <div className={styles.switchItem}>
          <span>PI生成</span>
          <Switch 
            checked={piGeneration} 
            onChange={setPiGeneration} 
          />
        </div>
        <div className={styles.switchItem}>
          <span>产品库</span>
          <Switch 
            checked={productLibrary} 
            onChange={setProductLibrary} 
          />
        </div>
        <Input
          placeholder="搜索产品..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          size="small"
          style={{ width: 200 }}
        />
      </Space>
    </div>
  );
};

export default BusinessTools;