import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Tooltip, message } from 'antd';
import { SmileOutlined, PaperClipOutlined, SendOutlined, CameraOutlined } from '@ant-design/icons';
import { safeFetch } from '../../../../main';
import './MessageInput.css';

const { TextArea } = Input;

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onSendImage?: (mediaPath: string, mime: string) => void;
}

interface UploadResult {
  media_path: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onSendImage }) => {
  // 本地状态
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [textAreaHeight, setTextAreaHeight] = useState(40);
  
  // 引用
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await safeFetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data: UploadResult = await response.json();
        console.log('图片上传成功:', data);
        
        if (onSendImage) {
          onSendImage(data.media_path, file.type);
        }
      } else {
        const errorData = await response.json();
        console.error('图片上传失败:', errorData);
        message.error(`上传失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('上传图片时发生错误:', error);
      message.error('上传失败: 网络错误');
    }
  };
  
  // 处理附件按钮点击
  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // 检查文件类型
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else {
        message.error('只支持图片文件');
      }
      
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // 自动调整文本域高度
    if (textAreaRef.current) {
      // 重置高度以获取正确的scrollHeight
      textAreaRef.current.style.height = 'auto';
      // 设置新高度，最大为120px
      const newHeight = Math.min(textAreaRef.current.scrollHeight, 120);
      setTextAreaHeight(newHeight);
    }
  };
  
  // 处理发送消息
  const handleSendMessage = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      setTextAreaHeight(40);
    }
  };
  
  // 处理键盘发送（Enter键）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // 处理表情选择
  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
  };
  
  // 点击外部关闭表情选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="message-input-container">
      {/* 输入框区域 */}
      <div className="message-input-wrapper">
        {/* 左侧工具按钮 */}
        <Space className="message-input-tools-left">
          <Tooltip title="表情">
            <Button
              type="text"
              icon={<SmileOutlined />}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="message-input-tool-btn"
            />
          </Tooltip>
          
          <Tooltip title="附件">
            <Button
              type="text"
              icon={<PaperClipOutlined />}
              onClick={handleAttachClick}
              className="message-input-tool-btn"
            />
          </Tooltip>
          
          <Tooltip title="拍照">
            <Button
              type="text"
              icon={<CameraOutlined />}
              className="message-input-tool-btn"
            />
          </Tooltip>
          
          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </Space>
        
        {/* 文本输入区域 */}
        <div className="message-text-input-wrapper">
          <TextArea
            ref={textAreaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            autoSize={false}
            style={{ 
              height: textAreaHeight, 
              resize: 'none',
              borderRadius: 20,
              padding: '8px 12px',
              fontSize: 14
            }}
            className="message-text-input"
          />
          
          {/* 表情选择器 */}
          {showEmojiPicker && (
            <div className="emoji-picker" ref={emojiPickerRef}>
              {/* 简化的表情选择器，实际项目中可替换为成熟的表情库 */}
              <div className="emoji-picker-grid">
                {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩'].map((emoji) => (
                  <button
                    key={emoji}
                    className="emoji-picker-item"
                    onClick={() => handleEmojiSelect(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 右侧发送按钮 */}
        <Space className="message-input-tools-right">
          <Tooltip title="发送">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              shape="circle"
              size="small"
              className="message-send-btn"
              disabled={!inputValue.trim()}
            />
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};

export default MessageInput;
