// MEDIA_STORE_R2.js - 媒体文件权威存储

/**
 * MEDIA_STORE_R2 - 媒体文件权威存储
 * 负责管理 R2 存储中的媒体文件，确保写入顺序和文件完整性
 */
export class MEDIA_STORE_R2 {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.r2 = env.R2_BUCKET; // 假设环境变量中配置了 R2_BUCKET
  }

  /**
   * 生成 R2 媒体文件键
   * @param {string} messageId 消息 ID
   * @param {number} index 文件索引
   * @param {string} extension 文件扩展名
   * @returns {string} R2 键
   */
  generateMediaKey(messageId, index = 0, extension = 'jpg') {
    return `media/twilio/${messageId}/${index}.${extension}`;
  }

  /**
   * 从文件路径提取文件扩展名
   * @param {string} filename 文件名
   * @returns {string} 文件扩展名
   */
  extractExtension(filename) {
    if (!filename) return 'bin';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin';
  }

  /**
   * 上传媒体文件到 R2
   * @param {string} messageId 消息 ID
   * @param {Buffer|ReadableStream} fileData 文件数据
   * @param {string} filename 文件名
   * @param {number} index 文件索引
   * @returns {Object} 上传结果
   */
  async uploadMedia(messageId, fileData, filename, index = 0) {
    if (!this.r2) {
      console.error('[MEDIA_STORE_R2_ERROR] R2_BUCKET not configured');
      return {
        ok: false,
        error: 'R2_BUCKET_NOT_CONFIGURED'
      };
    }

    const extension = this.extractExtension(filename);
    const mediaKey = this.generateMediaKey(messageId, index, extension);

    try {
      console.log('[MEDIA_STORE_R2_UPLOAD] Uploading file:', mediaKey);

      // 上传到 R2
      const uploadResult = await this.r2.put(mediaKey, fileData, {
        httpMetadata: {
          contentType: this.getContentType(extension),
          contentDisposition: `inline; filename="${encodeURIComponent(filename)}"`
        },
        customMetadata: {
          messageId,
          uploadedAt: Date.now().toString(),
          filename
        }
      });

      console.log('[MEDIA_STORE_R2_UPLOAD_SUCCESS] Uploaded file:', mediaKey);

      return {
        ok: true,
        media_key: mediaKey,
        filename,
        size: uploadResult.size || 0,
        uploaded_at: Date.now()
      };
    } catch (error) {
      console.error('[MEDIA_STORE_R2_UPLOAD_ERROR]', error.message, 'Key:', mediaKey);
      return {
        ok: false,
        error: error.message,
        media_key: mediaKey
      };
    }
  }

  /**
   * 批量上传媒体文件
   * @param {string} messageId 消息 ID
   * @param {Array} files 文件数组 [{ fileData, filename }]
   * @returns {Object} 批量上传结果
   */
  async uploadMultipleMedia(messageId, files) {
    const uploadResults = [];
    const successfulMediaKeys = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.uploadMedia(messageId, file.fileData, file.filename, i);
      
      uploadResults.push(result);
      
      if (result.ok) {
        successfulMediaKeys.push(result.media_key);
      }
    }

    return {
      ok: uploadResults.every(r => r.ok),
      results: uploadResults,
      media_keys: successfulMediaKeys,
      total: files.length,
      successful: successfulMediaKeys.length
    };
  }

  /**
   * 从 R2 下载媒体文件
   * @param {string} mediaKey R2 媒体键
   * @returns {Object} 文件数据和元数据
   */
  async downloadMedia(mediaKey) {
    if (!this.r2) {
      console.error('[MEDIA_STORE_R2_ERROR] R2_BUCKET not configured');
      return {
        ok: false,
        error: 'R2_BUCKET_NOT_CONFIGURED'
      };
    }

    try {
      console.log('[MEDIA_STORE_R2_DOWNLOAD] Downloading file:', mediaKey);

      const object = await this.r2.get(mediaKey);
      
      if (!object) {
        console.error('[MEDIA_STORE_R2_DOWNLOAD_ERROR] File not found:', mediaKey);
        return {
          ok: false,
          error: 'FILE_NOT_FOUND'
        };
      }

      const fileData = await object.arrayBuffer();
      const metadata = object.httpMetadata;
      const customMetadata = object.customMetadata;

      console.log('[MEDIA_STORE_R2_DOWNLOAD_SUCCESS] Downloaded file:', mediaKey, 'Size:', fileData.byteLength);

      return {
        ok: true,
        fileData: Buffer.from(fileData),
        metadata,
        customMetadata,
        media_key: mediaKey,
        size: fileData.byteLength
      };
    } catch (error) {
      console.error('[MEDIA_STORE_R2_DOWNLOAD_ERROR]', error.message, 'Key:', mediaKey);
      return {
        ok: false,
        error: error.message
      };
    }
  }

  /**
   * 删除 R2 媒体文件
   * @param {string} mediaKey R2 媒体键
   * @returns {Object} 删除结果
   */
  async deleteMedia(mediaKey) {
    if (!this.r2) {
      console.error('[MEDIA_STORE_R2_ERROR] R2_BUCKET not configured');
      return {
        ok: false,
        error: 'R2_BUCKET_NOT_CONFIGURED'
      };
    }

    try {
      console.log('[MEDIA_STORE_R2_DELETE] Deleting file:', mediaKey);

      await this.r2.delete(mediaKey);

      console.log('[MEDIA_STORE_R2_DELETE_SUCCESS] Deleted file:', mediaKey);

      return {
        ok: true,
        media_key: mediaKey
      };
    } catch (error) {
      console.error('[MEDIA_STORE_R2_DELETE_ERROR]', error.message, 'Key:', mediaKey);
      return {
        ok: false,
        error: error.message
      };
    }
  }

  /**
   * 检查 R2 媒体文件是否存在
   * @param {string} mediaKey R2 媒体键
   * @returns {Object} 检查结果
   */
  async checkMediaExists(mediaKey) {
    if (!this.r2) {
      console.error('[MEDIA_STORE_R2_ERROR] R2_BUCKET not configured');
      return {
        ok: false,
        error: 'R2_BUCKET_NOT_CONFIGURED',
        exists: false
      };
    }

    try {
      console.log('[MEDIA_STORE_R2_CHECK] Checking file existence:', mediaKey);

      const object = await this.r2.head(mediaKey);
      const exists = !!object;

      console.log('[MEDIA_STORE_R2_CHECK_RESULT] File exists:', mediaKey, exists);

      return {
        ok: true,
        exists: exists,
        media_key: mediaKey
      };
    } catch (error) {
      console.error('[MEDIA_STORE_R2_CHECK_ERROR]', error.message, 'Key:', mediaKey);
      return {
        ok: false,
        error: error.message,
        exists: false
      };
    }
  }

  /**
   * 根据文件扩展名获取内容类型
   * @param {string} extension 文件扩展名
   * @returns {string} 内容类型
   */
  getContentType(extension) {
    const contentTypeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json'
    };

    return contentTypeMap[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * HTTP 请求处理
   * @param {Request} request HTTP 请求
   * @returns {Response} HTTP 响应
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log('[MEDIA_STORE_R2_FETCH] Received request:', { method, path });

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // /upload - 上传媒体文件
    if (method === 'POST' && path === '/upload') {
      try {
        const formData = await request.formData();
        const messageId = formData.get('message_id');
        const file = formData.get('file');
        const filename = formData.get('filename') || file.name;
        const index = parseInt(formData.get('index') || '0');

        if (!messageId || !file) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'MISSING_REQUIRED_PARAMS'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // 读取文件数据
        const fileData = await file.arrayBuffer();
        const result = await this.uploadMedia(messageId, Buffer.from(fileData), filename, index);

        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[MEDIA_STORE_R2_UPLOAD_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /download/:mediaKey - 下载媒体文件
    if (method === 'GET' && path.match(/^\/download\//)) {
      try {
        const mediaKey = path.substring(10); // 移除 '/download/' 前缀
        const result = await this.downloadMedia(mediaKey);

        if (!result.ok) {
          return new Response(JSON.stringify(result), {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        return new Response(result.fileData, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': result.metadata?.contentType || 'application/octet-stream',
            'Content-Length': result.size.toString()
          }
        });
      } catch (error) {
        console.error('[MEDIA_STORE_R2_DOWNLOAD_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /delete - 删除媒体文件
    if (method === 'DELETE' && path === '/delete') {
      try {
        const data = await request.json();
        const mediaKey = data.media_key;

        if (!mediaKey) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'MISSING_MEDIA_KEY'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        const result = await this.deleteMedia(mediaKey);

        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[MEDIA_STORE_R2_DELETE_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /check - 检查媒体文件是否存在
    if (method === 'GET' && path === '/check') {
      try {
        const mediaKey = url.searchParams.get('media_key');

        if (!mediaKey) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'MISSING_MEDIA_KEY'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        const result = await this.checkMediaExists(mediaKey);

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[MEDIA_STORE_R2_CHECK_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // 404
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }
}

/**
 * MEDIA_STORE_R2 工厂函数
 * @param {Object} env 环境变量
 * @returns {Function} R2 存储构造函数
 */
export function createMediaStoreR2(env) {
  return class extends MEDIA_STORE_R2 {
    constructor(state) {
      super(state, env);
    }
  };
}
