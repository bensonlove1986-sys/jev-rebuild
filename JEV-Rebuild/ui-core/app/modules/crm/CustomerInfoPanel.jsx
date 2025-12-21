import React, { useState, useEffect } from 'react';
import { Card, Space, Avatar, Tag, Descriptions, Input, Button, Switch, Typography, Select } from 'antd';
import { fetchJsonSafe } from '../../utils/fetchSafe.js';
import styles from './CustomerInfoPanel.module.css';
// 删除resolveDisplayName和resolveAvatarLetter导入，禁止UI层推断displayName

const { Text } = Typography;

const CustomerInfoPanel = ({ 
  customer, 
  aiDraftText, 
  messages = [],
  aiReplyMode,
  setAiReplyMode,
  onAdoptAiDraft,
  onRegenerateAiDraft,
  onIgnoreAiDraft
}) => {
  // 语意分析开关状态
  const [semanticEnabled, setSemanticEnabled] = useState(false);
  // 语意分析结果
  const [semanticSummary, setSemanticSummary] = useState('');
  
  // 商业阶段映射（英文 -> 中文显示）
  const businessStageMap = {
    'new': { label: '新询盘', color: 'red' },
    'following': { label: '跟进中', color: 'orange' },
    'quoting': { label: '报价中', color: 'blue' },
    'ordered': { label: '已下单', color: 'green' },
    'lost': { label: '流失', color: 'gray' }
  };
  
  // 从localStorage获取临时客户状态
  const getTempCustomerStatus = () => {
    try {
      if (!customer) return false;
      const tempCustomers = JSON.parse(localStorage.getItem('tempCustomers') || '{}');
      return tempCustomers[customer.id] || false;
    } catch (error) {
      console.error('Failed to get temp customer status:', error);
      return false;
    }
  };
  
  // 语意分析函数
  const analyzeSemantic = async () => {
    try {
      // 检查customer是否存在
      if (!customer) {
        console.warn('[SEMANTIC] No customer to analyze');
        return;
      }
      
      // 过滤出最近3条客户消息
      const customerMessages = messages
        .filter(msg => msg.type === 'customer' || msg.role === 'customer')
        .slice(-3)
        .map(msg => msg.text || msg.content)
        .join('\n');
      
      if (!customerMessages) {
        console.warn('[SEMANTIC] No customer messages to analyze');
        return;
      }
      
      console.log('[SEMANTIC] Analyzing messages:', customerMessages);
      
      // 调用现有AI能力（与AI回复共用逻辑）
      const result = await fetchJsonSafe(`/api/ai/draft-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: customerMessages,
          contactId: customer.id,
          mode: 'analysis' // 添加分析模式参数
        })
      });
      
      if (result.ok && result.data?.text) {
        setSemanticSummary(result.data.text);
      }
    } catch (e) {
      console.warn('[SEMANTIC] Analysis error:', e);
    }
  };
  
  // 监听语意分析开关状态变化
  useEffect(() => {
    if (!semanticEnabled) {
      setSemanticSummary('');
      return;
    }
    
    analyzeSemantic();
  }, [semanticEnabled, messages, customer?.id]);

  const getStatusTag = (status) => {
    switch (status) {
      case 'active':
        return <Tag color="green">活跃</Tag>;
      case 'pending':
        return <Tag color="orange">跟进中</Tag>;
      case 'inactive':
        return <Tag color="gray">休眠</Tag>;
      default:
        return <Tag color="gray">未知</Tag>;
    }
  };
  
  // 获取商业阶段标签
  const getBusinessStageTag = (stage) => {
    const stageInfo = businessStageMap[stage] || businessStageMap['new'];
    return <Tag color={stageInfo.color}>{stageInfo.label}</Tag>;
  };
  return (
    <div className={styles.customerInfoPanel}>
      {!customer ? (
        <Card className={styles.customerInfoPanel}>
          <div className={styles.emptyState}>
            <h3>请选择一个客户</h3>
            <p>从左侧客户列表中选择一个客户查看详细信息</p>
          </div>
        </Card>
      ) : (
        <>
          {/* 客户头像和基本信息 */}
          <Card className={styles.customerHeaderCard}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space align="center">
                  <Avatar size={64} className={styles.avatar}>
                    {/* 简化头像生成，只使用首字母，严格按优先级 */}
                    {(customer?.display_name || customer?.customer_name || customer?.id || 'C').charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <h2 className={styles.customerName}>
                      {/* 严格按优先级：display_name > customer_name > id */}
                      {customer?.display_name || customer?.customer_name || customer?.id || ''}
                    </h2>
                    <Space size="small">
                      {getStatusTag(customer.status)}
                      {getBusinessStageTag(customer.business_stage || 'new')}
                      {customer?.source === 'daojie' && <Tag color="blue">Daojie</Tag>}
                      {getTempCustomerStatus() && <Tag color="orange">临时客户（未补全联系方式）</Tag>}
                    </Space>
                  </div>
                </Space>
              </Space>
            </Space>
          </Card>

          {/* 基本信息（只保留真实字段） */}
          <Card className={styles.basicInfoCard}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="公司名">
                {/* 只使用来自Worker的company_name，不做推断 */}
                {customer?.company_name || ''}
              </Descriptions.Item>
              {customer.country && <Descriptions.Item label="国家">{customer.country}</Descriptions.Item>}
              {customer.industry && <Descriptions.Item label="行业">{customer.industry}</Descriptions.Item>}
            </Descriptions>
          </Card>

          {/* AI 回复建议 */}
          <Card className={styles.aiPreviewCard} title="🤖 AI 回复建议">
            {/* 1️⃣ 模式切换 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>AI 回复模式</span>
                <Select
                  value={aiReplyMode}
                  onChange={setAiReplyMode}
                  size="small"
                  style={{ width: 150 }}
                >
                  <Select.Option value="off">OFF（不生成）</Select.Option>
                  <Select.Option value="semi-auto">半自动（默认）</Select.Option>
                  <Select.Option value="auto" disabled>自动（预留）</Select.Option>
                </Select>
              </div>
            </div>
            
            {/* 2️⃣ AI 回复预览框 - 只要aiDraftText!==null就显示 */}
            <div style={{ marginBottom: '16px' }}>
              {aiDraftText === "" ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px', 
                  color: '#999',
                  fontSize: '14px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  AI 草稿生成中…
                </div>
              ) : (
                <Input.TextArea
                  value={aiDraftText}
                  rows={6}
                  style={{ resize: 'vertical' }}
                  placeholder="AI 生成的回复草稿"
                  readOnly
                />
              )}
            </div>
            
            {/* 3️⃣ 操作按钮区 */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <Button 
                type="primary" 
                size="small"
                onClick={() => onAdoptAiDraft && onAdoptAiDraft(aiDraftText)}
                disabled={aiDraftText === "" || aiDraftText.trim().length === 0}
              >
                采用并填入输入框
              </Button>
              <Button 
                size="small"
                onClick={() => onRegenerateAiDraft && onRegenerateAiDraft()}
                disabled={aiReplyMode === 'off'}
              >
                重新生成
              </Button>
              <Button 
                size="small"
                onClick={() => onIgnoreAiDraft && onIgnoreAiDraft()}
                disabled={aiDraftText === ""}
              >
                忽略
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default CustomerInfoPanel;