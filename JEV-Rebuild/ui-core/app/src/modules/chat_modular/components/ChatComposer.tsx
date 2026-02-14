import React, { useState, useRef, useEffect, useContext } from 'react';
import './ChatComposer.css';
import TranslationPlugin from './TranslationPlugin/TranslationPlugin';
import { safeFetch } from '@/main';
import { DeepSeekContext } from '../../../App';

// 导入 URL 构建模块
import { buildApiUrl, buildMediaUploadUrl, getApiBase } from '@/core/network/urlBuilder';

// 导入运行时配置
import { JEV_RUNTIME } from "@/core/jev_runtime_config";

// 图片草稿类型
interface ImageDraft {
  id: string;
  media_path: string;
  preview_url: string;
  name: string;
  size: number;
  type: string;
}

// PDF草稿类型
interface PdfDraft {
  id: string;
  media_path: string;
  preview_url: string;
  name: string;
  size: number;
  type: string;
}

// 草稿消息类型
interface DraftMessage {
  type: 'text' | 'image' | 'pdf';
  text?: string;
  images?: ImageDraft[]; // 支持多张图片
  pdfs?: PdfDraft[]; // 支持多个PDF
  status: 'draft';
}

// 翻译助手草稿类型
interface AssistantDraft {
  type: 'assistant_tool';
  originalText?: string;
  translatedText?: string;
  targetLanguage?: string;
  status: 'draft';
}

interface ChatComposerProps {
  onSendMessage: (text: string, originalText?: string) => void;
  onSendImage: (_, mediaPath: string) => void;
  disabled?: boolean;
  chatId?: string;
  textToInsert?: string | null;
  onTextInserted?: () => void;
}

const ChatComposer: React.FC<ChatComposerProps> = ({ onSendMessage, onSendImage, disabled = false, chatId, textToInsert, onTextInserted }) => {
  const { deepSeekOpen, setDeepSeekOpen } = useContext(DeepSeekContext);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAnalysisManager, setShowAnalysisManager] = useState(false);
  const [showAnalysisDetail, setShowAnalysisDetail] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [analyses, setAnalyses] = useState<Array<any>>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredAnalyses, setFilteredAnalyses] = useState<Array<any>>([]);
  const [draftMessage, setDraftMessage] = useState<DraftMessage | null>(null);
  const [assistantDraft, setAssistantDraft] = useState<AssistantDraft | null>(null);
  
  // 生成唯一ID
  const generateId = () => {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  // 常用表情列表
  const commonEmojis = [
    '😊', '😂', '❤️', '👍', '🎉', '🤔', '😎', '😢',
    '😍', '🤣', '🔥', '👌', '🎁', '🤷', '🤩', '😭'
  ];
  
  // 自动调整文本框高度
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };
  
  // 初始化和文本变化时调整高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText]);
  
  // 点击外部关闭表情选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 当显示分析结果管理界面时，加载分析结果
  useEffect(() => {
    if (showAnalysisManager) {
      loadAnalysesFromStorage();
    }
  }, [showAnalysisManager]);
  
  // 处理外部文本插入
  useEffect(() => {
    if (textToInsert && !disabled) {
      console.log('[CHAT_COMPOSER_INSERT] Inserting text from AI:', textToInsert.substring(0, 50) + (textToInsert.length > 50 ? '...' : ''));
      setInputText(textToInsert);
      // 聚焦到输入框
      setTimeout(() => {
        textareaRef.current?.focus();
        // 通知父组件文本已插入
        if (onTextInserted) {
          onTextInserted();
        }
      }, 100);
    }
  }, [textToInsert, disabled, onTextInserted]);
  
  // 处理文本输入
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };
  
  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter发送，Shift+Enter换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // 处理发送消息
  const handleSend = async () => {
    if (disabled) return;
    
    // 优先处理草稿消息
    if (draftMessage) {
      console.log('[DRAFT_SEND] Processing draft message:', draftMessage.type);
      
      try {
        if (draftMessage.type === 'image' && draftMessage.images) {
          // 发送多张图片消息
          if (onSendImage) {
            for (const image of draftMessage.images) {
              await onSendImage(image.preview_url, image.media_path);
            }
          }
        } else if (draftMessage.type === 'pdf' && draftMessage.pdfs) {
          // 发送多个PDF消息
          if (onSendImage) {
            for (const pdf of draftMessage.pdfs) {
              await onSendImage(pdf.preview_url, pdf.media_path);
            }
          }
        } else if (draftMessage.type === 'text' && draftMessage.text) {
          // 发送文本消息
          if (onSendMessage) {
            await onSendMessage(draftMessage.text);
          }
        }
        
        // 只有发送成功后才清空草稿消息
        setDraftMessage(null);
      } catch (error) {
        console.error('[DRAFT_SEND_ERROR] Failed to send draft message:', error);
        // 发送失败，保留草稿消息
      }
    } else {
      // 处理普通文本消息或翻译助手消息
      const trimmedText = inputText.trim();
      if (trimmedText) {
        try {
          // 检查是否有翻译助手草稿
          if (assistantDraft && assistantDraft.originalText && assistantDraft.translatedText) {
            console.log('[ASSISTANT_SEND_WITH_ORIGINAL] Sending message with original text:', {
              originalText: assistantDraft.originalText,
              translatedText: assistantDraft.translatedText
            });
            // 传递原文和翻译内容，实现双重内容显示
            await onSendMessage(trimmedText, assistantDraft.originalText);
          } else {
            // 普通消息，只传递文本
            await onSendMessage(trimmedText);
          }
          setInputText('');
          // 发送成功后清空翻译助手草稿
          setAssistantDraft(null);
        } catch (error) {
          console.error('[TEXT_SEND_ERROR] Failed to send text message:', error);
          // 发送失败，保留文本内容
        }
      }
    }
  };
  
  // 处理表情选择
  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };
  
  // 处理翻译结果
  const handleTranslate = (translatedText: string, originalText?: string, targetLanguage?: string) => {
    console.log('[ASSISTANT_TRANSLATION_DRAFT] Translation result:', {
      translatedText,
      originalText,
      targetLanguage
    });
    
    // 创建翻译助手草稿
    const newAssistantDraft: AssistantDraft = {
      type: 'assistant_tool',
      originalText,
      translatedText,
      targetLanguage,
      status: 'draft'
    };
    
    setAssistantDraft(newAssistantDraft);
    // 同时更新输入框，方便用户编辑
    setInputText(translatedText);
  };
  
  // 处理直接发送
  const handleDirectSend = (translatedText: string, originalText?: string) => {
    console.log('[OUTBOUND_FROM_ASSISTANT] Direct send from assistant:', { translatedText, originalText });
    if (translatedText.trim() && !disabled) {
      // 优先使用传递的 originalText，否则使用 assistantDraft 中的
      const finalOriginalText = originalText || (assistantDraft && assistantDraft.originalText);
      
      if (finalOriginalText) {
        console.log('[ASSISTANT_DIRECT_SEND_WITH_ORIGINAL] Sending with original text:', {
          originalText: finalOriginalText,
          translatedText: translatedText
        });
        // 传递原文和翻译内容，实现双重内容显示
        onSendMessage(translatedText.trim(), finalOriginalText);
      } else {
        // 普通直接发送，只传递翻译内容
        console.log('[ASSISTANT_DIRECT_SEND_NO_ORIGINAL] Sending without original text:', translatedText);
        onSendMessage(translatedText.trim());
      }
      // 发送后清空翻译助手草稿
      setAssistantDraft(null);
    }
  };
  
  // 处理粘贴事件
  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    console.log('[PASTE_EVENT] Clipboard paste event triggered');
    
    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      console.error('[PASTE_ERROR] No clipboard data available');
      return;
    }
    
    const items = clipboardData.items;
    console.log('[PASTE_EVENT] Clipboard items count:', items.length);
    
    // 遍历剪贴板项目
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log('[PASTE_EVENT] Item type:', item.type);
      
      // 检查是否是图片
      if (item.type.startsWith('image/')) {
        console.log('[PASTE_EVENT] Image detected:', item.type);
        event.preventDefault(); // 阻止默认粘贴行为
        
        const file = item.getAsFile();
        if (file) {
          console.log('[PASTE_EVENT] File obtained:', { name: file.name, size: file.size, type: file.type });
          handleImagePaste(file);
        } else {
          console.error('[PASTE_ERROR] Failed to get file from clipboard item');
        }
        break;
      }
      // 检查是否是 PDF 文件
      else if (item.type === 'application/pdf') {
        console.log('[PASTE_EVENT] PDF detected:', item.type);
        event.preventDefault(); // 阻止默认粘贴行为
        
        const file = item.getAsFile();
        if (file) {
          console.log('[PASTE_EVENT] PDF file obtained:', { name: file.name, size: file.size, type: file.type });
          handlePdfPaste(file);
        } else {
          console.error('[PASTE_ERROR] Failed to get PDF file from clipboard item');
        }
        break;
      }
      // 文本类型走原有逻辑
    }
  };
  
  // 处理图片粘贴
  const handleImagePaste = async (file: File) => {
    if (disabled) {
      console.error('[IMAGE_PASTE_ERROR] Input is disabled');
      return;
    }
    
    try {
      console.log('[IMAGE_PASTE_START] Processing image paste:', { name: file.name, size: file.size, type: file.type });
      
      // 生成临时本地预览 URL
      const previewUrl = URL.createObjectURL(file);
      console.log('[IMAGE_PASTE] Generated preview URL:', previewUrl);
      
      // 检查 chatId 是否存在
      if (!chatId) {
        console.error('[IMAGE_PASTE_ERROR] chatId is not provided');
        alert('图片粘贴失败：缺少聊天 ID');
        return;
      }
      
      // 读取文件为 dataUrl
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const dataUrl = e.target.result as string;
          console.log('[IMAGE_PASTE] Generated dataUrl:', dataUrl.substring(0, 100) + '...');
          
          // 生成唯一 ID
          const imageId = generateId();
          
          // 创建新的图片草稿，使用 dataUrl 作为 media_path
          const newImageDraft: ImageDraft = {
            id: imageId,
            media_path: dataUrl,
            preview_url: previewUrl,
            name: file.name,
            size: file.size,
            type: file.type
          };
          
          // 更新草稿消息
          if (draftMessage && draftMessage.type === 'image' && draftMessage.images) {
            // 添加到现有图片草稿
            const updatedDraft: DraftMessage = {
              ...draftMessage,
              images: [...draftMessage.images, newImageDraft]
            };
            setDraftMessage(updatedDraft);
            console.log('[IMAGE_PASTE_DRAFT] Added to existing draft:', newImageDraft.id);
          } else {
            // 创建新的图片草稿
            const newDraftMessage: DraftMessage = {
              type: 'image',
              images: [newImageDraft],
              status: 'draft'
            };
            setDraftMessage(newDraftMessage);
            console.log('[IMAGE_PASTE_DRAFT] Created new draft message:', newDraftMessage);
          }
          
          console.log('[IMAGE_PASTE_SUCCESS] Image paste processed successfully:', imageId);
        }
      };
      reader.onerror = (error) => {
        console.error('[IMAGE_PASTE_ERROR] Failed to read file as dataUrl:', error);
        alert('图片粘贴失败：读取文件失败');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('[IMAGE_PASTE_ERROR] Image paste error:', error);
      alert(`图片粘贴失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };
  
  // 处理PDF粘贴
  const handlePdfPaste = async (file: File) => {
    if (disabled) {
      console.error('[PDF_PASTE_ERROR] Input is disabled');
      return;
    }
    
    try {
      console.log('[PDF_PASTE_START] Processing PDF paste:', { name: file.name, size: file.size, type: file.type });
      
      // 生成临时本地预览 URL
      const previewUrl = URL.createObjectURL(file);
      console.log('[PDF_PASTE] Generated preview URL:', previewUrl);
      
      // 检查 chatId 是否存在
      if (!chatId) {
        console.error('[PDF_PASTE_ERROR] chatId is not provided');
        alert('PDF粘贴失败：缺少聊天 ID');
        return;
      }
      
      // 调用现有上传 API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chat_id', chatId);
      
      // 获取 API_BASE
      const API_BASE = getApiBase();
      console.log("[API_BASE_RESOLVED]", API_BASE);
      console.log('[PDF_PASTE] Uploading to server:', `${API_BASE}/api/upload/media`);
      
      // 上传PDF到服务器
      const response = await safeFetch('/api/upload/media', {
        method: 'POST',
        body: formData,
      });
      
      console.log('[PDF_PASTE] Upload response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[PDF_PASTE] Upload response data:', data);
        
        if (data.media_path) {
          console.log('[PDF_PASTE_SUCCESS] Upload successful, media_path:', data.media_path);
          
          // 创建新的PDF草稿
          const newPdfDraft: PdfDraft = {
            id: generateId(),
            media_path: data.media_path,
            preview_url: previewUrl,
            name: file.name,
            size: file.size,
            type: file.type
          };
          
          // 更新草稿消息
          if (draftMessage && draftMessage.type === 'pdf' && draftMessage.pdfs) {
            // 添加到现有PDF草稿
            const updatedDraft: DraftMessage = {
              ...draftMessage,
              pdfs: [...draftMessage.pdfs, newPdfDraft]
            };
            setDraftMessage(updatedDraft);
            console.log('[PDF_PASTE_DRAFT] Added to existing draft:', newPdfDraft.id);
          } else {
            // 创建新的PDF草稿
            const newDraftMessage: DraftMessage = {
              type: 'pdf',
              pdfs: [newPdfDraft],
              status: 'draft'
            };
            setDraftMessage(newDraftMessage);
            console.log('[PDF_PASTE_DRAFT] Created new draft message:', newDraftMessage);
          }
        } else {
          console.error('[PDF_PASTE_ERROR] Upload failed: No media_path returned');
          alert('PDF上传失败：服务器未返回媒体路径');
        }
      } else {
        console.error('[PDF_PASTE_ERROR] Upload failed:', response.status);
        alert(`PDF上传失败：服务器返回错误 ${response.status}`);
      }
    } catch (error) {
      console.error('[PDF_PASTE_ERROR] PDF paste error:', error);
      alert(`PDF粘贴失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };
  
  // 移除图片草稿
  const removeImageDraft = (imageId: string) => {
    if (!draftMessage || !draftMessage.images) return;
    
    const updatedImages = draftMessage.images.filter(img => img.id !== imageId);
    
    if (updatedImages.length > 0) {
      // 更新草稿，保留剩余图片
      setDraftMessage({
        ...draftMessage,
        images: updatedImages
      });
    } else {
      // 没有图片了，清空草稿
      setDraftMessage(null);
    }
    console.log('[IMAGE_DRAFT_REMOVE] Removed image:', imageId);
  };
  
  // 移除PDF草稿
  const removePdfDraft = (pdfId: string) => {
    if (!draftMessage || !draftMessage.pdfs) return;
    
    const updatedPdfs = draftMessage.pdfs.filter(pdf => pdf.id !== pdfId);
    
    if (updatedPdfs.length > 0) {
      // 更新草稿，保留剩余PDF
      setDraftMessage({
        ...draftMessage,
        pdfs: updatedPdfs
      });
    } else {
      // 没有PDF了，清空草稿
      setDraftMessage(null);
    }
    console.log('[PDF_DRAFT_REMOVE] Removed PDF:', pdfId);
  };
  
  // 从本地存储加载分析结果
  const loadAnalysesFromStorage = () => {
    try {
      const analysesData = JSON.parse(localStorage.getItem('ocr_analyses') || '{}');
      const analysesList = Object.values(analysesData);
      setAnalyses(analysesList);
      setFilteredAnalyses(analysesList);
      console.log('[ANALYSIS_STORAGE] Loaded analyses:', analysesList.length);
    } catch (error) {
      console.error('[ANALYSIS_STORAGE] Load failed:', error);
      setAnalyses([]);
      setFilteredAnalyses([]);
    }
  };
  
  // 搜索分析结果
  const searchAnalyses = () => {
    if (!searchQuery.trim()) {
      setFilteredAnalyses(analyses);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results = analyses.filter((analysis: any) => {
      // 搜索图片编号
      if (analysis.imageNumber && analysis.imageNumber.toString().includes(query)) {
        return true;
      }
      // 搜索品牌
      if (analysis.brand && analysis.brand.toLowerCase().includes(query)) {
        return true;
      }
      // 搜索型号
      if (analysis.model && analysis.model.toLowerCase().includes(query)) {
        return true;
      }
      // 搜索分析结果
      if (analysis.analysisResult && analysis.analysisResult.toLowerCase().includes(query)) {
        return true;
      }
      return false;
    });
    
    setFilteredAnalyses(results);
    console.log('[ANALYSIS_SEARCH] Found', results.length, 'results for query:', searchQuery);
  };
  
  return (
    <div className="chat-composer-container">
      {/* 工具按钮 */}
      <div className="chat-composer-tools">
        {/* 翻译插件 */}
        <TranslationPlugin
          inputText={inputText}
          onTranslate={handleTranslate}
          onDirectSend={handleDirectSend}
          disabled={disabled}
          chatId={chatId}
        />
        
        {/* 表情选择器按钮 */}
        <button
          className="chat-composer-emoji-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled}
        >
          😊
        </button>
        
        {/* DeepSeek 聊天按钮 */}
        <button
          className="chat-composer-deepseek-btn"
          onClick={(e) => {
            e.stopPropagation();
            setDeepSeekOpen(!deepSeekOpen);
          }}
          disabled={disabled}
          title="DeepSeek 聊天"
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            zIndex: 2001,
            overflow: 'visible',
            position: 'relative'
          }}
        >
          🤖
        </button>
        
        {/* 分析结果管理按钮 */}
        <button
          className="chat-composer-analysis-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowAnalysisManager(!showAnalysisManager);
          }}
          disabled={disabled}
          title="分析结果管理"
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            zIndex: 2001,
            overflow: 'visible',
            position: 'relative'
          }}
        >
          📊
        </button>
      </div>
      
      {/* 表情选择器 */}
      {showEmojiPicker && (
        <div className="emoji-picker" ref={emojiPickerRef}>
          <div className="emoji-grid">
            {commonEmojis.map((emoji, index) => (
              <button
                key={index}
                className="emoji-item"
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* DeepSeek 聊天窗口已移至全局层渲染 */}
      
      {/* 分析结果详情弹窗 */}
      {showAnalysisDetail && selectedAnalysis && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80%',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '12px',
              borderBottom: '1px solid #eee'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>分析结果详情</h3>
              <button
                onClick={() => setShowAnalysisDetail(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  图片编号: #{selectedAnalysis.imageNumber}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#999'
                }}>
                  {new Date(selectedAnalysis.timestamp || selectedAnalysis.saved_at).toLocaleString()}
                </div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '20px'
              }}>
                {selectedAnalysis.brand && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>品牌</div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{selectedAnalysis.brand}</div>
                  </div>
                )}
                {selectedAnalysis.model && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>型号</div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{selectedAnalysis.model}</div>
                  </div>
                )}
                {selectedAnalysis.category && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>种类</div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{selectedAnalysis.category}</div>
                  </div>
                )}
                {selectedAnalysis.imageUrl && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>图片</div>
                    <img 
                      src={selectedAnalysis.imageUrl} 
                      alt={`分析图片 ${selectedAnalysis.imageNumber}`} 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '80px', 
                        borderRadius: '4px',
                        border: '1px solid #e0e0e0'
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>分析结果</h4>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  color: '#333'
                }}>
                  {selectedAnalysis.analysisResult}
                </div>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowAnalysisDetail(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#f0f0f0',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 分析结果管理界面 */}
      {showAnalysisManager && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: '0',
          width: '400px',
          maxHeight: '500px',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          padding: '16px',
          marginBottom: '8px',
          zIndex: 1000,
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid #eee'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>分析结果管理</h3>
            <button
              onClick={() => setShowAnalysisManager(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
          </div>
          
          {/* 搜索功能 */}
          <div style={{
            marginBottom: '16px',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              placeholder="搜索分析结果..."
              value={searchQuery}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
            />
            <button
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#f0f0f0',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={searchAnalyses}
            >
              搜索
            </button>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>分析结果列表</h4>
            <div style={{
              border: '1px solid #eee',
              borderRadius: '4px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {filteredAnalyses.length > 0 ? (
                filteredAnalyses.map((analysis: any, index: number) => (
                  <div 
                    key={index} 
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onDoubleClick={() => {
                      setSelectedAnalysis(analysis);
                      setShowAnalysisDetail(true);
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        图片编号: #{analysis.imageNumber}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#999'
                      }}>
                        {new Date(analysis.timestamp || analysis.saved_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      {analysis.brand && `品牌: ${analysis.brand}`}
                      {analysis.brand && analysis.model && ' | '}
                      {analysis.model && `型号: ${analysis.model}`}
                      {analysis.category && (analysis.brand || analysis.model) && ' | '}
                      {analysis.category && `种类: ${analysis.category}`}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  {searchQuery.trim() ? '未找到匹配的分析结果' : '暂无分析结果'}
                </div>
              )}
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}>
            <button
              onClick={() => setShowAnalysisManager(false)}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
      
      {/* 草稿消息预览 */}
      {draftMessage && (
        <div className="chat-composer-draft-preview">
          {draftMessage.type === 'image' && draftMessage.images && draftMessage.images.length > 0 && (
            <div className="chat-composer-draft-image">
              <div className="chat-composer-draft-images-grid">
                {draftMessage.images.map((image) => (
                  <div key={image.id} className="chat-composer-draft-image-item">
                    <div className="chat-composer-draft-image-container">
                      <img 
                        src={image.preview_url} 
                        alt={image.name} 
                        className="chat-composer-draft-image-thumbnail"
                      />
                      <button 
                        className="chat-composer-draft-image-remove"
                        onClick={() => removeImageDraft(image.id)}
                        title="移除图片"
                      >
                        ×
                      </button>
                    </div>
                    <div className="chat-composer-draft-image-info">
                      <span className="chat-composer-draft-image-name">{image.name}</span>
                      <span className="chat-composer-draft-image-size">
                        {(image.size / 1024).toFixed(1)}KB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-composer-draft-status">
                草稿：{draftMessage.images.length} 张图片已上传，点击发送
              </div>
            </div>
          )}
          {draftMessage.type === 'pdf' && draftMessage.pdfs && draftMessage.pdfs.length > 0 && (
            <div className="chat-composer-draft-image">
              <div className="chat-composer-draft-images-grid">
                {draftMessage.pdfs.map((pdf) => (
                  <div key={pdf.id} className="chat-composer-draft-image-item">
                    <div className="chat-composer-draft-image-container">
                      <div className="chat-composer-draft-pdf-thumbnail">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 15V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H14" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 21V15H21" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 15H11" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M14 9H11" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span className="chat-composer-draft-pdf-text">PDF</span>
                      </div>
                      <button 
                        className="chat-composer-draft-image-remove"
                        onClick={() => removePdfDraft(pdf.id)}
                        title="移除PDF"
                      >
                        ×
                      </button>
                    </div>
                    <div className="chat-composer-draft-image-info">
                      <span className="chat-composer-draft-image-name">{pdf.name}</span>
                      <span className="chat-composer-draft-image-size">
                        {(pdf.size / 1024).toFixed(1)}KB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-composer-draft-status">
                草稿：{draftMessage.pdfs.length} 个PDF已上传，点击发送
              </div>
            </div>
          )}
          {draftMessage.type === 'text' && draftMessage.text && (
            <div className="chat-composer-draft-text">
              <p>{draftMessage.text}</p>
              <div className="chat-composer-draft-status">
                草稿：点击发送
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="chat-composer-input-container">
        <textarea
          ref={textareaRef}
          className="chat-composer-input"
          placeholder={draftMessage ? "草稿已准备，点击发送" : "输入消息..."}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          rows={1}
          maxLength={1000}
        />
        <button
          className="chat-composer-send-btn"
          onClick={handleSend}
          disabled={disabled || (!inputText.trim() && !draftMessage)}
        >
          <span className="send-icon">✓</span>
        </button>
      </div>
    </div>
  );
};

export default ChatComposer;
