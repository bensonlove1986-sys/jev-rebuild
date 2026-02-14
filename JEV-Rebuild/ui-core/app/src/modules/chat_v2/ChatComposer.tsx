import React, { useCallback, useState } from 'react';
import { useCustomersStore } from '../../store/customersStore';
import { useMessagesStore } from '../../store/messagesStore';
import { safeFetch } from '../../main';
import { buildApiUrl } from '../../utils/apiClient';

interface ChatComposerProps {
  inputText: string;
  setInputText: (text: string) => void;
}

const ChatComposer: React.FC<ChatComposerProps> = ({ inputText, setInputText }) => {
  const { selectedCustomerId = null } = useCustomersStore();
  const { sendMessage, sendWhatsAppImageWithAttachment } = useMessagesStore();
  
  // 图片预览状态
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pastedImageBlob, setPastedImageBlob] = useState<Blob | null>(null);

  // 处理粘贴事件
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    
    // 检查剪贴板是否包含图片
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          // 保存图片Blob，用于后续上传
          setPastedImageBlob(file);
          
          // 读取图片数据，用于预览
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setPastedImage(event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  // 处理图片上传，获取file_id
  const uploadImage = useCallback(async (blob: Blob): Promise<string | null> => {
    try {
      setIsUploading(true);
      
      // 记录 WhatsApp 附件上传开始日志
      console.log('[WHATSAPP_ATTACHMENT_UPLOAD_START]', { timestamp: Date.now() });
      
      // 创建 FormData
      const formData = new FormData();
      formData.append('file', blob, `image-${Date.now()}.${blob.type.split('/')[1]}`);
      
      // 发送上传请求到 Daojie 附件上传 API
      console.log('[IMAGE_UPLOAD_URL]', '/api/daojie/attachments/upload');
      const response = await safeFetch('/api/daojie/attachments/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      console.log('[IMAGE_UPLOAD_RESPONSE_STATUS]', response.status);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      console.log('[IMAGE_UPLOAD_RESPONSE_DATA]', data);
      
      if (data.ok && data.file_id) {
        // 返回 file_id 而不是 image_url
        console.log('[IMAGE_UPLOAD_SUCCESS_FILE_ID]', data.file_id);
        // 记录 WhatsApp 附件上传成功日志
        console.log('[WHATSAPP_ATTACHMENT_UPLOAD_OK]', { file_id: data.file_id, timestamp: Date.now() });
        return data.file_id;
      } else {
        throw new Error('Invalid response: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('[IMAGE_UPLOAD_FAILED]', error);
      alert('图片上传失败，请重试: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 处理发送消息
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!selectedCustomerId || !sendMessage || !sendWhatsAppImageWithAttachment) return;
    
    // 【第一刀】在生成local_xxx消息ID之前进行严格校验
    // 验证文本和图片都为空的情况
    const hasText = typeof text === 'string' && text.trim() !== '';
    const hasImage = pastedImage && pastedImageBlob;
    
    if (!hasText && !hasImage) {
      console.error('[OUTBOUND_HARD_BLOCK_EMPTY_PAYLOAD]', { selectedCustomerId, text, hasImage });
      return; // 🚫 直接返回，不生成任何消息ID，不执行任何后续操作
    }
    
    // 只有在校验通过后，才生成唯一的message_id
    const messageId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 如果有粘贴的图片，使用WhatsApp图片专用发送函数
    if (pastedImage && pastedImageBlob) {
      // 确保text是非空的
      const finalText = text.trim() || " ";
      
      try {
        // 第一步：上传图片，获取image_url
        setIsUploading(true);
        const image_url = await sendWhatsAppImageWithAttachment(pastedImageBlob);
        
        // 第二步：只有在image_url存在时，才发送消息
        if (image_url && image_url.trim() !== '') {
          // 调用sendMessage函数发送消息，传递image_url（使用正确的参数顺序）
          sendMessage(selectedCustomerId, finalText, messageId, undefined, undefined, image_url);
          // 清空图片预览和Blob
          setPastedImage(null);
          setPastedImageBlob(null);
          // 清空输入框
          setInputText('');
        } else {
          console.error('[IMAGE_UPLOAD_FAILED_NO_URL]', { selectedCustomerId, messageId });
        }
      } catch (error) {
        console.error('[WHATSAPP_IMAGE_SEND_ERROR]', error);
      } finally {
        setIsUploading(false);
      }
    } else if (text) {
      // 调用现有sendMessage函数发送文本消息
      sendMessage(selectedCustomerId, text, messageId);
      // 清空输入框
      setInputText('');
    }
  };

  return (
    <div className="chat-input-bar">
      {/* 图片预览 */}
      {pastedImage && (
        <div className="chat-input-image-preview">
          <img src={pastedImage} alt="Preview" />
          <button onClick={() => {
            setPastedImage(null);
            setPastedImageBlob(null);
          }}>×</button>
        </div>
      )}
      
      <textarea
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
        onPaste={handlePaste}
        placeholder="输入消息…"
        rows={2}
      />
      <button onClick={handleSendMessage} disabled={isUploading}>
        {isUploading ? '发送中...' : '发送'}
      </button>
    </div>
  );
};

export default ChatComposer;