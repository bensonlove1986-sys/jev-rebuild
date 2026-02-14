/**
 * Media Ingest Route
 * v3.1 极限稳定版
 * 
 * HTTP entry point for manual uploads and general media ingestion
 * Only acts as a wrapper, delegates all business logic to Media Pipeline Core
 */

import { ingestMedia, MediaSource, PipelineEnvironment } from '../core/media/media_pipeline_core';

/**
 * Media ingest request body
 */
interface MediaIngestRequest {
  /** Media source (old format) */
  source?: {
    remoteUrl?: string;
    dataUrl?: string;
  };
  /** Media source (new format) */
  media_source?: {
    type: 'dataUrl' | 'remoteUrl';
    dataUrl?: string;
    remoteUrl?: string;
  };
  /** Media metadata */
  meta?: {
    namespace: 'whatsapp' | 'ocr' | 'upload';
    direction: 'inbound' | 'outbound' | 'ocr' | 'manual';
    customerId: string;
    mediaId?: string;
    contentType?: string;
    [key: string]: any;
  };
}

/**
 * Handle media ingest request
 * @param request HTTP request
 * @param env Pipeline environment
 * @returns HTTP response
 */
export async function handleMediaIngest(
  request: Request,
  env: PipelineEnvironment
): Promise<Response> {
  try {
    // Parse request body
    let body: MediaIngestRequest;
    
    try {
      body = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON request body'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // 支持两种请求格式：
    // 1. 新格式（UI发送）: { media_source: { type: "dataUrl", dataUrl: "..." } }
    // 2. 旧格式: { source: { remoteUrl: "...", dataUrl: "..." }, meta: {...} }
    
    let mediaSource: MediaSource = {};
    let meta = body.meta;
    
    // 处理新格式（UI发送）
    if (body.media_source) {
      const { media_source, meta: bodyMeta } = body;
      
      // 验证 media_source
      if (!media_source || !media_source.type) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: media_source and media_source.type'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      // 处理 dataUrl 类型
      if (media_source.type === "dataUrl") {
        if (!media_source.dataUrl) {
          return new Response(JSON.stringify({
            error: 'Missing required field: media_source.dataUrl'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        mediaSource.dataUrl = media_source.dataUrl;
      }
      // 处理 remoteUrl 类型
      else if (media_source.type === "remoteUrl") {
        if (!media_source.remoteUrl) {
          return new Response(JSON.stringify({
            error: 'Missing required field: media_source.remoteUrl'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        mediaSource.remoteUrl = media_source.remoteUrl;
      }
      else {
        return new Response(JSON.stringify({
          error: 'Invalid media_source.type. Supported types: dataUrl, remoteUrl'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      // 使用请求中的 meta 或默认值
      meta = bodyMeta || {
        namespace: 'whatsapp',
        direction: 'outbound',
        customerId: 'unknown'
      };
    }
    // 处理旧格式
    else if (body.source) {
      const { source } = body;
      
      // 验证 source
      if (!source.remoteUrl && !source.dataUrl) {
        return new Response(JSON.stringify({
          error: 'Missing required source field: remoteUrl or dataUrl'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      mediaSource.remoteUrl = source.remoteUrl;
      mediaSource.dataUrl = source.dataUrl;
    }
    else {
      return new Response(JSON.stringify({
        error: 'Missing required fields: media_source or source'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // 验证 meta
    if (!meta || !meta.namespace || !meta.direction || !meta.customerId) {
      return new Response(JSON.stringify({
        error: 'Missing required metadata fields: namespace, direction, customerId'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Ingest media through pipeline core
    const result = await ingestMedia(env, mediaSource, meta);
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      data: {
        r2Key: result.r2Key,
        mediaPath: result.mediaPath,
        sha256: result.sha256,
        bytes: result.bytes,
        contentType: result.contentType
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error: any) {
    console.error('[MEDIA_INGEST_ERROR]', error.message);
    
    return new Response(JSON.stringify({
      error: error.message || 'Failed to ingest media'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * Handle multipart form data upload (file upload from UI)
 * @param request HTTP request
 * @param env Pipeline environment
 * @returns HTTP response
 */
export async function handleMultipartUpload(
  request: Request,
  env: PipelineEnvironment
): Promise<Response> {
  try {
    // Check if request is multipart form data
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({
        error: 'Expected multipart/form-data request'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Parse form data
    const formData = await request.formData();
    
    // Extract fields
    const file = formData.get('file') as File | null;
    const namespace = formData.get('namespace') as string;
    const direction = formData.get('direction') as string;
    const customerId = formData.get('customerId') as string;
    const mediaId = formData.get('mediaId') as string;
    
    // Validate required fields
    if (!file) {
      return new Response(JSON.stringify({
        error: 'Missing file field'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!namespace || !direction || !customerId) {
      return new Response(JSON.stringify({
        error: 'Missing required metadata fields: namespace, direction, customerId'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Read file as buffer
    const buffer = await file.arrayBuffer();
    
    // Prepare media source
    const mediaSource: MediaSource = {
      buffer
    };
    
    // Ingest media through pipeline core
    const result = await ingestMedia(env, mediaSource, {
      namespace: namespace as 'whatsapp' | 'ocr' | 'upload',
      direction: direction as 'inbound' | 'outbound' | 'ocr' | 'manual',
      customerId,
      mediaId,
      contentType: file.type
    });
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      data: {
        r2Key: result.r2Key,
        mediaPath: result.mediaPath,
        sha256: result.sha256,
        bytes: result.bytes,
        contentType: result.contentType
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error: any) {
    console.error('[MULTIPART_UPLOAD_ERROR]', error.message);
    
    return new Response(JSON.stringify({
      error: error.message || 'Failed to process file upload'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * Media ingest route handler
 * @param request HTTP request
 * @param env Pipeline environment
 * @returns HTTP response
 */
export async function mediaIngestRoute(
  request: Request,
  env: PipelineEnvironment
): Promise<Response> {
  const method = request.method;
  
  if (method === 'POST') {
    const contentType = request.headers.get('content-type');
    
    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle file upload
      return handleMultipartUpload(request, env);
    } else {
      // Handle JSON request
      return handleMediaIngest(request, env);
    }
  } else {
    return new Response('Method not allowed', {
      status: 405,
      headers: {
        'Allow': 'POST'
      }
    });
  }
}
