import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DeepSeekPanel.css';
import { useChatStore, eventEmitter } from '../../store/chatStore';
import { useAutoEngineStore } from '../../../../store/autoEngineStore';
import { useCountdownStore } from '../../../../store/countdownStore';
import { translateMessage } from '@/modules/translate_modular/services/translateService';
import { safeFetch } from '@/main';
import { uiScheduler, SchedulerEventType } from '@/core/scheduler/ui_scheduler_core';
import whatsAppInboxService from '@/services/WhatsAppInboxService';

// 新增：DeepSeekOCRResult 组件
interface DeepSeekOCRResultProps {
  ocrAnalysisMap: Record<string, {
    status: 'idle' | 'processing' | 'success' | 'error';
    result: string;
    timestamp: number;
    imageNumber?: number;
    imageUrl?: string;
    structuredResult?: any;
  }>;
}

const DeepSeekOCRResult: React.FC<DeepSeekOCRResultProps> = ({ ocrAnalysisMap }) => {
  // 获取最新的分析结果
  const latestAnalysis = Object.entries(ocrAnalysisMap)
    .sort(([,a], [,b]) => b.timestamp - a.timestamp)
    .shift();
  
  if (!latestAnalysis) {
    return (
      <div className="ocr-analysis-status idle">
        <div className="ocr-analysis-icon">🤖</div>
        <div className="ocr-analysis-title">系统将自动分析OCR结果</div>
        <div className="ocr-analysis-description">
          分析将识别产品类型、型号、参数、应用场景等信息
        </div>
      </div>
    );
  }
  
  const [messageId, analysis] = latestAnalysis;
  
  // 尝试从分析结果中提取关键词
  let productKeyword = '工业产品';
  
  // 尝试提取型号
  const modelMatch = analysis.result.match(/型号[\s\|]*[:：]*[\s\|]*\*\*([^*]+)\*\*/i);
  if (modelMatch) {
    productKeyword = modelMatch[1].trim().replace(/[\|\s]+/g, '');
  }
  
  // 尝试提取品牌
  const brandMatch = analysis.result.match(/品牌[\s\|]*[:：]*[\s\|]*\*\*([^*]+)\*\*/i);
  let brandKeyword = '';
  if (brandMatch) {
    brandKeyword = brandMatch[1].trim().replace(/[\|\s]+/g, '');
  }
  
  // 从分析结果中提取品牌和型号
  const extractBrandAndModel = (text: string, structuredResult?: string) => {
    // 优先使用 structuredResult 作为数据源
    const primarySource = structuredResult || text;
    
    // 处理特殊情况：如果包含"无法从图片中直接识别"等冗长解释，返回"未知"
    let brand = '未知';
    let model = '未知';
    
    // 尝试匹配多种格式的品牌信息
    const brandPatterns = [
      // 表格格式：| **品牌** | **MEAN WELL** |
      /\|\s*\*\*品牌\*\*\s*\|\s*\*\*([^*]+)\*\*\s*\|/i,
      // 标准格式：品牌：**MEAN WELL**
      /品牌[:：]\s*\*\*([^*]+)\*\*/i,
      // 加粗标签格式：**品牌**：MEAN WELL
      /\*\*品牌\*\*[:：]\s*([^\n]+)/i,
      // 简单格式：品牌：MEAN WELL
      /品牌[:：]\s*([^\n]+)/i,
      // 表格格式变体：| 品牌 | MEAN WELL |
      /\|\s*品牌\s*\|\s*([^\|]+)\s*\|/i,
      // 通用表格格式：匹配任何包含品牌的表格行
      /[\|\s]*品牌[\|\s]*[:：]*[\|\s]*\*\*?([^*\|]+)\*\*?[\|\s]*/i,
      // 从文本中提取可能的品牌信息（适用于没有明确标签的情况）
      /(品牌|厂商|制造商)[：:]?\s*([^，。；；\n]+)/i,
      // 尝试从接近开关相关文本中提取品牌
      /(接近开关|传感器)\s*品牌[:：]?\s*([^，。；；\n]+)/i,
      // 尝试从文本开头提取品牌
      /^\s*([^，。；；\n]+)\s*(接近开关|传感器)/i,
      // 从"这款Autonics PR30-15DP是..."格式中提取品牌
      /这款([a-zA-Z0-9]+)\s+[a-zA-Z0-9\-]+是/i,
      // 常见品牌名称模式
      /(PEPPERL\+FUCHS|Autonics|OMRON|Siemens|Schneider|ABB|Mitsubishi|Panasonic|Fuji|Yaskawa|Rockwell|Turck|Balluff|Keyence|SICK|Cognex|Carlo Gavazzi|Leuze|Baumer|BANNER)/i,
      // 中文品牌名称
      /(欧姆龙|西门子|施耐德|ABB|三菱|松下|富士|安川|罗克韦尔|倍加福|图尔克|巴鲁夫|基恩士|奥托尼克斯|西克|康耐视|科瑞|劳易测|堡盟|邦纳)/i
    ];
    
    // 尝试匹配多种格式的型号信息
    const modelPatterns = [
      // 表格格式：| **型号** | **RSP-2400-48** |
      /\|\s*\*\*型号\*\*\s*\|\s*\*\*([^*]+)\*\*\s*\|/i,
      // 标准格式：型号：**RSP-2400-48**
      /型号[:：]\s*\*\*([^*]+)\*\*/i,
      // 加粗标签格式：**型号**：RSP-2400-48
      /\*\*型号\*\*[:：]\s*([^\n]+)/i,
      // 简单格式：型号：RSP-2400-48
      /型号[:：]\s*([^\n]+)/i,
      // 表格格式变体：| 型号 | RSP-2400-48 |
      /\|\s*型号\s*\|\s*([^\|]+)\s*\|/i,
      // 通用表格格式：匹配任何包含型号的表格行
      /[\|\s]*型号[\|\s]*[:：]*[\|\s]*\*\*?([^*\|]+)\*\*?[\|\s]*/i,
      // 从文本中提取可能的型号信息（适用于没有明确标签的情况）
      /(型号|规格|产品号)[：:]?\s*([^，。；；\n]+)/i,
      // 提取M30等规格信息
      /M\d+/i,
      // 从接近开关相关文本中提取型号
      /(接近开关|传感器)\s*型号[:：]?\s*([^，。；；\n]+)/i,
      // 从"这款Autonics PR30-15DP是..."格式中提取型号
      /这款([a-zA-Z0-9]+)\s+([a-zA-Z0-9\-]+)是/i,
      // 常见型号格式
      /[A-Z0-9\-]+\s*[A-Z0-9\-]+/i,
      /[A-Z0-9]+\-[A-Z0-9]+/i,
      /M\d+\-\d+[A-Z]+/i,
      // 特定品牌的型号格式
      /NBB\d+\-\d+[A-Z0-9]+/i,
      /PR\d+\-\d+[A-Z]+/i
    ];
    
    // 尝试匹配品牌
    for (const pattern of brandPatterns) {
      const match = primarySource.match(pattern);
      if (match) {
        const brandText = match[match.length - 1].trim();
        // 检查是否包含冗长解释
        if (!brandText.includes('无法从图片中直接识别') && !brandText.includes('品牌商标通常铸造') && !brandText.includes('国内常见品牌包括') && !brandText.includes('未知') && !brandText.includes('传感器') && !brandText.includes('接近开关')) {
          brand = brandText;
          break;
        }
      }
    }
    
    // 尝试匹配型号
    for (const pattern of modelPatterns) {
      const match = primarySource.match(pattern);
      if (match) {
        const modelText = match[match.length - 1].trim();
        // 检查是否包含冗长解释
        if (!modelText.includes('无法从图片中直接读取') && !modelText.includes('该产品铭牌通常位于') && !modelText.includes('常见型号格式可能为') && !modelText.includes('未知') && !modelText.includes('传感器') && !modelText.includes('接近开关') && !modelText.includes('的屏蔽式')) {
          model = modelText;
          break;
        }
      }
    }
    
    // 特殊处理：如果文本中包含"传感器"和"M30"，提取为型号
    if (model === '未知' && (primarySource.includes('传感器') || text.includes('传感器')) && (/M\d+/i.test(primarySource) || /M\d+/i.test(text))) {
      const mMatch = primarySource.match(/M\d+/i) || text.match(/M\d+/i);
      if (mMatch) {
        model = mMatch[0];
      }
    }
    
    // 特殊处理：对于接近开关，尝试从文本中提取品牌
    if (brand === '未知' && (primarySource.includes('接近开关') || text.includes('接近开关') || primarySource.includes('传感器') || text.includes('传感器'))) {
      // 常见接近开关品牌
      const commonBrands = ['欧姆龙', '西门子', '施耐德', 'ABB', '三菱', '松下', '富士', '安川', '罗克韦尔', '倍加福', '图尔克', '巴鲁夫', '基恩士', '奥托尼克斯', '西克', '康耐视', '科瑞', '劳易测', '堡盟', '邦纳', 'Autonics', 'PEPPERL+FUCHS', 'OMRON', 'Siemens', 'Schneider', 'Mitsubishi', 'Panasonic', 'Fuji', 'Yaskawa', 'Rockwell', 'Turck', 'Balluff', 'Keyence', 'SICK', 'Cognex', 'Carlo Gavazzi', 'Leuze', 'Baumer', 'BANNER'];
      
      for (const commonBrand of commonBrands) {
        if (primarySource.includes(commonBrand) || text.includes(commonBrand)) {
          brand = commonBrand;
          break;
        }
      }
    }
    
    return {
      brand,
      model
    };
  };
  
  const { brand, model } = extractBrandAndModel(analysis.result, analysis.structuredResult);
  
  // 生成淘宝搜索链接
  const generateTaobaoLink = (query: string) => {
    const encodedQuery = encodeURIComponent(query);
    return `https://s.taobao.com/search?q=${encodedQuery}`;
  };
  
  // 生成淘宝图片搜索链接
  const generateTaobaoImageLink = (imageUrl: string) => {
    if (!imageUrl) return null;
    
    try {
      const encodedImageUrl = encodeURIComponent(imageUrl);
      // 淘宝图片搜索URL格式（优化版本）
      return `https://s.taobao.com/search?imgurl=${encodedImageUrl}&imgfile=${encodedImageUrl}&js=1&stats_click=search_radio_all%3A1&initiative_id=staobaoz_20240208&ie=utf8&tfsid=${Date.now()}`;
    } catch (error) {
      console.error('生成淘宝图片搜索链接失败:', error);
      return null;
    }
  };
  
  // 生成推荐购买链接
  const generateRecommendedLinks = () => {
    const links = [];
    
    // 第一个链接：使用型号生成
    if (model !== '未知') {
      links.push(generateTaobaoLink(model));
    } else if (productKeyword !== '工业产品') {
      // 如果model为未知，但提取到了型号关键词
      links.push(generateTaobaoLink(productKeyword));
    }
    
    // 第二个链接：使用品牌+型号生成
    if (brand !== '未知' && model !== '未知' && links.length < 2) {
      links.push(generateTaobaoLink(`${brand} ${model}`));
    } else if (brandKeyword && productKeyword !== '工业产品' && links.length < 2) {
      // 如果brand或model为未知，但提取到了关键词
      links.push(generateTaobaoLink(`${brandKeyword} ${productKeyword}`));
    }
    
    // 第三个链接：使用图片生成
    if (analysis.imageUrl) {
      const imageLink = generateTaobaoImageLink(analysis.imageUrl);
      if (imageLink) {
        links.push(imageLink);
      }
    }
    
    // 如果品牌和型号都为未知，尝试从分析结果中提取关键词生成链接
    if (links.length === 0) {
      // 尝试从分析结果中提取产品类别
      const categoryMatch = analysis.result.match(/类别\s*[:：]\s*\*\*([^*]+)\*\*/);
      if (categoryMatch) {
        links.push(generateTaobaoLink(categoryMatch[1].trim()));
      } else {
        // 默认搜索工业产品
        links.push(generateTaobaoLink('工业产品'));
      }
    }
    
    return links;
  };
  
  const recommendedLinks = generateRecommendedLinks();
  
  if (analysis.status === 'processing') {
    return (
      <div className="ocr-analysis-status processing">
        <div className="ocr-analysis-processing">
          <div className="ocr-analysis-spinner"></div>
          <span className="ocr-analysis-processing-text">🧠 DeepSeek 分析中...</span>
        </div>
        <div className="ocr-analysis-processing-description">
          正在分析产品信息，请稍候...
        </div>
      </div>
    );
  }
  
  if (analysis.status === 'error') {
    return (
      <div className="ocr-analysis-status error">
        <div className="ocr-analysis-error-header">
          <div className="ocr-analysis-error-title">❌ 分析失败</div>
          {analysis.imageNumber && (
            <span className="ocr-analysis-image-number">
              图片编号: #{analysis.imageNumber}
            </span>
          )}
        </div>
        <div className="ocr-analysis-error-content">
          {analysis.result}
        </div>
      </div>
    );
  }
  
  if (analysis.status === 'success') {
    return (
      <div className="ocr-analysis-status success">
        <h2 className="ocr-analysis-result-title">分析结果</h2>
        
        {analysis.imageUrl && (
          <div className="ocr-analysis-image">
            <img 
              src={analysis.imageUrl} 
              alt={`分析图片 ${analysis.imageNumber}`} 
              className="ocr-analysis-image-img"
            />
          </div>
        )}
        
        <div className="ocr-analysis-product-info">
          <h3 className="ocr-analysis-section-title">产品信息</h3>
          <div className="ocr-analysis-info-content">
            <div className="ocr-analysis-info-item">
              <span className="ocr-analysis-info-label">图片编号:</span>
              <span className="ocr-analysis-info-value image-number">#{analysis.imageNumber || 'N/A'}</span>
            </div>
            <div className="ocr-analysis-info-item">
              <span className="ocr-analysis-info-label">分析时间:</span>
              <span className="ocr-analysis-info-value">{new Date(analysis.timestamp).toLocaleString()}</span>
            </div>
            <div className="ocr-analysis-info-item">
              <span className="ocr-analysis-info-label">品牌:</span>
              <span className="ocr-analysis-info-value brand">{brand !== '未知' ? brand : brandKeyword || '未知'}</span>
            </div>
            <div className="ocr-analysis-info-item">
              <span className="ocr-analysis-info-label">型号:</span>
              <span className="ocr-analysis-info-value model">{model !== '未知' ? model : productKeyword !== '工业产品' ? productKeyword : '未知'}</span>
            </div>
            {/* 解析并显示结构化产品信息 */}
            {(() => {
              const structuredResult = analysis.structuredResult;
              if (!structuredResult) return null;
              
              // 尝试从结构化结果中提取产品信息
              const products = [];
              
              // 匹配表格中的产品信息
              const tableMatch = structuredResult.match(/\|\s*序号\s*\|\s*型号\s*\|\s*品牌\s*\|\s*类别\s*\|.*?\n((?:\|.*?\n)+)/s);
              if (tableMatch) {
                const rows = tableMatch[1].trim().split('\n');
                rows.forEach((row, index) => {
                  const columns = row.split('|').map(col => col.trim()).filter(col => col);
                  if (columns.length >= 4) {
                    const product = {
                      index: index + 1,
                      model: columns[1].replace(/\*\*/g, ''),
                      brand: columns[2].replace(/\*\*/g, ''),
                      category: columns[3].replace(/\*\*/g, '')
                    };
                    products.push(product);
                  }
                });
              }
              
              // 如果表格匹配失败，尝试匹配其他格式
              if (products.length === 0) {
                // 匹配类似 "1 | **TeSys K (LP1 K06108D)** | **施耐德 (Schneider Electric)** | **接触器**" 的格式
                const itemMatches = structuredResult.matchAll(/\d+\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*\*\*([^*]+)\*\*/g);
                let index = 1;
                for (const match of itemMatches) {
                  products.push({
                    index: index++,
                    model: match[1].trim(),
                    brand: match[2].trim(),
                    category: match[3].trim()
                  });
                }
              }
              
              if (products.length > 0) {
                return (
                  <div className="ocr-analysis-info-item">
                    <span className="ocr-analysis-info-label">工业分类:</span>
                    <div className="ocr-analysis-products-list">
                      {products.map((product) => (
                        <div key={product.index} className="ocr-analysis-product-item">
                          <span className="ocr-analysis-product-index">{product.index}.</span>
                          <span className="ocr-analysis-product-brand">{product.brand}</span>
                          <span className="ocr-analysis-product-model">{product.model}</span>
                          <span className="ocr-analysis-product-category">{product.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              
              // 如果无法解析，显示简化的分类信息
              return (
                <div className="ocr-analysis-info-item">
                  <span className="ocr-analysis-info-label">工业分类:</span>
                  <span className="ocr-analysis-info-value">Industrial Products</span>
                </div>
              );
            })()}
          </div>
        </div>
        
        <div className="ocr-analysis-detail">
          <h3 className="ocr-analysis-section-title">详细分析</h3>
          {(() => {
            const result = analysis.result;
            console.log('[DEEPSEEK_ANALYSIS_RESULT]', { result, length: result?.length });
            if (!result || result.trim() === '') {
              return <div className="original-analysis">暂无详细分析结果</div>;
            }
            
            // 直接显示原始分析结果，确保所有信息都能正确显示
            return <div className="original-analysis">{result}</div>;
          })()}
        </div>
        
        {/* 推荐购买链接 - 确保显示 */}
        <div className="ocr-analysis-recommendations">
          <h3 className="ocr-analysis-section-title">推荐购买</h3>
          <div className="ocr-analysis-links">
            {recommendedLinks.length > 0 ? (
                  recommendedLinks.map((link, index) => {
                    // 生成链接的搜索关键词备注
                    let keywordNote = '';
                    if (index === 0) {
                      keywordNote = model !== '未知' ? model : (productKeyword !== '工业产品' ? productKeyword : '工业产品');
                    } else if (index === 1) {
                      keywordNote = brand !== '未知' && model !== '未知' ? `${brand} ${model}` : (brandKeyword && productKeyword !== '工业产品' ? `${brandKeyword} ${productKeyword}` : '工业产品');
                    } else if (index === 2) {
                      keywordNote = '图片搜索';
                    }
                    
                    return (
                      <a 
                        key={index} 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ocr-analysis-link"
                      >
                        🔗 淘宝购买链接 {index + 1} ({keywordNote})
                      </a>
                    );
                  })
                ) : (
                  <div className="ocr-analysis-no-links">
                    暂无推荐购买链接
                  </div>
                )}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

interface DeepSeekPanelProps {
  chatId?: string;
  onInsertText?: (text: string) => void;
  disabled?: boolean;
  onPanelStateChange?: (isVisible: boolean) => void;
  selectedMessages?: Array<{id: string, from: string, text: string}>;
  latestCustomerMessage?: {
    message_id: string;
    text: string;
    timestamp: number;
    kind?: 'text' | 'image' | 'media';
    type?: 'text' | 'image' | 'media';
    media_path?: string;
    mediaPath?: string;
  } | null;
}

interface PanelState {
  state: 'fixed' | 'float' | 'hidden';
  isExpanded: boolean;
  isDocked: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  activeModule: 'reply' | 'capabilities';
}

const DeepSeekPanel: React.FC<DeepSeekPanelProps> = ({ chatId, onInsertText, disabled = false, onPanelStateChange, selectedMessages = [], latestCustomerMessage = null }) => {
  // 获取 chatStore
  // 使用稳定的 selector 订阅
  const getCustomerFromCRM = useChatStore((state) => state.getCustomerFromCRM);
  const addNoteToCRM = useChatStore((state) => state.addNoteToCRM);
  const createTaskInCRM = useChatStore((state) => state.createTaskInCRM);
  const syncMessageToCRM = useChatStore((state) => state.syncMessageToCRM);
  const emitCRMNoteAdded = useChatStore((state) => state.emitCRMNoteAdded);
  const emitCRMTaskCreated = useChatStore((state) => state.emitCRMTaskCreated);
  const onNewMessage = useChatStore((state) => state.onNewMessage);
  const offNewMessage = useChatStore((state) => state.offNewMessage);
  const selectedMessageId = useChatStore((state) => state.selectedMessageId);
  // 获取完整的 chatStore 实例
  const chatStore = useChatStore.getState();
  
  // 添加调试输出
  console.log("[CHATID_UI_READ]", chatId);
  // 获取 Auto Engine 状态
  const auto_reply = useAutoEngineStore((state) => state.state.auto_reply);
  const auto_generate = useAutoEngineStore((state) => state.state.auto_generate);
  const auto_send = useAutoEngineStore((state) => state.state.auto_send);
  const delayMode = useAutoEngineStore((state) => state.state.delayMode);
  const fixedGenerateTime = useAutoEngineStore((state) => state.state.fixedGenerateTime);
  const useRandomGenerateTime = useAutoEngineStore((state) => state.state.useRandomGenerateTime);
  const minRandomGenerateTime = useAutoEngineStore((state) => state.state.minRandomGenerateTime);
  const maxRandomGenerateTime = useAutoEngineStore((state) => state.state.maxRandomGenerateTime);
  const fixedReplyTime = useAutoEngineStore((state) => state.state.fixedReplyTime);
  const useRandomReplyTime = useAutoEngineStore((state) => state.state.useRandomReplyTime);
  const minRandomTime = useAutoEngineStore((state) => state.state.minRandomTime);
  const maxRandomTime = useAutoEngineStore((state) => state.state.maxRandomTime);
  const lastProcessedId = useAutoEngineStore((state) => state.lastProcessedId);
  
  // 实时获取 auto_reply 值的 ref
  const autoReplyRef = useRef(auto_reply);
  
  useEffect(() => {
    autoReplyRef.current = auto_reply;
  }, [auto_reply]);
  
  // 睡眠函数
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // 最终发送锁：防止同一 inboundId 被发送多次
  const finalSentSetRef = useRef(new Set<string>());
  
  const FINAL_SEND_LOCK = (inboundId: string) => {
    if (finalSentSetRef.current.has(inboundId)) {
      console.log("[AUTO_ENGINE_FINAL_LOCK_SKIP]", inboundId);
      return false;
    }
    finalSentSetRef.current.add(inboundId);
    return true;
  };
  
  // 使用 useCallback 包装 sendOutbound 函数，确保它的引用是稳定的
  const sendOutbound = React.useCallback(async (params: any) => {
    try {
      console.log("[SEND_OUTBOUND_ENTER]", params);
      
      // 检查是否是来自 scheduleHumanizedSend 的调用
      const isFromSchedule = params.source === "auto_send";
      console.log('[SEND_OUTBOUND_SOURCE_CHECK] 消息来源:', isFromSchedule ? 'scheduleHumanizedSend' : 'direct');
      
      // 生成发送锁ID
      const inboundId = params.source_message_id || params.draft_id || `outbound_${Date.now()}`;
      console.log('[SEND_OUTBOUND_FINAL_LOCK_CHECK] Checking final send lock for:', inboundId);
      
      // 最终发送锁检查
      if (!FINAL_SEND_LOCK(inboundId)) {
        console.error('[SEND_OUTBOUND_FINAL_LOCK_BLOCKED] 发送被最终发送锁阻止:', inboundId);
        return {
          ok: false,
          error: 'send blocked by final lock'
        };
      }
      console.log('[SEND_OUTBOUND_FINAL_LOCK_PASSED] 最终发送锁检查通过:', inboundId);
      
      // 实时获取最新的 store 状态
      const autoEngineStore = useAutoEngineStore.getState();
      const latestAutoSend = autoEngineStore.state.auto_send;
      const latestFixedReplyTime = autoEngineStore.state.fixedReplyTime;
      
      console.log('[SEND_OUTBOUND_AUTO_SEND_CHECK] 检查auto_send状态:', latestAutoSend);
      
      // 状态检查：如果 auto_send 为 false，必须停止 sendMessage 调用
      if (!latestAutoSend) {
        console.error('[SEND_OUTBOUND_AUTO_SEND_BLOCKED] 发送被auto_send状态阻止，auto_send=false');
        return {
          ok: false,
          error: 'auto_send is disabled'
        };
      }
      console.log('[SEND_OUTBOUND_AUTO_SEND_PASSED] auto_send状态检查通过，auto_send=true');
      
      // 安全校验
      console.log('[SEND_OUTBOUND_SECURITY_CHECK] 开始安全校验');
      
      if (!params.to) {
        console.error('[SEND_OUTBOUND_SECURITY_BLOCKED] 发送被安全校验阻止: to参数为空');
        return {
          ok: false,
          error: 'to 参数不能为空'
        };
      }
      
      if (!params.text || !params.text.trim()) {
        console.error('[SEND_OUTBOUND_SECURITY_BLOCKED] 发送被安全校验阻止: 消息内容为空');
        return {
          ok: false,
          error: '消息内容不能为空'
        };
      }
      
      // 确保to参数格式正确
      let formattedTo = params.to;
      if (!formattedTo.startsWith('whatsapp:')) {
        formattedTo = `whatsapp:${formattedTo}`;
        console.log('[SEND_OUTBOUND_FORMAT_TO] 格式化to参数:', { original: params.to, formatted: formattedTo });
      }
      
      console.log('[SEND_OUTBOUND_SECURITY_PASSED] 安全校验通过');
      
      // 最终高风险阻断
      if (params.draft?.risk_level === "high") {
        console.warn("[FINAL_SEND_BLOCKED_HIGH_RISK]", params.draft.chatId || params.to);
        return {
          ok: false,
          error: 'send blocked by high risk'
        };
      }
      console.log('[SEND_OUTBOUND_RISK_CHECK_PASSED] 高风险检查通过');
      
      // 记录使用的回复延迟时间
      console.log("[AUTO_ENGINE_REPLY_DELAY_USED]", latestFixedReplyTime);
      
      // ==============================
      // Twilio WhatsApp 标准请求体
      // ==============================
      // 只发送英文给客户
      const body = {
        "to": formattedTo,
        "text": params.text // 英文内容
      };
      
      // 记录 Auto Engine 状态
      console.log('[AUTO_ENGINE_CHECK_AT_SEND]');
      console.log('[SEND_OUTBOUND] Sending outbound message with body:', body);
      
      // ==============================
      // 实际发送消息逻辑
      // ==============================
      try {
        console.log('[SEND_OUTBOUND_API_CALL] 开始调用后端API发送消息');
        
        // 构建API URL - 使用正确的发送消息路径
        const apiUrl = '/api/outbound/whatsapp';
        console.log('[SEND_OUTBOUND_API_URL]', apiUrl);
        
        // 调用后端API发送消息 - 使用相对URL
        const response = await safeFetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        console.log('[SEND_OUTBOUND_API_RESPONSE] 收到API响应:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.error('[SEND_OUTBOUND_API_ERROR] API调用失败:', { status: response.status, error: errorText });
          
          // 发送失败时释放锁，允许重试
          if (finalSentSetRef.current.has(inboundId)) {
            finalSentSetRef.current.delete(inboundId);
            console.log('[SEND_OUTBOUND_FINAL_LOCK_RELEASED] 发送失败，释放锁:', inboundId);
          }
          
          return {
            ok: false,
            error: `API调用失败: ${response.status} - ${errorText}`
          };
        }
        
        const result = await response.json();
        console.log('[SEND_OUTBOUND_API_SUCCESS] API调用成功:', result);
        
        // 生成消息ID
        const messageId = result.message_id || `msg_local_${Date.now()}`;
        
        // 创建消息对象 - 存储中英文版本
        const outboundMessage = {
          id: messageId,
          message_id: messageId,
          chatId: params.to,
          from: 'operator',
          to: params.to,
          direction: 'outbound' as const,
          status: 'sent' as const,
          type: 'text' as const,
          text: params.text, // 英文内容（客户可见）
          originalText: params.ai_reply_zh, // 中文内容（仅内部可见）
          ai_reply: params.ai_reply,
          ai_reply_zh: params.ai_reply_zh,
          timestamp: Date.now(),
          isGroup: false
        };
        
        // 将消息添加到聊天存储中，这样它就会显示在聊天框中
        // 通过WhatsAppInboxService发送消息，符合唯一入口规则
        if (whatsAppInboxService) {
          whatsAppInboxService.sendMessage(outboundMessage);
          console.log('[SEND_OUTBOUND_MESSAGE_ADDED_TO_STORE] 消息已添加到聊天存储:', messageId);
        }
        
        // 手动更新lastSendTimestamp，确保下次发送时的延迟计算正确
        autoEngineStore.setLastSendTimestamp(Date.now());
        
        return {
          ok: true,
          message_id: messageId,
          to: params.to,
          text: params.text,
          timestamp: Date.now(),
          result: result
        };
      } catch (error) {
        console.error('[SEND_OUTBOUND_SEND_ERROR] 发送消息失败:', error.message);
        
        // 发送失败时释放锁，允许重试
        if (finalSentSetRef.current.has(inboundId)) {
          finalSentSetRef.current.delete(inboundId);
          console.log('[SEND_OUTBOUND_FINAL_LOCK_RELEASED] 发送失败，释放锁:', inboundId);
        }
        
        return {
          ok: false,
          error: error.message
        };
      }
    } catch (error) {
      console.error('[SEND_OUTBOUND_ERROR]', error.message);
      
      // 发送失败时释放锁，允许重试
      const inboundId = params?.source_message_id || params?.draft_id || `outbound_${Date.now()}`;
      if (finalSentSetRef.current.has(inboundId)) {
        finalSentSetRef.current.delete(inboundId);
        console.log('[SEND_OUTBOUND_FINAL_LOCK_RELEASED] 发送失败，释放锁:', inboundId);
      }
      
      return {
        ok: false,
        error: error.message
      };
    }
  }, [chatStore]);
  
  // 最新客户消息状态
  const [currentLatestCustomerMessage, setCurrentLatestCustomerMessage] = useState<{
    message_id: string;
    text: string;
    timestamp: number;
  } | null>(null);

  // 初始化 WhatsAppInboxService 并监听 AUTODRAFT_UPDATE 事件（仅用于日志）
  useEffect(() => {
    console.log("[PANEL_EFFECT] useEffect 开始执行，订阅 AUTODRAFT_UPDATE 事件");
    
    // 注意：不再在此处初始化 WhatsAppInboxService
    // 服务初始化由 App.tsx 单例管理，防止重复启动
    console.log("[PANEL_EFFECT] WhatsAppInboxService 初始化由 App.tsx 管理，跳过初始化");
    
    const handler = (payload: any) => {
      console.log("[PANEL_AUTODRAFT_UPDATE]", payload);
      // 不再驱动 UI 显示，仅用于日志记录
      console.log('[AUTODRAFT_UPDATE_LOG_ONLY] 事件已接收，AI 草稿功能已移除');
    };

    // 使用 eventEmitter 监听事件
    eventEmitter.on("AUTODRAFT_UPDATE", handler);
    console.log("[PANEL_EFFECT] 已成功订阅 AUTODRAFT_UPDATE 事件（仅用于日志）");

    // 清理函数
    return () => {
      console.log("[PANEL_EFFECT] 清理函数执行，取消订阅 AUTODRAFT_UPDATE 事件");
      eventEmitter.off("AUTODRAFT_UPDATE", handler);
    };
  }, []);
  
  // 防止重复 start() 的标记
  const hasStartedRef = useRef(false);

  // 使用 useCallback 包装 sendOutbound 函数，确保它的引用是稳定的
  const appendDraft = React.useCallback((draft: any) => {
    // 实现 appendDraft 逻辑
    console.log('[AUTO_ENGINE_APPEND_DRAFT]', draft);
    
    // 更新 AI 回复状态，显示生成的草稿
    // 处理中文翻译解析
    const fullDraft = draft.reply_en || draft.draft || "";
    const match = fullDraft.match(/【中文翻译.*?】([\s\S]*)/);
    if (match) {
      setChineseTranslation(match[1].trim());
      console.log('[CHINESE_TRANSLATION_UPDATED] 从draft中提取中文翻译:', match[1].trim().substring(0, 50) + '...');
    } else {
      setChineseTranslation(draft.reply_zh || "");
      console.log('[CHINESE_TRANSLATION_UPDATED] 未找到中文翻译，使用reply_zh:', draft.reply_zh?.substring(0, 50) + '...');
    }
    // 设置AI回复，移除中文翻译部分
    setAiReply(
      fullDraft.replace(/【中文翻译[\s\S]*/,'').trim()
    );
    console.log('[AI_REPLY_UPDATED] 生成AI建议回复:', fullDraft.replace(/【中文翻译[\s\S]*/,'').trim().substring(0, 50) + '...');
    
    // 更新内部解释
    setInternalExplanation(
      `客户语言回复：${draft.reply_en || ''}\n中文翻译：${draft.reply_zh || ''}\n\n已基于最新客户消息生成草稿`
    );
    
    // 设置 AI 生成状态
    setAiGenerationStatus({
      status: 'completed',
      source: 'auto_draft',
      model: 'deepseek',
      generated_at: Date.now(),
      reply_language: 'en',
      source_language: 'zh',
      draft_id: draft.draft_id || ''
    });
    
    // 更新autoReplyStatus.basedOnMessage状态，确保显示针对哪条信息生成的建议
    if (currentLatestCustomerMessage || latestCustomerMessage) {
      const messageToUse = currentLatestCustomerMessage || latestCustomerMessage;
      setAutoReplyStatus(prev => ({
        ...prev,
        source: 'auto_draft',
        basedOnMessage: {
          sender: 'customer',
          timestamp: messageToUse.timestamp,
          text: messageToUse.text || '图片消息'
        },
        status: 'draft_generated',
        message: draft.reply_en || ''
      }));
      console.log('[AUTO_REPLY_BASED_ON_UPDATED_BY_APPEND] 更新基于消息:', messageToUse.message_id);
    }
    
    // 将草稿添加到聊天存储中，这样它就会显示在聊天框中，并且中文翻译也会显示
    if (draft.reply_en && whatsAppInboxService) {
      // 生成草稿消息ID
      const draftMessageId = `draft_${Date.now()}`;
      
      // 创建草稿消息对象
      const draftMessage = {
        id: draftMessageId,
        message_id: draftMessageId,
        chatId: chatId,
        from: 'operator',
        to: chatId,
        direction: 'outbound' as const,
        status: 'draft' as const,
        type: 'text' as const,
        text: draft.reply_en,
        ai_reply: draft.reply_en,
        ai_reply_zh: draft.reply_zh,
        timestamp: Date.now(),
        isGroup: false
      };
      
      // 将草稿消息添加到聊天存储中
      whatsAppInboxService.sendMessage(draftMessage);
      console.log('[DRAFT_ADDED_TO_STORE] 草稿已添加到聊天存储:', draftMessageId);
    }
  }, [chatId, currentLatestCustomerMessage, latestCustomerMessage]);
  

  
  // 防抖计时器
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 最后生成草稿的时间
  const lastDraftTimeRef = useRef<number>(0);
  // 防抖时间（秒）
  const DEBOUNCE_SECONDS = 5;
  
  // 倒计时状态
  const [countdown, setCountdown] = useState<any>(null);
  
  // 监听倒计时变化
  useEffect(() => {
    if (!chatId) return;
    
    const updateCountdown = () => {
      const countdownStore = useCountdownStore.getState();
      const currentCountdown = countdownStore.getCountdown(chatId);
      setCountdown(currentCountdown);
    };
    
    // 初始更新
    updateCountdown();
    
    // 每秒更新一次倒计时
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [chatId]);
  const [panelState, setPanelState] = useState<PanelState>(() => {
    // 强制使用默认状态，确保面板默认可见，不受 localStorage 中保存的状态影响
    return {
      state: 'fixed',
      isExpanded: true,
      isDocked: true,
      position: { x: 100, y: 100 },
      size: { width: 400, height: 500 },
      activeModule: 'reply'
    };
  });

  const [boundChatId, setBoundChatId] = useState<string | null>(chatId);
  const [aiReply, setAiReply] = useState('');
  const [internalExplanation, setInternalExplanation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [isFloating, setIsFloating] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [explainLanguage, setExplainLanguage] = useState('zh');
  
  // 草稿存储状态
  const [draftReply, setDraftReply] = useState<{
    language: string;
    content: string;
    content_zh: string;
  } | null>(null);
  const [internalExplanationZh, setInternalExplanationZh] = useState<{
    customer_intent: string;
    reply_strategy: string;
    risk_or_note: string;
    chinese_translation: string;
  } | null>(null);
  
  // 新增：中文翻译状态
  const [chineseTranslation, setChineseTranslation] = useState<string>('');
  

  
  // 新增：OCR分析状态
  const [ocrAnalysisMap, setOcrAnalysisMap] = useState<Record<string, {
    status: 'idle' | 'processing' | 'success' | 'error';
    result: string;
    timestamp: number;
    imageNumber?: number;
    imageUrl?: string;
    structuredResult?: any;
  }>>({});
  const [ocrAnalysisStatus, setOcrAnalysisStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [ocrAnalysisError, setOcrAnalysisError] = useState<string>('');
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [ocrError, setOcrError] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<string>('');
  const [ocrAnalysisResult, setOcrAnalysisResult] = useState<{
    brand: string;
    model: string;
    part_no: string;
    category: string;
    voltage: string;
    confidence: string;
    raw_text: string;
    business_summary: string;
  }>({
    brand: '未知',
    model: '未知',
    part_no: '未知',
    category: '未知',
    voltage: '未知',
    confidence: '未知',
    raw_text: '',
    business_summary: ''
  });
  const [imageCounter, setImageCounter] = useState<number>(1);
  const [analysisSearchResults, setAnalysisSearchResults] = useState<Array<any>>([]);
  
  // 来源消息状态
  const [sourceMessage, setSourceMessage] = useState<{
    message_id: string;
    sender: string;
    text: string;
    timestamp: number;
  } | null>(null);
  
  // 客户消息预览卡片状态
  const [isSourceMessageExpanded, setIsSourceMessageExpanded] = useState(true);
  // 回复依据显示状态
  const [showSourceMessageDetails, setShowSourceMessageDetails] = useState(false);
  
  // 草稿状态管理
  const [draftStatus, setDraftStatus] = useState<'active' | 'stale' | 'override_confirmed'>('active');
  
  // 翻译状态管理
  const [customerMessageTranslation, setCustomerMessageTranslation] = useState<{
    target: string;
    text: string;
    engine: string;
    mode: string;
    status: 'done' | 'error' | 'loading';
  } | null>(null);
  
  // Auto Engine 状态 - 仅使用 AUTO_ENGINE_STATE
  
  // 从本地存储加载时间设置 - 临时禁用，使用默认值
  const loadTimeSettings = () => {
    try {
      console.log('[TIME_SETTINGS_LOAD_DISABLED] Local storage loading disabled, using defaults');
    } catch (error) {
      console.error('[TIME_SETTINGS_LOAD_ERROR]', error);
    }
    return {
      fixedReplyTime: 2,
      useRandomReplyTime: false,
      minRandomTime: 2,
      maxRandomTime: 120,
      fixedGenerateTime: 2,
      useRandomGenerateTime: false,
      minRandomGenerateTime: 2,
      maxRandomGenerateTime: 120
    };
  };

  // 保存时间设置到本地存储 - 临时禁用
  const saveTimeSettings = (settings: any) => {
    try {
      console.log('[TIME_SETTINGS_SAVE_DISABLED] Local storage saving disabled', settings);
    } catch (error) {
      console.error('[TIME_SETTINGS_SAVE_ERROR]', error);
    }
  };

  // 回复时间设置状态 - 从 store 获取
  // AI建议回复生成时间设置状态 - 从 store 获取
  
  // 获取设置器方法
  const setDelayMode = useAutoEngineStore((state) => state.setDelayMode);
  const setFixedGenerateTime = useAutoEngineStore((state) => state.setFixedGenerateTime);
  const setUseRandomGenerateTime = useAutoEngineStore((state) => state.setUseRandomGenerateTime);
  const setMinRandomGenerateTime = useAutoEngineStore((state) => state.setMinRandomGenerateTime);
  const setMaxRandomGenerateTime = useAutoEngineStore((state) => state.setMaxRandomGenerateTime);
  const setFixedReplyTime = useAutoEngineStore((state) => state.setFixedReplyTime);
  const setUseRandomReplyTime = useAutoEngineStore((state) => state.setUseRandomReplyTime);
  const setMinRandomTime = useAutoEngineStore((state) => state.setMinRandomTime);
  const setMaxRandomTime = useAutoEngineStore((state) => state.setMaxRandomTime);
  const setAutoReply = useAutoEngineStore((state) => state.setAutoReply);
  const setAutoGenerate = useAutoEngineStore((state) => state.setAutoGenerate);
  const setAutoSend = useAutoEngineStore((state) => state.setAutoSend);
  // Auto Engine 状态 - 仅使用 AUTO_ENGINE_STATE
  // 已处理的消息ID集合，避免重复处理
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  // 防炸设计：记录每条inbound只允许生成一次
  const lastAutoDraftMessageIdRef = useRef<Record<string, string>>({});
  // 防炸设计：记录每条inbound只允许自动发送一次
  const lastAutoSendMessageIdRef = useRef<Record<string, string>>({});
  // 已处理的 message_id 映射，用于事件幂等和状态跟踪
  const processedStateRef = useRef<Map<string, 'inflight' | 'done' | 'failed'>>(new Map());
  // 消息ID插入顺序队列，用于内存上限管理
  const queueRef = useRef<string[]>([]);
  // 内存上限
  const MEMORY_LIMIT = 500;
  // 自动回复状态
  const [autoReplyStatus, setAutoReplyStatus] = useState<{
    source: string;
    basedOnMessage: {
      sender: string;
      timestamp: number;
      text: string;
    } | null;
    status: 'idle' | 'generating' | 'draft_generated' | 'sent' | 'failed';
    message: string;
  }>({
    source: '',
    basedOnMessage: null,
    status: 'idle',
    message: ''
  });

  // AI 生成状态
  const [aiGenerationStatus, setAiGenerationStatus] = useState<{
    status: 'idle' | 'generating' | 'completed' | 'unverified';
    source: string | null;
    model: string | null;
    generated_at: number | null;
    reply_language: string | null;
    source_language: string | null;
    draft_id: string | null;
  }>({
    status: 'idle',
    source: null,
    model: null,
    generated_at: null,
    reply_language: null,
    source_language: null,
    draft_id: null
  });

  // 加载本地存储的分析结果 - 临时禁用
  useEffect(() => {
    console.log('[ANALYSIS_STORAGE_LOAD_DISABLED] Local storage loading disabled');
  }, []);

  // 管理内存上限的辅助函数
  const manageMemoryLimit = (messageId: string) => {
    // 添加到队列
    queueRef.current.push(messageId);
    
    // 检查是否超过内存上限
    if (processedStateRef.current.size >= MEMORY_LIMIT) {
      // 移除最老的ID
      const oldestId = queueRef.current.shift();
      if (oldestId) {
        processedStateRef.current.delete(oldestId);
        console.log('[DEEPSEEK_MEMORY_LIMIT] Removed oldest entry:', oldestId);
      }
    }
  };

  // 分析OCR结果
  const analyzeOcrResult = async (ocrText: string, message_id?: string, imageNumber?: number, mediaPath?: string, direction?: string, id?: string, signal?: AbortSignal) => {
    console.log('[AUTO_ENGINE_TRIGGER] analyzeOcrResult', { message_id, direction });
    
    // 执行闸门 1：只允许 customer inbound 触发
    if (direction !== "inbound") {
      console.log('[AUTO_ENGINE_SKIP_NOT_INBOUND]', { message_id, direction });
      return;
    }
    
    // 执行闸门 2：跳过重复处理
    const currentId = id || message_id;
    if (currentId && lastProcessedId === currentId) {
      console.log('[AUTO_ENGINE_SKIP_DUPLICATE]', { message_id: currentId });
      return;
    }
    
    // 状态检查：如果 auto_generate 为 false，不允许触发 DeepSeek 分析流程
    const autoEngineStore = useAutoEngineStore.getState();
    if (!autoEngineStore.state.auto_generate) {
      console.log('[AUTO_ENGINE_CHECK] auto_generate is false, skipping OCR analysis');
      return;
    }
    
    if (!ocrText) {
      setOcrAnalysisError('OCR结果为空，无法分析');
      setOcrAnalysisStatus('error');
      setOcrStatus('error');
      setOcrError('OCR结果为空，无法分析');
      return;
    }
    
    const msgId = message_id || Date.now().toString();
    const currentImageNumber = imageNumber || imageCounter;
    
    // 优先使用传入的mediaPath，其次使用latestCustomerMessage的media_path，最后使用占位符
    let currentImageUrl = mediaPath || (latestCustomerMessage?.media_path || latestCustomerMessage?.mediaPath);
    
    // 确保图片URL有效
    if (!currentImageUrl) {
      // 只在没有有效图片URL时使用占位符
      currentImageUrl = 'https://picsum.photos/400/300';
      console.warn('[IMAGE_URL_WARNING] 没有找到有效的图片URL，使用占位符');
    } else {
      console.log('[IMAGE_URL_INFO] 使用有效的图片URL:', currentImageUrl);
    }
    
    // 清理媒体路径，防止URL重复拼接
    if (currentImageUrl && typeof currentImageUrl === 'string') {
      // 检查是否已经是完整URL
      if (!currentImageUrl.startsWith('http')) {
        // 如果是相对路径，确保以/开头
        if (!currentImageUrl.startsWith('/')) {
          currentImageUrl = '/' + currentImageUrl;
        }
        // 构建完整的本地URL
        currentImageUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev' + currentImageUrl;
        
        // 检查重复
        if (currentImageUrl.includes('https://jev-rebuild-worker.bensonlove1986.workers.dev/api/media') && currentImageUrl.includes('https://jev-rebuild-worker.bensonlove1986.workers.dev/api/media', 50)) {
          // 去除重复的部分
          const firstPart = currentImageUrl.split('https://jev-rebuild-worker.bensonlove1986.workers.dev/api/media')[1];
          currentImageUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev/api/media' + firstPart;
        }
        // 检查worker URL重复
        if (currentImageUrl.includes('https://jev-rebuild-worker.bensonlove1986.workers.dev/api/api/media')) {
          // 修复重复拼接的URL
          currentImageUrl = currentImageUrl.replace('https://jev-rebuild-worker.bensonlove1986.workers.dev/api/api/media', 'https://jev-rebuild-worker.bensonlove1986.workers.dev/api/media');
        }
      }
    }
    
    // 打印图片URL信息，以便调试
    console.log('[IMAGE_URL_DEBUG] 图片URL信息:', {
      mediaPath,
      media_path: latestCustomerMessage?.media_path,
      mediaPathProp: latestCustomerMessage?.mediaPath,
      currentImageUrl
    });
    
    // 打印日志，检查DeepSeek分析是否被调用
    console.log('[DEEPSEEK_ANALYZE_CALL] 开始分析OCR结果:', {
      message_id: msgId,
      imageNumber: currentImageNumber,
      imageUrl: currentImageUrl,
      ocrTextLength: ocrText.length
    });
    
    // 更新 ocrAnalysisMap 状态
    setOcrAnalysisMap(prev => ({
      ...prev,
      [msgId]: {
        status: 'processing',
        result: '',
        timestamp: Date.now(),
        imageNumber: currentImageNumber,
        imageUrl: currentImageUrl
      }
    }));
    
    setOcrAnalysisStatus('processing');
    setOcrAnalysisError('');
    setOcrStatus('processing');
    setOcrResult(ocrText);
    
    console.log('[OCR_TO_DEEPSEEK_START] Starting DeepSeek analysis for message:', msgId);
    
    try {
      // 构造包含 OCR_TEXT 标记的请求数据
      const enhancedMessage = `请分析以下产品信息，优先从 OCR_TEXT 中提取品牌与型号，只有当 OCR_TEXT 不包含相关字段时，才允许进行视觉推断。

[OCR_TEXT]
${ocrText}

请按照以下格式输出分析结果：
1. 品牌：**品牌名称**
2. 型号：**型号名称**
3. 详细分析：**详细分析内容**

注意：必须优先使用 OCR_TEXT 中识别的品牌和型号，禁止重新推测品牌。`;
      
      const requestData = {
        chat_id: chatId,
        message_id: msgId,
        ocr_text: ocrText,
        image_url: currentImageUrl,
        context: "industrial_b2b_parts"
      };
      
      console.log('[DEEPSEEK_OCR_ANALYSIS_REQUEST] Sending request to Persona for OCR analysis:', {
        ocrTextLength: ocrText.length,
        message_id: msgId
      });
      
      console.log('[PERSONA_OCR_PAYLOAD]', requestData);
      
      const response = await safeFetch('/api/persona/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: signal
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('[DEEPSEEK_OCR_ANALYSIS_ERROR] API调用失败:', { status: response.status, error: errorText });
        throw new Error(`API调用失败: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[DEEPSEEK_STREAM_APPEND] Received response from Persona OCR:', result);
      
      if (!result || !result.ok) {
        console.error('[DEEPSEEK_OCR_ANALYSIS_REJECT] API返回失败:', { ok: result?.ok, result });
        throw new Error('API返回失败: ok=false');
      }
      
      // 解析分析结果
      const analysisResult = result.analysis || result.reply || result.response || result.result || '';
      
      // 更新 ocrAnalysisMap 状态
      setOcrAnalysisMap(prev => ({
        ...prev,
        [msgId]: {
          status: 'success',
          result: analysisResult,
          timestamp: Date.now(),
          imageNumber: currentImageNumber,
          imageUrl: currentImageUrl,
          structuredResult: result.structured_result
        }
      }));
      
      // 从分析结果和OCR文本中提取品牌和型号
      const extractBrandAndModelFromResult = (ocrText: string, primarySource: string) => {
        let brand = '未知';
        let model = '未知';
        
        // 1. 优先从 primarySource（structured_result 或 OCR_TEXT）中提取品牌和型号
        console.log('[BRAND_MODEL_EXTRACTION] 开始从 primarySource 中提取品牌和型号:', primarySource);
        
        // 从 primarySource 中提取品牌的模式
        const primaryBrandPatterns = [
          // 常见品牌名称模式
          /(PEPPERL\+FUCHS|Autonics|OMRON|Siemens|Schneider|ABB|Mitsubishi|Panasonic|Fuji|Yaskawa|Rockwell|Turck|Balluff|Keyence|SICK|Cognex|Carlo Gavazzi|Leuze|Baumer|BANNER)/i,
          // 中文品牌名称
          /(欧姆龙|西门子|施耐德|ABB|三菱|松下|富士|安川|罗克韦尔|倍加福|图尔克|巴鲁夫|基恩士|奥托尼克斯|西克|康耐视|科瑞|劳易测|堡盟|邦纳)/i
        ];
        
        // 从 primarySource 中提取型号的模式
        const primaryModelPatterns = [
          // 常见型号格式
          /[A-Z0-9\-]+\s*[A-Z0-9\-]+/i,
          /[A-Z0-9]+\-[A-Z0-9]+/i,
          /M\d+\-\d+[A-Z]+/i,
          // 特定品牌的型号格式
          /NBB\d+\-\d+[A-Z0-9]+/i,
          /PR\d+\-\d+[A-Z]+/i
        ];
        
        // 尝试从 primarySource 中提取品牌
        for (const pattern of primaryBrandPatterns) {
          const match = primarySource.match(pattern);
          if (match) {
            brand = match[0].trim();
            console.log('[BRAND_MODEL_EXTRACTION] 从 primarySource 中提取到品牌:', brand);
            break;
          }
        }
        
        // 尝试从 primarySource 中提取型号
        for (const pattern of primaryModelPatterns) {
          const match = primarySource.match(pattern);
          if (match) {
            const modelText = match[0].trim();
            // 过滤掉太短的匹配（可能是误匹配）
            if (modelText.length > 4) {
              model = modelText;
              console.log('[BRAND_MODEL_EXTRACTION] 从 primarySource 中提取到型号:', model);
              break;
            }
          }
        }
        
        // 2. 如果 primarySource 中没有提取到，从 OCR_TEXT 中提取
        if (brand === '未知' || model === '未知') {
          console.log('[BRAND_MODEL_EXTRACTION] 从 OCR_TEXT 中提取品牌和型号');
          
          // 从 OCR_TEXT 中提取品牌的模式
          const ocrBrandPatterns = [
            // 常见品牌名称模式
            /(PEPPERL\+FUCHS|Autonics|OMRON|Siemens|Schneider|ABB|Mitsubishi|Panasonic|Fuji|Yaskawa|Rockwell|Turck|Balluff|Keyence|SICK|Cognex|Carlo Gavazzi|Leuze|Baumer|BANNER)/i,
            // 中文品牌名称
            /(欧姆龙|西门子|施耐德|ABB|三菱|松下|富士|安川|罗克韦尔|倍加福|图尔克|巴鲁夫|基恩士|奥托尼克斯|西克|康耐视|科瑞|劳易测|堡盟|邦纳)/i
          ];
          
          // 从 OCR_TEXT 中提取型号的模式
          const ocrModelPatterns = [
            // 常见型号格式
            /[A-Z0-9\-]+\s*[A-Z0-9\-]+/i,
            /[A-Z0-9]+\-[A-Z0-9]+/i,
            /M\d+\-\d+[A-Z]+/i,
            // 特定品牌的型号格式
            /NBB\d+\-\d+[A-Z0-9]+/i,
            /PR\d+\-\d+[A-Z]+/i
          ];
          
          // 尝试从 OCR_TEXT 中提取品牌
          if (brand === '未知') {
            for (const pattern of ocrBrandPatterns) {
              const match = ocrText.match(pattern);
              if (match) {
                brand = match[0].trim();
                console.log('[BRAND_MODEL_EXTRACTION] 从 OCR_TEXT 中提取到品牌:', brand);
                break;
              }
            }
          }
          
          // 尝试从 OCR_TEXT 中提取型号
          if (model === '未知') {
            for (const pattern of ocrModelPatterns) {
              const match = ocrText.match(pattern);
              if (match) {
                const modelText = match[0].trim();
                // 过滤掉太短的匹配（可能是误匹配）
                if (modelText.length > 4) {
                  model = modelText;
                  console.log('[BRAND_MODEL_EXTRACTION] 从 OCR_TEXT 中提取到型号:', model);
                  break;
                }
              }
            }
          }
        }
        
        // 3. 特殊处理：如果文本中包含"传感器"和"M30"，提取为型号
        if (model === '未知' && (primarySource.includes('传感器') || ocrText.includes('传感器')) && (/M\d+/i.test(primarySource) || /M\d+/i.test(ocrText))) {
          const mMatch = primarySource.match(/M\d+/i) || ocrText.match(/M\d+/i);
          if (mMatch) {
            model = mMatch[0];
            console.log('[BRAND_MODEL_EXTRACTION] 从特殊模式中提取到型号:', model);
          }
        }
        
        // 4. 特殊处理：对于接近开关，尝试从文本中提取品牌
        if (brand === '未知' && (primarySource.includes('接近开关') || ocrText.includes('接近开关') || primarySource.includes('传感器') || ocrText.includes('传感器'))) {
          // 常见接近开关品牌
          const commonBrands = ['欧姆龙', '西门子', '施耐德', 'ABB', '三菱', '松下', '富士', '安川', '罗克韦尔', '倍加福', '图尔克', '巴鲁夫', '基恩士', '奥托尼克斯', '西克', '康耐视', '科瑞', '劳易测', '堡盟', '邦纳', 'Autonics', 'PEPPERL+FUCHS', 'OMRON', 'Siemens', 'Schneider', 'Mitsubishi', 'Panasonic', 'Fuji', 'Yaskawa', 'Rockwell', 'Turck', 'Balluff', 'Keyence', 'SICK', 'Cognex', 'Carlo Gavazzi', 'Leuze', 'Baumer', 'BANNER'];
          
          for (const commonBrand of commonBrands) {
            if (primarySource.includes(commonBrand) || ocrText.includes(commonBrand)) {
              brand = commonBrand;
              console.log('[BRAND_MODEL_EXTRACTION] 从常见品牌列表中提取到品牌:', brand);
              break;
            }
          }
        }
        
        console.log('[BRAND_MODEL_EXTRACTION] 最终提取结果: 品牌=', brand, '型号=', model);
        return { brand, model };
      };
      
      // 优先使用 structured_result 作为品牌型号提取的数据源
      const structuredResult = result.structured_result;
      const primarySource = structuredResult || ocrText;
      const { brand, model } = extractBrandAndModelFromResult(ocrText, primarySource);
      
      // 更新OCR分析结果状态
      setOcrAnalysisResult({
        brand: brand,
        model: model,
        part_no: '未知',
        category: '未知',
        voltage: '未知',
        confidence: '未知',
        raw_text: ocrText,
        business_summary: analysisResult
      });
      setOcrAnalysisStatus('success');
      setOcrStatus('success');
      setOcrResult(ocrText);
      
      // 保存分析结果到本地存储
      const analysisData = {
        message_id: msgId,
        imageNumber: currentImageNumber,
        imageUrl: currentImageUrl,
        ocrText: ocrText,
        analysisResult: analysisResult,
        timestamp: Date.now()
      };
      saveAnalysisToStorage(analysisData);
      
      // 记录 Auto Engine 状态
      console.log('[AUTO_ENGINE_CHECK_AT_ANALYSIS]');
      console.log('[OCR_TO_DEEPSEEK_DONE] Analysis completed successfully for message:', msgId);
      
      // 不再触发AI建议回复生成，只做产品识别理解
    } catch (error) {
      // 区分AbortError
      if (error?.name === 'AbortError') {
        console.log('[DEEPSEEK_ANALYZE_TIMEOUT]', { message_id: msgId });
      } else {
        console.error('[DEEPSEEK_OCR_ANALYSIS_ERROR] Failed to analyze OCR result:', error);
      }
      
      // 更新 ocrAnalysisMap 状态
      setOcrAnalysisMap(prev => ({
        ...prev,
        [msgId]: {
          status: 'error',
          result: error?.name === 'AbortError' ? '分析超时，请重试' : (error instanceof Error ? error.message : '分析失败，请重试'),
          timestamp: Date.now(),
          imageNumber: currentImageNumber,
          imageUrl: currentImageUrl
        }
      }));
      
      const errorMessage = error?.name === 'AbortError' ? '分析超时，请重试' : (error instanceof Error ? error.message : '分析失败，请重试');
      setOcrAnalysisError(errorMessage);
      setOcrAnalysisStatus('error');
      setOcrStatus('error');
      setOcrError(errorMessage);
    }
  };



  const panelRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 保存状态到 localStorage
  useEffect(() => {
    localStorage.setItem('deepseek_panel_state', JSON.stringify(panelState));
  }, [panelState]);

  // 通知父组件面板状态变化
  useEffect(() => {
    if (onPanelStateChange) {
      // 无论是fixed还是float状态，都让父组件认为面板可见
      // 这样可以确保中间的聊天消息区域始终显示
      onPanelStateChange(panelState.state !== 'hidden');
    }
  }, [panelState.state, onPanelStateChange]);
  
  // 监听latestCustomerMessage变化，更新相关状态
  useEffect(() => {
    if (latestCustomerMessage) {
      console.log('[LATEST_CUSTOMER_MESSAGE_CHANGED] 监听变化:', latestCustomerMessage.message_id);
      
      // 更新currentLatestCustomerMessage状态
      setCurrentLatestCustomerMessage({
        message_id: latestCustomerMessage.message_id,
        text: latestCustomerMessage.text || '图片消息',
        timestamp: latestCustomerMessage.timestamp
      });
      console.log('[CURRENT_LATEST_MESSAGE_UPDATED_BY_PROP] 更新基于消息:', latestCustomerMessage.message_id);
      
      // 更新autoReplyStatus.basedOnMessage状态，显示针对哪条信息生成的建议
      setAutoReplyStatus(prev => ({
        ...prev,
        basedOnMessage: {
          sender: 'customer',
          timestamp: latestCustomerMessage.timestamp,
          text: latestCustomerMessage.text || '图片消息'
        }
      }));
      console.log('[AUTO_REPLY_BASED_ON_UPDATED_BY_PROP] 更新基于消息:', latestCustomerMessage.message_id);
      
      // 触发AI建议生成
      if (chatId && latestCustomerMessage.text) {
        console.log('[AI_SUGGESTION_TRIGGER] 触发AI建议生成:', latestCustomerMessage.message_id);
        
        // 构建客户消息对象
        const customerMessage = {
          id: latestCustomerMessage.message_id,
          message_id: latestCustomerMessage.message_id,
          chat_id: chatId,
          text: latestCustomerMessage.text,
          language: detectLanguage(latestCustomerMessage.text),
          role: 'customer' as const,
          status: 'new' as const,
          timestamp: latestCustomerMessage.timestamp
        };
        
        // AutoDraftWorker 已移除，AI 草稿功能不再可用
        console.log('[DEEPSEEK_AUTO_DRAFT_REMOVED] AutoDraftWorker has been removed');
        console.log('[DEEPSEEK_AUTO_DRAFT_REMOVED] AI draft functionality is no longer available');
      }
    }
  }, [latestCustomerMessage, chatId]);

  // 保存时间设置到本地存储
  useEffect(() => {
    const timeSettings = {
      fixedReplyTime,
      useRandomReplyTime,
      minRandomTime,
      maxRandomTime,
      fixedGenerateTime,
      useRandomGenerateTime,
      minRandomGenerateTime,
      maxRandomGenerateTime
    };
    saveTimeSettings(timeSettings);
    console.log('[TIME_SETTINGS_SAVED]', timeSettings);
  }, [fixedGenerateTime, useRandomGenerateTime, minRandomGenerateTime, maxRandomGenerateTime]);

  // Auto Engine 状态管理 - 仅使用 AUTO_ENGINE_STATE

  // 保存草稿到本地存储
  const saveDraftToStorage = (chatId: string, draft: any) => {
    try {
      const drafts = JSON.parse(localStorage.getItem('ai_drafts') || '{}');
      drafts[chatId] = {
        ...draft,
        updated_at: Date.now()
      };
      localStorage.setItem('ai_drafts', JSON.stringify(drafts));
      console.log('[DRAFT_STORAGE] Saved draft for chat_id:', chatId);
    } catch (error) {
      console.error('[DRAFT_STORAGE] Save failed:', error);
    }
  };

  // 从本地存储读取草稿
  const loadDraftFromStorage = (chatId: string): any => {
    try {
      const drafts = JSON.parse(localStorage.getItem('ai_drafts') || '{}');
      const draft = drafts[chatId];
      console.log('[DRAFT_STORAGE] Loaded draft for chat_id:', chatId, draft ? 'found' : 'not found');
      return draft;
    } catch (error) {
      console.error('[DRAFT_STORAGE] Load failed:', error);
      return null;
    }
  };
  
  // 保存分析结果到本地存储
  const saveAnalysisToStorage = (analysisData: any) => {
    try {
      const analyses = JSON.parse(localStorage.getItem('ocr_analyses') || '{}');
      
      // 从分析结果中提取品牌和型号
      let brand = analysisData.brand || '';
      let model = analysisData.model || '';
      
      // 如果没有直接提供，尝试从analysisResult中提取
      if (!brand || !model && analysisData.analysisResult) {
        const result = analysisData.analysisResult;
        // 简单的正则提取，实际项目中可能需要更复杂的解析
        const brandMatch = result.match(/品牌[:：]\s*(.+?)(?:\n|$)/);
        const modelMatch = result.match(/型号[:：]\s*(.+?)(?:\n|$)/);
        if (brandMatch) brand = brandMatch[1].trim();
        if (modelMatch) model = modelMatch[1].trim();
      }
      
      // 生成保存键：型号-图片编号品牌
      const key = `${model}-${analysisData.imageNumber}${brand}` || `analysis_${Date.now()}`;
      
      analyses[key] = {
        ...analysisData,
        brand: brand,
        model: model,
        saved_at: Date.now()
      };
      localStorage.setItem('ocr_analyses', JSON.stringify(analyses));
      console.log('[ANALYSIS_STORAGE] Saved analysis for image:', key);
    } catch (error) {
      console.error('[ANALYSIS_STORAGE] Save failed:', error);
    }
  };
  
  // 从本地存储加载分析结果
  const loadAnalysesFromStorage = (): Record<string, any> => {
    try {
      console.log('[ANALYSIS_STORAGE_LOAD_DISABLED] Local storage loading disabled');
      return {};
    } catch (error) {
      console.error('[ANALYSIS_STORAGE] Load failed:', error);
      return {};
    }
  };
  
  // 搜索分析结果
  const searchAnalyses = (query: string) => {
    if (!query.trim()) {
      setAnalysisSearchResults([]);
      return;
    }
    
    const analyses = loadAnalysesFromStorage();
    const results: Array<any> = [];
    
    Object.values(analyses).forEach((analysis: any) => {
      // 搜索图片编号
      if (analysis.imageNumber && analysis.imageNumber.toString().includes(query)) {
        results.push(analysis);
      }
      // 搜索分析内容
      else if (analysis.analysisResult && analysis.analysisResult.toLowerCase().includes(query.toLowerCase())) {
        results.push(analysis);
      }
      // 搜索OCR文本
      else if (analysis.ocrText && analysis.ocrText.toLowerCase().includes(query.toLowerCase())) {
        results.push(analysis);
      }
    });
    
    setAnalysisSearchResults(results);
    console.log('[ANALYSIS_SEARCH] Found', results.length, 'results for query:', query);
  };

  // 检测语言（简单实现，实际项目中可以使用更复杂的语言检测）
  const detectLanguage = (text: string) => {
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    return hasChinese ? 'zh' : 'en';
  };

  // Auto Engine 开关切换 - 仅使用 AUTO_ENGINE_STATE

  // 处理 chatId 变化
  useEffect(() => {
    if (chatId && chatId !== boundChatId) {
      setBoundChatId(chatId);
      setError('');
      // 切换聊天时，确保面板状态为 fixed，确保面板可见
      setPanelState(prev => ({
        ...prev,
        state: 'fixed',
        isExpanded: true,
        isDocked: true
      }));
      // Auto Engine 状态 - 仅使用 AUTO_ENGINE_STATE
      
      // 重置已处理的消息ID集合
      processedMessageIdsRef.current.clear();
      // 重置防炸设计的记录
      lastAutoDraftMessageIdRef.current = {};
      lastAutoSendMessageIdRef.current = {};
      // 重置自动回复状态
      setAutoReplyStatus({
        source: '',
        basedOnMessage: null,
        status: 'idle',
        message: ''
      });
      // 重置 AI 生成状态
      setAiGenerationStatus({
        status: 'idle',
        source: null,
        model: null,
        generated_at: null,
        reply_language: null,
        source_language: null,
        draft_id: null
      });
      // 切换聊天时重置草稿相关状态
      setAiReply('');
      setInternalExplanation('');
      setDraftReply(null);
      setInternalExplanationZh(null);
      setSourceMessage(null); // 重置来源消息
      setDraftStatus('active'); // 重置草稿状态
      // 切换聊天时显示提示
      setTimeout(() => {
        setError('已切换到新的客户，会话上下文已更新');
        setTimeout(() => setError(''), 3000);
      }, 100);
    }
  }, [chatId, boundChatId]);
  
  // 监听最新客户消息变化，检测草稿是否过期
  useEffect(() => {
    // 当有新的客户消息到达时，无论自动回复是否开启，都更新来源消息状态
    if (latestCustomerMessage && chatId) {
      console.log('[MESSAGE_RECEIVED] 收到客户新消息:', latestCustomerMessage);
      
      // 更新来源消息状态
      setSourceMessage({
        message_id: latestCustomerMessage.message_id,
        sender: 'customer',
        text: latestCustomerMessage.text,
        timestamp: latestCustomerMessage.timestamp
      });
      
      // 更新最新客户消息状态，用于回复依据卡片显示
      const updatedCurrentMessage = {
        message_id: latestCustomerMessage.message_id,
        text: latestCustomerMessage.text || '图片消息',
        timestamp: latestCustomerMessage.timestamp
      };
      setCurrentLatestCustomerMessage(updatedCurrentMessage);
      console.log('[CURRENT_LATEST_MESSAGE_UPDATED]', latestCustomerMessage.message_id);
      
      // 更新autoReplyStatus.basedOnMessage状态，显示针对哪条信息生成的建议
      setAutoReplyStatus(prev => ({
        ...prev,
        basedOnMessage: {
          sender: 'customer',
          timestamp: latestCustomerMessage.timestamp,
          text: latestCustomerMessage.text || '图片消息'
        }
      }));
      console.log('[AUTO_REPLY_BASED_ON_UPDATED] 更新基于消息:', latestCustomerMessage.message_id, '内容:', latestCustomerMessage.text || '图片消息');
      console.log('[AUTO_REPLY_BASED_ON_UPDATED] 更新基于消息:', latestCustomerMessage.message_id);
      
      // 自动翻译客户消息为中文
      if (latestCustomerMessage.text && latestCustomerMessage.text.trim()) {
        console.log('[MESSAGE_TRANSLATION] 开始翻译客户消息');
        setCustomerMessageTranslation({
          target: 'zh',
          text: '',
          engine: 'deepseek',
          mode: 'auto',
          status: 'loading'
        });
        
        translateMessage(
          latestCustomerMessage.message_id,
          latestCustomerMessage.text,
          'auto',
          'zh',
          chatId
        )
          .then(translationResult => {
            console.log('[MESSAGE_TRANSLATION] 翻译完成:', translationResult);
            setCustomerMessageTranslation(translationResult);
          })
          .catch(error => {
            console.error('[MESSAGE_TRANSLATION] 翻译失败:', error);
            setCustomerMessageTranslation({
              target: 'zh',
              text: '',
              engine: 'deepseek',
              mode: 'auto',
              status: 'error'
            });
          });
      }
      
      // 当满足以下条件时，将草稿状态标记为 stale：
      // 1. 当前 chat_id 存在 draft
      // 2. draft.source.message_id 存在
      // 3. 收到新的 inbound 客户消息
      // 4. 新消息 message_id ≠ draft.source.message_id
      // 5. 新消息时间 > draft.created_at
      if (
        sourceMessage && 
        draftStatus !== 'override_confirmed' &&
        latestCustomerMessage.message_id !== sourceMessage.message_id &&
        latestCustomerMessage.timestamp > sourceMessage.timestamp
      ) {
        // 标记草稿为过期
        setDraftStatus('stale');
        console.log('[DRAFT_STALE] 草稿已过期，客户有新消息');
      }
      
      // 四层状态机逻辑由 useAutoDraftEngine 处理
      // 这里只负责检测草稿过期状态
    }
  }, [latestCustomerMessage, chatId]);

  // 处理面板展开/折叠
  const toggleExpand = () => {
    setPanelState(prev => {
      if (prev.state === 'fixed') {
        // 从fixed状态切换到float状态
        return {
          ...prev,
          state: 'float',
          isExpanded: false
        };
      } else if (prev.state === 'float') {
        // 从float状态切换到fixed状态
        return {
          ...prev,
          state: 'fixed',
          isExpanded: true
        };
      }
      return prev;
    });
  };

  // 处理固定/浮动切换
  const toggleDock = () => {
    setPanelState(prev => ({
      ...prev,
      isDocked: !prev.isDocked
    }));
    setIsFloating(prev => !prev);
  };

  // 处理弹出为独立窗口
  const openAsWindow = () => {
    const width = panelState.size.width;
    const height = panelState.size.height;
    const left = window.screenX + 100;
    const top = window.screenY + 100;

    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    const popup = window.open('', 'DeepSeekAIAssistant', features);

    if (popup) {
      popup.document.write(`
        <html>
        <head>
          <title>DeepSeek AI 助手</title>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .popup-content { padding: 20px; }
          </style>
        </head>
        <body>
          <div class="popup-content">
            <h2>DeepSeek AI 助手</h2>
            <p>当前客户：${chatId || '无'}</p>
            <p>此功能需要在主应用中使用</p>
            <button onclick="window.close()">关闭</button>
          </div>
        </body>
        </html>
      `);
      popup.document.close();
    }
  };

  // 处理关闭面板
  const handleClose = () => {
    setPanelState(prev => ({
      ...prev,
      state: 'hidden',
      isExpanded: false
    }));
  };

  // 处理面板大小调整
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - resizeStartRef.current.x;
      const deltaY = moveEvent.clientY - resizeStartRef.current.y;

      setPanelState(prev => ({
        ...prev,
        size: {
          width: Math.max(300, prev.size.width + deltaX),
          height: Math.max(400, prev.size.height + deltaY)
        }
      }));

      resizeStartRef.current = {
        x: moveEvent.clientX,
        y: moveEvent.clientY
      };
    };

    const handleMouseUp = () => {
      try {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      } catch (error) {
        console.warn('[EVENT_CLEANUP_ERROR]', error);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // 处理面板拖拽
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!panelState.isDocked) {
      e.preventDefault();
      dragStartRef.current = {
        x: e.clientX - panelState.position.x,
        y: e.clientY - panelState.position.y
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        setPanelState(prev => ({
          ...prev,
          position: {
            x: moveEvent.clientX - dragStartRef.current.x,
            y: moveEvent.clientY - dragStartRef.current.y
          }
        }));
      };

      const handleMouseUp = () => {
        try {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        } catch (error) {
          console.warn('[DRAG_EVENT_CLEANUP_ERROR]', error);
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, [panelState.isDocked, panelState.position]);

  // 处理插入文本到输入框
  const handleInsertText = (text: string) => {
    if (onInsertText) {
      onInsertText(text);
    }
  };

  // 处理清空本地脏状态（Hard Reset）
  const handleClearLocalDirtyState = () => {
    if (window.confirm('只清空本地聊天记录，不影响客户真实数据')) {
      if (typeof window.JEV_RESET_CHAT === 'function') {
        window.JEV_RESET_CHAT();
        // 重定向到当前路径加上 ?forceLeader=1
        const currentPath = window.location.pathname;
        window.location.replace(`${currentPath}?forceLeader=1`);
      }
    }
  };





  return (
    <>
      {panelState.state !== 'hidden' && (
        <div 
        ref={panelRef}
        className={`deepseek-panel ${panelState.state === 'float' ? 'floating' : panelState.state} ${panelState.isDocked ? 'docked' : 'undocked'} ${panelState.isExpanded ? 'expanded' : 'collapsed'}`}
        style={{
          position: panelState.state === 'fixed' ? 'relative' : 'fixed',
          ...(panelState.state === 'float' && {
            right: panelState.position.x,
            top: panelState.position.y,
            width: panelState.size.width,
            height: panelState.size.height,
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            borderRadius: 12
          }),
          ...(panelState.state === 'fixed' && {
            width: '100%',
            height: '100%',
            boxShadow: 'none',
            borderRadius: 0
          }),
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
        >
          <div className="deepseek-header" onClick={panelState.state === 'float' ? handleDragStart : undefined}>
            <div className="header-content">
              <div className="header-brand">
                <div className="brand-icon">🧠</div>
                <div className="brand-text">
                  <h2 className="brand-title">DeepSeek AI 助手</h2>
                  <div className="customer-info">
                    {chatId ? (
                      <span className="customer-id">{chatId}</span>
                    ) : (
                      <span className="empty-label">未选择客户</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="header-actions">
                <button 
                  className={`header-button ${panelState.isDocked ? 'active' : ''}`}
                  onClick={toggleDock}
                  title={panelState.isDocked ? '切换到浮动模式' : '切换到固定模式'}
                >
                  {panelState.isDocked ? '固定' : '浮动'}
                </button>
                <button 
                  className={`header-button ${panelState.isExpanded ? 'active' : ''}`}
                  onClick={toggleExpand}
                  title={panelState.isExpanded ? '收起面板' : '展开面板'}
                >
                  {panelState.isExpanded ? '收起' : '展开'}
                </button>
                <button 
                  className="header-button"
                  onClick={handleClearLocalDirtyState}
                  title="清空本地脏状态（Hard Reset）"
                >
                  🧹 清空本地脏状态（Hard Reset）
                </button>
                <button 
                  className="header-button close-button"
                  onClick={handleClose}
                  title="关闭面板"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
          
          <div className="deepseek-content">
            {panelState.isExpanded ? (
              <div>
                {/* 模块切换标签 */}
                <div className="deepseek-tabs">
                  <button 
                    className={`tab-button ${panelState.activeModule === 'reply' ? 'active' : ''}`}
                    onClick={() => setPanelState(prev => ({ ...prev, activeModule: 'reply' }))}
                  >
                    AI 回复
                  </button>
                  <button 
                    className={`tab-button ${panelState.activeModule === 'capabilities' ? 'active' : ''}`}
                    onClick={() => setPanelState(prev => ({ ...prev, activeModule: 'capabilities' }))}
                  >
                    能力
                  </button>
                </div>
                
                {/* 错误信息 */}
                {error && (
                  <div className="deepseek-error">
                    {error}
                  </div>
                )}
                
                {/* 回复模块 */}
                {panelState.activeModule === 'reply' && (
                  <div className="deepseek-module">
                    <h3>AI 回复</h3>
                    
                    {/* 顶部图片和识别结果区域 */}
                    <div className="image-recognition-section">
                      {/* 作用对象标识条 */}
                      <div className="action-object-identity">
                        <div className="identity-left">
                          <span className="identity-icon">🎯</span>
                          <span className="identity-text">作用对象</span>
                        </div>
                        <div className="identity-right">
                          <span className="identity-lock">🔒</span>
                          <span className="identity-chat">{chatId || '未选择客户'}</span>
                        </div>
                      </div>
                      
                      {/* 图片显示和识别结果 */}
                      {latestCustomerMessage && latestCustomerMessage.media_path && (
                        <div className="image-recognition-content">
                          <div className="recognition-image">
                            <img src={latestCustomerMessage.media_path} alt="识别图片" className="recognition-image-img" />
                          </div>
                          <div className="recognition-results">
                            <div className="recognition-title">识别结果</div>
                            <div className="recognition-text">{latestCustomerMessage.text || '正在识别...'}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* OCR分析结果 */}
                      <div className="ocr-analysis-container">
                        <DeepSeekOCRResult ocrAnalysisMap={ocrAnalysisMap} />
                      </div>
                      
                      {/* 来源消息提示区 */}
                      {(sourceMessage || autoReplyStatus.basedOnMessage) && (
                        <div className="source-message-section">
                          <div className="source-message-header">
                            <span className="source-message-icon">💬</span>
                            <span>基于客户消息生成</span>
                          </div>
                          <div className="source-message-content">
                            <div className="source-message-sender">客户</div>
                            <div className="source-message-time">{new Date((autoReplyStatus.basedOnMessage?.timestamp || sourceMessage?.timestamp || Date.now())).toLocaleString()}</div>
                            <div className="source-message-text">{autoReplyStatus.basedOnMessage?.text || sourceMessage?.text || '图片消息'}</div>
                            
                            {/* 客户消息中文翻译 */}
                            {customerMessageTranslation && (
                              <div className="source-message-translation">
                                <div className="translation-label">中文翻译</div>
                                {customerMessageTranslation.status === 'loading' ? (
                                  <div className="translation-loading">翻译中...</div>
                                ) : customerMessageTranslation.status === 'error' ? (
                                  <div className="translation-error">翻译失败</div>
                                ) : customerMessageTranslation.text ? (
                                  <div className="translation-text">{customerMessageTranslation.text}</div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 风险警告条 */}
                    {draftStatus === 'stale' && (
                      <div className="risk-warning-bar">
                        <div className="risk-warning-content">
                          <span className="risk-warning-icon">⚠️</span>
                          <div className="risk-warning-text">
                            <div className="risk-warning-main">草稿已过期</div>
                            <div className="risk-warning-sub">客户有新消息，当前草稿基于旧消息生成，可能需要重新生成。</div>
                          </div>
                        </div>
                        <div className="risk-warning-actions">
                          <button 
                            className="deepseek-button primary"
                            onClick={() => setDraftStatus('override_confirmed')}
                          >
                            忽略并继续
                          </button>
                          <button 
                            className="deepseek-button"
                            onClick={() => setAiReply('')}
                          >
                            清除草稿
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* 已确认忽略提示条 */}
                    {draftStatus === 'override_confirmed' && (
                      <div className="override-confirmed-bar">
                        <div className="override-confirmed-content">
                          <span className="override-confirmed-icon">✅</span>
                          <span className="override-confirmed-text">已确认忽略过期提示，继续使用当前草稿</span>
                        </div>
                      </div>
                    )}
                    
                    {/* 自动引擎控制区域 */}
                    <div className="auto-engine-controls">
                      <h4 className="controls-section-title">自动引擎控制</h4>
                      
                      {/* 自动回复开关 */}
                      <div className="auto-reply-switch">
                        <div className="switch-with-status">
                          <div className="switch-status-indicator">
                            <span className={`status-light ${auto_reply ? 'active' : 'inactive'}`}></span>
                          </div>
                          <div className={`auto-reply-status ${auto_reply ? 'enabled' : 'disabled'}`}>
                            自动回复: {auto_reply ? '开启' : '关闭'}
                          </div>
                        </div>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={auto_reply}
                            onChange={() => setAutoReply(!auto_reply)}
                            disabled={!chatId}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>
                      
                      {/* 自动生成开关 */}
                      <div className="auto-reply-switch">
                        <div className="switch-with-status">
                          <div className="switch-status-indicator">
                            <span className={`status-light ${auto_generate ? 'active' : 'inactive'}`}></span>
                          </div>
                          <div className={`auto-reply-status ${auto_generate ? 'enabled' : 'disabled'}`}>
                            自动生成: {auto_generate ? '开启' : '关闭'}
                          </div>
                        </div>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={auto_generate}
                            onChange={() => setAutoGenerate(!auto_generate)}
                            disabled={!chatId || !auto_reply}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>
                      
                      {/* 自动发送开关 */}
                      <div className="auto-send-switch">
                        <div className="switch-with-status">
                          <div className="switch-status-indicator">
                            <span className={`status-light ${auto_send ? 'active' : 'inactive'}`}></span>
                          </div>
                          <div className={`auto-send-status ${auto_send ? 'enabled' : 'disabled'}`}>
                            自动发送: {auto_send ? '开启' : '关闭'}
                          </div>
                        </div>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={auto_send}
                            onChange={() => setAutoSend(!auto_send)}
                            disabled={!chatId || !auto_reply || !auto_generate}
                          />
                          <span className="slider round"></span>
                        </label>
                        
                        {/* 测试按钮 */}
                        <div className="test-buttons">
                          <button 
                            onClick={() => testAutoDraft()} 
                            disabled={!chatId}
                            className="test-button"
                          >
                            测试 AutoDraft
                          </button>
                          <button 
                            onClick={() => testCountdown()} 
                            disabled={!chatId}
                            className="test-button"
                          >
                            测试 倒计时
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* 状态信息区域 */}
                    <div className="status-info-section">
                      {/* 自动回复状态信息 */}
                      {autoReplyStatus.status !== 'idle' && (
                        <div className="auto-reply-status-section">
                          <div className="auto-reply-source">
                            来源: {autoReplyStatus.source}
                          </div>
                          {autoReplyStatus.basedOnMessage && (
                            <div className="auto-reply-based-on">
                              基于消息: {autoReplyStatus.basedOnMessage.text.substring(0, 50)}{autoReplyStatus.basedOnMessage.text.length > 50 ? '...' : ''}
                            </div>
                          )}
                          <div className={`auto-reply-status-indicator ${autoReplyStatus.status}`}>
                            状态: {autoReplyStatus.status === 'generating' ? '生成中' : 
                                  autoReplyStatus.status === 'draft_generated' ? '草稿已生成' : 
                                  autoReplyStatus.status === 'sent' ? '已发送' : 
                                  autoReplyStatus.status === 'failed' ? '失败' : '空闲'}
                          </div>
                          {autoReplyStatus.message && (
                            <div className="based-on-text">
                              {autoReplyStatus.message}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* AI 生成状态 */}
                      {aiGenerationStatus.status !== 'idle' && (
                        <div className="ai-generation-status">
                          <div className={`status ${aiGenerationStatus.status}`}>
                            AI 生成: {aiGenerationStatus.status === 'generating' ? '生成中' : 
                                  aiGenerationStatus.status === 'completed' ? '已完成' : 
                                  aiGenerationStatus.status === 'unverified' ? '未验证' : '空闲'}
                          </div>
                          <div className="model-info">
                            模型: {aiGenerationStatus.model || '未知'}
                          </div>
                          <div className="language-info">
                            回复语言: {aiGenerationStatus.reply_language || '未知'}
                          </div>
                        </div>
                      )}
                    </div>
                    

                    

                    

                    
                    {/* 时间设置区域 */}
                    <div className="time-settings-section">

                    </div>
                  </div>
                )}
                
                {/* 能力模块 */}
                {panelState.activeModule === 'capabilities' && (
                  <div className="deepseek-module">
                    <h3>能力</h3>
                    <div className="capabilities-content">
                      <div className="capability-item">
                        <div className="capability-icon">🤖</div>
                        <div className="capability-info">
                          <h4>AI 回复生成</h4>
                          <p>基于客户消息生成智能回复建议</p>
                        </div>
                      </div>
                      <div className="capability-item">
                        <div className="capability-icon">🔍</div>
                        <div className="capability-info">
                          <h4>OCR 分析</h4>
                          <p>自动识别图片中的产品信息</p>
                        </div>
                      </div>
                      <div className="capability-item">
                        <div className="capability-icon">⏱️</div>
                        <div className="capability-info">
                          <h4>回复时间设置</h4>
                          <p>灵活配置回复和生成时间</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="panel-collapsed">
                点击展开面板
              </div>
            )}
          </div>
          
          {panelState.state === 'float' && (
            <div 
              className="deepseek-resize"
              ref={resizeRef}
              onMouseDown={handleResizeStart}
            />
          )}
        </div>
      )}
    </>
  );
};

export default DeepSeekPanel;
      
