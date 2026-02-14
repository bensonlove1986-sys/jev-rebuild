import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Spin, Alert } from 'antd';
import { BulbOutlined, RestOutlined, SendOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAIAssistantStore } from '../store/aiAssistantStore';
import { useMessagesStore } from '../store/messagesStore';
import { generateAIReplyDraft, improveAIReply, changeReplyTone, updateDraftStatus, getAISessionState, updateAISessionState } from '../services/aiAssistant.service';

const { Title, Text } = Typography;

interface AIAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  conversationId?: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isVisible, onClose, conversationId }) => {
  if (!isVisible) return null;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取AI助理状态
  const {
    replyDraft,
    setReplyDraft,
    sessionState,
    setSessionState,
    isGenerating
  } = useAIAssistantStore();

  // 获取当前对话的消息
  const messages = useMessagesStore(state => 
    conversationId ? state.messages[conversationId] || [] : []
  );

  // 获取发送消息的方法
  const sendMessage = useMessagesStore(state => state.sendMessage);
  // 获取消息输入框引用
  const messageInputRef = useMessagesStore(state => state.messageInputRef);

  // 获取客户ID（假设conversationId就是customerId）
  const customerId = conversationId || '';

  // 当conversationId变化时，获取AI会话状态
  useEffect(() => {
    if (customerId) {
      const fetchSessionState = async () => {
        try {
          const sessionState = await getAISessionState(customerId);
          setSessionState(sessionState);
        } catch (err) {
          console.error('Failed to fetch session state:', err);
        }
      };
      fetchSessionState();
    }
  }, [customerId, setSessionState]);

  // 当存在replyDraft且状态为sent或discarded时，清空replyDraft
  useEffect(() => {
    if (replyDraft && (replyDraft.status === 'sent' || replyDraft.status === 'discarded')) {
      // AI辅助面板回到空态
      setReplyDraft(null);
    }
  }, [replyDraft, setReplyDraft]);

  // 生成回复建议
  const handleGenerateSuggestion = async (toneOverride?: string) => {
    if (!customerId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 获取基于的消息ID，从消息列表中获取最新消息
      let basedOnMessageId = sessionState?.last_seen_message_id || '';
      
      // 如果session中没有last_seen_message_id，从消息列表中获取最新消息
      if (!basedOnMessageId && messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        basedOnMessageId = latestMessage?.id || '';
      }
      
      if (!basedOnMessageId) {
        throw new Error('No message found to generate suggestion for');
      }
      
      // 更新AI会话状态
      await updateAISessionState(customerId, messages);
      
      // 调用AI生成回复草稿，支持tone_override参数
      const draft = await generateAIReplyDraft(customerId, basedOnMessageId, sessionState?.ai_mode || "A", toneOverride);
      
      // 更新前端状态
      setReplyDraft(draft);
    } catch (err) {
      console.error('Failed to generate reply suggestion:', err);
      setError('生成回复建议失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 更自然一点
  const handleHumanize = async () => {
    if (!customerId || !replyDraft) return;
    // 调用generateAIReplyDraft并传递tone_override参数
    await handleGenerateSuggestion('natural');
  };

  // 简短一点
  const handleShorten = async () => {
    if (!customerId || !replyDraft) return;
    // 调用generateAIReplyDraft并传递tone_override参数
    await handleGenerateSuggestion('short');
  };

  // 发送给客户 - 仅UI预留，不实现逻辑
  const handleSendToCustomer = async () => {
    // 任务要求：仅UI预留，不实现逻辑
    console.log('发送给客户功能未实现');
  };

  // 丢弃草稿
  const handleDiscard = async () => {
    if (!replyDraft || !customerId) return;
    
    try {
      // 更新草稿状态为已丢弃
      const updatedDraft = await updateDraftStatus(customerId, replyDraft.draft_id, 'discarded');
      
      // 更新前端状态
      setReplyDraft(updatedDraft);
    } catch (err) {
      console.error('Failed to discard draft:', err);
      setError('丢弃草稿失败，请重试');
    }
  };

  // 渲染AI操作按钮
  const renderActions = () => {
    if (!replyDraft) {
      // 无ReplyDraft时，根据session状态显示不同按钮
      if (sessionState === null) {
        // session为null时，显示生成建议和初始化AI会话按钮
        return (
          <div className="ai-actions mt-4 space-y-2">
            <Button 
              block 
              type="primary"
              onClick={() => handleGenerateSuggestion()}
              disabled={isLoading}
            >
              生成建议
            </Button>
            
            <Button 
              block
              onClick={() => handleGenerateSuggestion()}
              disabled={isLoading}
            >
              初始化 AI 会话
            </Button>
          </div>
        );
      } else {
        // session不为null时，显示生成回复建议按钮
        return (
          <div className="ai-actions mt-4">
            <Button 
              block 
              type="primary"
              onClick={() => handleGenerateSuggestion()}
              disabled={isLoading}
            >
              生成回复建议
            </Button>
          </div>
        );
      }
    }

    switch (replyDraft.status) {
      case 'generated':
        // 状态2：ReplyDraft.status === "generated"，显示所有按钮
        return (
          <div className="ai-actions mt-4 space-y-2">
            <div className="space-y-2">
              <Button 
                block 
                onClick={handleHumanize}
                disabled={isLoading}
              >
                更自然一点
              </Button>
              
              <Button 
                block 
                onClick={handleShorten}
                disabled={isLoading}
              >
                更简短一点
              </Button>
            </div>
            
            <div className="flex gap-2 mt-2">
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendToCustomer}
                disabled={true} // 任务要求：仅UI预留，不实现逻辑，disabled
              >
                发送给客户
              </Button>
              
              <Button 
                danger 
                icon={<DeleteOutlined />}
                onClick={handleDiscard}
                disabled={isLoading}
              >
                丢弃
              </Button>
            </div>
          </div>
        );
      case 'approved':
        // 状态3：ReplyDraft.status === "approved"，只显示发送给客户和丢弃按钮
        return (
          <div className="ai-actions mt-4 flex gap-2">
            <Button 
              type="primary" 
              icon={<SendOutlined />}
              onClick={handleSendToCustomer}
              disabled={true} // 任务要求：仅UI预留，不实现逻辑，disabled
            >
              发送给客户
            </Button>
            
            <Button 
              danger 
              icon={<DeleteOutlined />}
              onClick={handleDiscard}
              disabled={isLoading}
            >
              丢弃
            </Button>
          </div>
        );
      case 'sent':
      case 'discarded':
        // 状态4：ReplyDraft.status === "sent"或"discarded"，显示重新生成按钮
        return (
          <div className="ai-actions mt-4">
            <Button 
              block 
              type="primary"
              onClick={() => handleGenerateSuggestion()}
              disabled={isLoading}
            >
              生成回复建议
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white h-full overflow-y-auto">
      
      {error && (
        <Alert 
          message="错误"
          description={error}
          type="error"
          showIcon
          className="mb-4"
          closable
          onClose={() => setError(null)}
        />
      )}
      
      {(isLoading || isGenerating) ? (
        <div className="flex items-center justify-center p-8">
          <Spin size="large" />
          <Text className="ml-2">生成回复建议中...</Text>
        </div>
      ) : replyDraft ? (
        (replyDraft.status === 'sent' || replyDraft.status === 'discarded') ? (
          // 状态4：ReplyDraft.status === "sent"或"discarded"，显示空态文案
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Text className="text-gray-600">
              暂无 AI 回复建议
            </Text>
          </div>
        ) : (
          // 状态2和3：显示回复草稿内容和对应按钮
          <div className="space-y-4">
            {/* 回复草稿内容 */}
            <Card size="small" title="AI 回复建议">
              <div className="mb-2">
                <Text strong>目标语言回复:</Text>
                <div className="mt-1 p-2 bg-gray-50 rounded">
                  {replyDraft.reply_text_target_lang}
                </div>
              </div>
              
              <div className="mb-2">
                <Text strong>中文意图:</Text>
                <div className="mt-1 p-2 bg-gray-50 rounded">
                  {replyDraft.reply_text_cn}
                </div>
              </div>
            </Card>
            
            {/* 操作按钮 */}
            {renderActions()}
          </div>
        )
      ) : (
        // 状态1：无ReplyDraft，显示生成回复建议按钮
        <div className="flex flex-col items-center justify-center p-8 text-center">
          {sessionState === null ? (
            // session为null时的空态
            <div className="space-y-4">
              <BulbOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '8px' }} />
              <Title level={4} className="mb-2">AI 辅助</Title>
              <Text className="text-gray-600 mb-4">
                点击按钮开始生成建议，系统将自动初始化会话
              </Text>
            </div>
          ) : (
            // session不为null时的空态
            <div className="space-y-4">
              <BulbOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <Text className="text-gray-600">
                点击生成回复建议，AI 将基于上下文给出建议
              </Text>
            </div>
          )}
          {renderActions()}
        </div>
      )}
    </div>
  );
};

export default AIAssistant;