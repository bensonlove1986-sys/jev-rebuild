// Media ingest route for external media to R2 storage
import { ok, fail } from '../utils/response.js';
import { ingestMedia } from '../utils/media_ingest_core.js';

// Resolve media key for R2 storage
function resolveMediaKey(pathname) {
  // remove leading slash
  let key = pathname.replace(/^\/+|\/+$/g, '');

  // ===== 新结构 =====
  if (key.startsWith("api/media/r2/")) {
    return key.slice("api/media/r2/".length);
  }

  // ===== CDN 未来扩展 =====
  if (key.startsWith("api/media/cdn/")) {
    return key.slice("api/media/cdn/".length);
  }

  // ===== 旧版本兼容 =====
  if (key.startsWith("media/")) {
    return key.slice("media/".length);
  }

  // fallback（保持现有行为）
  return key;
}

export async function handleMediaIngest(request, env, ctx) {
  console.log('[MEDIA_INGEST_START]');
  
  try {
    // Parse request body
    const body = await request.json();
    console.log('[MEDIA_INGEST_REQUEST]', body);
    
    let source = body.source;
    let meta = body.meta;
    
    // 支持新格式（UI发送）: { media_source: { type: "dataUrl", dataUrl: "..." } }
    if (body.media_source) {
      const { media_source, meta: bodyMeta } = body;
      
      if (!media_source || !media_source.type) {
        return fail(request, 'INVALID_MEDIA_SOURCE', 400, {
          error: 'Missing required fields: media_source and media_source.type'
        });
      }
      
      // 转换为旧格式的source结构
      source = {};
      if (media_source.type === "dataUrl") {
        if (!media_source.dataUrl) {
          return fail(request, 'MISSING_DATA_URL', 400, {
            error: 'Missing required field: media_source.dataUrl'
          });
        }
        source.dataUrl = media_source.dataUrl;
      } else if (media_source.type === "remoteUrl") {
        if (!media_source.remoteUrl) {
          return fail(request, 'MISSING_REMOTE_URL', 400, {
            error: 'Missing required field: media_source.remoteUrl'
          });
        }
        source.remoteUrl = media_source.remoteUrl;
      }
      
      // 使用请求中的meta或默认值
      if (bodyMeta) {
        meta = bodyMeta;
      }
    }
    
    if (!source) {
      return fail(request, 'MISSING_SOURCE', 400, {
        error: 'Missing media source'
      });
    }
    
    // Ingest media
    const result = await ingestMedia(env, source, meta);
    
    // Return success response
    return ok(request, {
      media_path: result.media_path,
      r2Key: result.r2Key
    });
    
  } catch (error) {
    console.error('[MEDIA_INGEST_ERROR]', error.message);
    return fail(request, 'INGEST_ERROR', 500, {
      error: error.message
    });
  }
}
