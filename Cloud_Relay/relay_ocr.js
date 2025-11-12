// JEV Cloud Relay v11.0 - OCR Module
// 图像识别与OCR

const https = require('https');
const fs = require('fs');
const path = require('path');

class RelayOCR {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.googleAPIKey = config.google_api_key;
  }

  async extractText(imageUrl) {
    try {
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('无效的图像URL');
      }

      // 使用Google Vision API进行OCR
      const result = await this.callGoogleVisionAPI(imageUrl);
      
      // 结构化提取信息
      const structuredData = this.structureOCRResult(result);
      
      // 记录OCR结果
      this.logOCRResult(imageUrl, structuredData);
      
      return structuredData;
    } catch (error) {
      this.logger.logError('OCR错误:', error);
      return {
        text: '',
        structured: {},
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async callGoogleVisionAPI(imageUrl) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        requests: [{
          image: {
            source: {
              imageUri: imageUrl
            }
          },
          features: [{
            type: 'TEXT_DETECTION'
          }, {
            type: 'LABEL_DETECTION',
            maxResults: 5
          }]
        }]
      });

      const options = {
        hostname: 'vision.googleapis.com',
        path: `/v1/images:annotate?key=${this.googleAPIKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200 && response.responses && response.responses[0]) {
              resolve(response.responses[0]);
            } else {
              reject(new Error(`API错误: ${response.error ? response.error.message : '未知错误'}`));
            }
          } catch (error) {
            reject(new Error('解析API响应失败'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  structureOCRResult(apiResult) {
    const fullText = apiResult.fullTextAnnotation ? apiResult.fullTextAnnotation.text : '';
    const textBlocks = [];
    const detectedLanguages = new Set();
    
    // 提取文本块
    if (apiResult.textAnnotations && apiResult.textAnnotations.length > 0) {
      for (let i = 1; i < apiResult.textAnnotations.length; i++) { // 跳过第一个（全文）
        const annotation = apiResult.textAnnotations[i];
        textBlocks.push({
          text: annotation.description,
          boundingBox: this.extractBoundingBox(annotation.boundingPoly),
          confidence: annotation.confidence || 'medium'
        });
        
        // 提取语言
        if (annotation.detectedLanguages) {
          annotation.detectedLanguages.forEach(lang => {
            detectedLanguages.add(lang.languageCode);
          });
        }
      }
    }

    // 提取标签
    const labels = [];
    if (apiResult.labelAnnotations) {
      labels.push(...apiResult.labelAnnotations.map(label => ({
        description: label.description,
        score: label.score
      })));
    }

    // 结构化提取产品信息
    const productInfo = this.extractProductInfo(fullText);

    return {
      text: fullText,
      structured: {
        textBlocks: textBlocks,
        languages: Array.from(detectedLanguages),
        labels: labels,
        product: productInfo,
        confidence: apiResult.fullTextAnnotation ? 'high' : 'medium'
      },
      rawData: apiResult,
      timestamp: new Date().toISOString()
    };
  }

  extractBoundingBox(boundingPoly) {
    if (!boundingPoly || !boundingPoly.vertices) {
      return null;
    }
    return boundingPoly.vertices.map(vertex => ({
      x: vertex.x || 0,
      y: vertex.y || 0
    }));
  }

  extractProductInfo(text) {
    const productInfo = {
      modelNumber: this.extractModelNumber(text),
      productName: this.extractProductName(text),
      price: this.extractPrice(text),
      quantity: this.extractQuantity(text),
      description: this.extractDescription(text)
    };
    
    return productInfo;
  }

  extractModelNumber(text) {
    // 常见型号格式匹配
    const modelPatterns = [
      /[A-Z]{1,4}-[A-Z0-9]{3,10}(-[A-Z0-9]+)?/g, // 例如 E2E-X3D1-N
      /[A-Z]{2,6}[0-9]{3,8}/g, // 例如 FX3U16MR
      /[A-Z]{1,3}-[0-9]{2,4}/g // 例如 C-200
    ];
    
    for (const pattern of modelPatterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        return match[0].trim();
      }
    }
    
    return null;
  }

  extractProductName(text) {
    // 简单的产品名提取逻辑
    // 实际应用中可能需要更复杂的NLP处理
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 50 && !/^\d+/.test(trimmed)) {
        return trimmed;
      }
    }
    return null;
  }

  extractPrice(text) {
    const pricePattern = /(?:\$|USD|EUR|¥|元|USD\s*\$)\s*(\d+(?:\.\d{2})?)/gi;
    const match = text.match(pricePattern);
    if (match) {
      return match[0].trim();
    }
    return null;
  }

  extractQuantity(text) {
    const quantityPattern = /(?:quantity|数量|Qty|QTY|qty)\s*[:：]?\s*(\d+)/gi;
    const match = text.match(quantityPattern);
    if (match) {
      const numMatch = match[0].match(/\d+/);
      return numMatch ? parseInt(numMatch[0]) : null;
    }
    return null;
  }

  extractDescription(text) {
    // 尝试提取描述性文本
    const lines = text.split('\n');
    const descriptions = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 20 && !/^\d+\.?\d*$/.test(trimmed)) {
        descriptions.push(trimmed);
      }
    }
    
    return descriptions.slice(0, 2).join(' ');
  }

  logOCRResult(imageUrl, result) {
    try {
      const logEntry = {
        image_url: imageUrl,
        text_extracted: result.text.length > 0,
        text_length: result.text.length,
        product_detected: !!result.structured.product.modelNumber,
        languages: result.structured.languages,
        timestamp: new Date().toISOString()
      };

      this.logger.logRelay(`OCR处理完成: ${imageUrl}, 文本长度: ${result.text.length}`);
    } catch (error) {
      this.logger.logError('记录OCR日志失败:', error);
    }
  }

  // 批量处理图像
  async batchExtractText(imageUrls) {
    if (!Array.isArray(imageUrls)) {
      throw new Error('输入必须是图像URL数组');
    }

    const results = await Promise.all(
      imageUrls.map(url => this.extractText(url))
    );

    return {
      results: results,
      total: results.length,
      successCount: results.filter(r => !r.error).length,
      timestamp: new Date().toISOString()
    };
  }

  // 本地文件OCR（需要先上传到可访问的URL）
  async extractFromLocalFile(filePath) {
    // 注意：实际应用中需要先将本地文件上传到临时存储
    // 这里仅作为示例接口
    throw new Error('本地文件OCR需要文件上传功能支持');
  }

  // 获取OCR处理统计
  getOCRStatistics() {
    // 可以实现统计功能，记录成功/失败次数等
    return {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = RelayOCR;