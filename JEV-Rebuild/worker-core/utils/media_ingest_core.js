// Core media ingest functionality
// Handles: dataUrl → buffer → R2.put
//          remoteUrl → fetch → buffer → R2.put

// Generate deterministic R2 key
function generateR2Key(meta = {}) {
  const customerId = meta.customer_id || 'unknown';
  const mediaId = meta.media_id || `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return `whatsapp/outbound/${customerId}/${mediaId}`;
}

// Process data URL
async function processDataUrl(dataUrl) {
  try {
    // Extract content type and base64 data
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid data URL format');
    }
    
    const contentType = matches[1];
    const base64Data = matches[2];
    
    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Data);
    const length = binaryString.length;
    const arrayBuffer = new ArrayBuffer(length);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    
    return {
      buffer: arrayBuffer,
      contentType
    };
    
  } catch (error) {
    throw new Error(`Failed to process data URL: ${error.message}`);
  }
}

// Process remote URL
async function processRemoteUrl(remoteUrl) {
  try {
    const response = await fetch(remoteUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch remote URL: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    console.log('[MEDIA_V3_FETCH_OK]', {
      status: response.status,
      'content-type': contentType,
      bytes: buffer.byteLength
    });
    
    return {
      buffer,
      contentType
    };
    
  } catch (error) {
    throw new Error(`Failed to process remote URL: ${error.message}`);
  }
}

/**
 * Ingest media to R2 storage
 * @param {Object} env - Environment variables
 * @param {Object} source - Media source { dataUrl?, remoteUrl? }
 * @param {Object} meta - Metadata { customer_id?, media_id? }
 * @returns {Promise<Object>} { r2Key, media_path }
 */
export async function ingestMedia(env, source, meta = {}) {
  if (!env.R2_BUCKET) {
    throw new Error('R2 bucket not configured');
  }
  
  let buffer, contentType;
  
  // Determine source type
  if (source.dataUrl) {
    const result = await processDataUrl(source.dataUrl);
    buffer = result.buffer;
    contentType = result.contentType;
  } else if (source.remoteUrl) {
    const result = await processRemoteUrl(source.remoteUrl);
    buffer = result.buffer;
    contentType = result.contentType;
  } else {
    throw new Error('No valid media source provided');
  }
  
  // Generate R2 key
  const r2Key = generateR2Key(meta);
  console.log("[MEDIA_V3_INGEST_START]", r2Key);
  
  try {
    // Store to R2
    await env.R2_BUCKET.put(r2Key, buffer, {
      httpMetadata: {
        contentType: contentType
      }
    });
    
    console.log("[MEDIA_V3_R2_PUT_OK]", r2Key);
    
    // Generate media_path (used by UI)
    const media_path = `/api/media/r2/${r2Key}`;
    console.log("[MEDIA_V3_PATH]", media_path);
    
    return {
      r2Key,
      media_path
    };
    
  } catch (error) {
    console.error('[MEDIA_INGEST_STORAGE_ERROR]', {
      error: error.message,
      r2Key: r2Key
    });
    throw new Error(`Failed to store media to R2: ${error.message}`);
  }
}
