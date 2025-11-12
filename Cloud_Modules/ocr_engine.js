/**
 * JEV Plugin v2.0 - 图片识别 + OCR 模块
 * 支持Google Vision或自建API进行图片文字识别
 */

// OCR服务配置
const OCR_CONFIG = {
  services: [
    {
      name: 'google_vision',
      endpoint: 'https://vision.googleapis.com/v1/images:annotate',
      key: process.env.GOOGLE_VISION_API_KEY || 'placeholder',
      priority: 1
    },
    {
      name: 'cloudflare_r2',
      endpoint: 'https://jevshop.workers.dev/api/ocr',
      key: process.env.CLOUDFLARE_API_KEY || 'placeholder',
      priority: 2
    },
    {
      name: 'local_ocr',
      endpoint: 'https://jevshop.workers.dev/api/local-ocr',
      priority: 3
    }
  ],
  supported_languages: [
    'en', 'zh', 'zh-Hant', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru', 
    'it', 'nl', 'pl', 'tr', 'ar', 'hi', 'th', 'vi'
  ],
  max_image_size: 10 * 1024 * 1024, // 10MB
  supported_formats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'pdf']
};

// 缓存管理
const ocrCache = new Map();
const MAX_CACHE_ITEMS = 100;
const CACHE_TTL = 3600000; // 1小时

// 图片URL验证函数
function validateImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('Invalid image URL');
  }
  
  // 检查URL格式
  try {
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Image URL must use HTTP or HTTPS protocol');
    }
    
    // 检查文件扩展名
    const pathname = url.pathname.toLowerCase();
    const hasValidExtension = OCR_CONFIG.supported_formats.some(format => 
      pathname.endsWith(`.${format}`)
    );
    
    if (!hasValidExtension) {
      throw new Error(`Unsupported image format. Supported formats: ${OCR_CONFIG.supported_formats.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    throw new Error(`Invalid image URL: ${error.message}`);
  }
}

// 获取缓存键
function getCacheKey(imageUrl, options = {}) {
  const optionString = JSON.stringify(options);
  return `${imageUrl}_${optionString}`;
}

// 从缓存获取结果
function getFromCache(cacheKey) {
  const cached = ocrCache.get(cacheKey);
  if (cached) {
    // 检查是否过期
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      ocrCache.delete(cacheKey);
      return null;
    }
    return cached.data;
  }
  return null;
}

// 添加到缓存
function addToCache(cacheKey, data) {
  // 限制缓存大小
  if (ocrCache.size >= MAX_CACHE_ITEMS) {
    // 删除最旧的缓存项
    const oldestKey = ocrCache.keys().next().value;
    ocrCache.delete(oldestKey);
  }
  
  ocrCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

// 清理过期缓存
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of ocrCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      ocrCache.delete(key);
    }
  }
}

// 定期清理缓存
setInterval(cleanupCache, 300000); // 每5分钟清理一次

// 下载图片并转换为Base64
async function downloadImageAsBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'JEV-Plugin-OCR-Engine/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    
    // 检查内容长度
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > OCR_CONFIG.max_image_size) {
      throw new Error(`Image too large. Maximum size is ${OCR_CONFIG.max_image_size / (1024 * 1024)}MB`);
    }
    
    const blob = await response.blob();
    
    // 再次检查大小
    if (blob.size > OCR_CONFIG.max_image_size) {
      throw new Error(`Image too large. Maximum size is ${OCR_CONFIG.max_image_size / (1024 * 1024)}MB`);
    }
    
    // 转换为Base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1]; // 移除 'data:image/type;base64,' 部分
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[ocr_engine] Image download failed:', error);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

// 使用Google Vision进行OCR
async function ocrWithGoogleVision(imageUrl, options = {}) {
  const config = OCR_CONFIG.services.find(s => s.name === 'google_vision');
  if (!config || !config.key || config.key === 'placeholder') {
    throw new Error('Google Vision service not configured');
  }
  
  try {
    // 下载图片并转换为Base64
    const base64Image = await downloadImageAsBase64(imageUrl);
    
    // 构建请求体
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image
          },
          features: [
            {
              type: 'TEXT_DETECTION'
            },
            {
              type: 'DOCUMENT_TEXT_DETECTION'
            },
            {
              type: 'LANGUAGE_DETECTION'
            }
          ]
        }
      ]
    };
    
    // 如果指定了语言，添加到请求中
    if (options.languageHints && Array.isArray(options.languageHints)) {
      requestBody.requests[0].imageContext = {
        languageHints: options.languageHints.filter(lang => 
          OCR_CONFIG.supported_languages.includes(lang)
        )
      };
    }
    
    const response = await fetch(`${config.endpoint}?key=${config.key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google Vision API error: ${response.status}, ${errorData.error?.message || ''}`);
    }
    
    const data = await response.json();
    
    // 解析响应
    return parseGoogleVisionResponse(data);
  } catch (error) {
    console.error('[ocr_engine] Google Vision OCR failed:', error);
    throw error;
  }
}

// 解析Google Vision响应
function parseGoogleVisionResponse(response) {
  const result = {
    text_blocks: [],
    full_text: '',
    confidence: 0,
    lang: 'unknown',
    blocks_count: 0
  };
  
  try {
    const responseData = response.responses[0];
    
    if (!responseData) {
      return result;
    }
    
    // 提取语言信息
    if (responseData.languageHints) {
      result.lang = responseData.languageHints[0] || 'unknown';
    }
    
    // 使用文档文本检测结果（更详细）
    if (responseData.fullTextAnnotation) {
      const fullText = responseData.fullTextAnnotation;
      result.full_text = fullText.text || '';
      result.confidence = fullText.confidence || 0.8;
      
      // 提取文本块
      if (fullText.pages && fullText.pages.length > 0) {
        fullText.pages.forEach(page => {
          if (page.blocks) {
            page.blocks.forEach(block => {
              if (block.paragraphs) {
                block.paragraphs.forEach(paragraph => {
                  if (paragraph.words) {
                    const text = paragraph.words.map(word => 
                      word.symbols.map(symbol => symbol.text).join('')
                    ).join(' ');
                    
                    // 提取坐标信息
                    let bounds = [];
                    if (paragraph.boundingBox && paragraph.boundingBox.vertices) {
                      bounds = paragraph.boundingBox.vertices.map(vertex => ({
                        x: vertex.x || 0,
                        y: vertex.y || 0
                      }));
                    }
                    
                    result.text_blocks.push({
                      text,
                      confidence: paragraph.confidence || 0.8,
                      bounds,
                      type: 'paragraph'
                    });
                  }
                });
              }
            });
          }
        });
      }
    } else if (responseData.textAnnotations) {
      // 使用普通文本检测结果
      result.full_text = responseData.textAnnotations[0]?.description || '';
      
      // 从第二个元素开始是各个文本块
      const blocks = responseData.textAnnotations.slice(1);
      result.text_blocks = blocks.map(block => ({
        text: block.description,
        confidence: 0.7, // Google Vision不直接提供单个块的置信度
        bounds: block.boundingPoly?.vertices?.map(vertex => ({
          x: vertex.x || 0,
          y: vertex.y || 0
        })) || [],
        type: 'text'
      }));
    }
    
    result.blocks_count = result.text_blocks.length;
    
  } catch (error) {
    console.error('[ocr_engine] Failed to parse Google Vision response:', error);
  }
  
  return result;
}

// 使用Cloudflare R2 OCR
async function ocrWithCloudflareR2(imageUrl, options = {}) {
  const config = OCR_CONFIG.services.find(s => s.name === 'cloudflare_r2');
  if (!config) {
    throw new Error('Cloudflare R2 OCR service not configured');
  }
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // 添加API密钥（如果有）
    if (config.key && config.key !== 'placeholder') {
      headers['Authorization'] = `Bearer ${config.key}`;
    }
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        imageUrl,
        options
      })
    });
    
    if (!response.ok) {
      throw new Error(`Cloudflare R2 OCR error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 确保返回格式符合规范
    return {
      text_blocks: data.text_blocks || [],
      full_text: data.full_text || '',
      confidence: data.confidence || 0.7,
      lang: data.lang || 'unknown',
      blocks_count: data.text_blocks?.length || 0
    };
  } catch (error) {
    console.error('[ocr_engine] Cloudflare R2 OCR failed:', error);
    throw error;
  }
}

// 使用本地OCR（备用方案）
async function ocrWithLocalService(imageUrl, options = {}) {
  const config = OCR_CONFIG.services.find(s => s.name === 'local_ocr');
  if (!config) {
    throw new Error('Local OCR service not configured');
  }
  
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl,
        options
      })
    });
    
    if (!response.ok) {
      throw new Error(`Local OCR service error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      text_blocks: data.text_blocks || [],
      full_text: data.full_text || '',
      confidence: data.confidence || 0.6,
      lang: data.lang || 'unknown',
      blocks_count: data.text_blocks?.length || 0
    };
  } catch (error) {
    console.error('[ocr_engine] Local OCR failed:', error);
    throw error;
  }
}

// 简单的备用OCR（如果所有服务都失败）
async function fallbackOCR(imageUrl) {
  console.log('[ocr_engine] Using fallback OCR');
  
  // 返回一个基本的响应结构
  return {
    text_blocks: [],
    full_text: '',
    confidence: 0.1,
    lang: 'unknown',
    blocks_count: 0,
    fallback: true
  };
}

// 主OCR分析函数
async function analyzeImage(imageUrl, options = {}) {
  try {
    // 验证图片URL
    validateImageUrl(imageUrl);
    
    // 检查缓存
    const cacheKey = getCacheKey(imageUrl, options);
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        from_cache: true
      };
    }
    
    // 按优先级尝试不同的OCR服务
    let ocrResult = null;
    const ocrServices = [
      { service: ocrWithGoogleVision },
      { service: ocrWithCloudflareR2 },
      { service: ocrWithLocalService },
      { service: fallbackOCR }
    ];
    
    for (const { service } of ocrServices) {
      try {
        ocrResult = await service(imageUrl, options);
        if (ocrResult && (ocrResult.full_text || ocrResult.text_blocks.length > 0)) {
          break;
        }
      } catch (error) {
        console.log(`[ocr_engine] Trying next OCR service: ${error.message}`);
      }
    }
    
    if (!ocrResult) {
      throw new Error('All OCR services failed');
    }
    
    // 添加到缓存
    addToCache(cacheKey, ocrResult);
    
    // 返回符合规范的结果
    return {
      text_blocks: ocrResult.text_blocks,
      confidence: ocrResult.confidence,
      lang: ocrResult.lang,
      from_cache: false
    };
  } catch (error) {
    console.error('[ocr_engine] Image analysis error:', error);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}

// 获取支持的语言列表
function getSupportedLanguages() {
  return OCR_CONFIG.supported_languages;
}

// 健康检查
async function healthCheck() {
  try {
    return {
      status: 'healthy',
      supported_services: OCR_CONFIG.services.map(s => s.name),
      supported_languages: OCR_CONFIG.supported_languages.length,
      cache_size: ocrCache.size,
      max_cache_size: MAX_CACHE_ITEMS,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[ocr_engine] Health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// 清理所有缓存
function clearCache() {
  ocrCache.clear();
  console.log('[ocr_engine] Cache cleared');
}

// 模块导出
module.exports = {
  analyzeImage,
  getSupportedLanguages,
  healthCheck,
  clearCache,
  OCR_CONFIG
};

// 导出为ES模块
exports.default = {
  analyzeImage,
  getSupportedLanguages,
  healthCheck,
  clearCache,
  OCR_CONFIG
};
