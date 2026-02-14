import { ok, fail } from '../utils/response.js';

/**
 * Handles image upload requests - Force stable version
 * @param {Request} request - The incoming request
 * @param {Object} env - The environment object containing R2 bucket and domain
 * @returns {Response} - The response object
 */
export async function handleImageUpload(request, env) {
  try {
    // Log upload request with method
    console.log('[IMAGE_UPLOAD_REQUEST]', request.method);

    // Check if method is POST
    if (request.method !== 'POST') {
      console.log('[IMAGE_UPLOAD_METHOD_NOT_ALLOWED]', request.method);
      return fail(request, 'METHOD_NOT_ALLOWED', 405);
    }

    let file, fileType, ext;
    const contentType = request.headers.get('content-type');
    
    // Support both multipart/form-data and JSON base64 formats
    if (contentType && contentType.includes('multipart/form-data')) {
      console.log('[IMAGE_UPLOAD_CONTENT_TYPE] multipart/form-data');
      // Parse the multipart form data
      const formData = await request.formData();
      file = formData.get('file');

      // Validate file
      if (!file || typeof file === 'string') {
        console.log('[IMAGE_UPLOAD_NO_FILE]', typeof file);
        return fail(request, 'NO_FILE', 400);
      }

      // Get file metadata
      fileType = file.type;
      ext = fileType?.split('/')[1] || 'png';
      console.log('[IMAGE_UPLOAD_FILE_INFO]', { type: fileType, ext });
    } else if (contentType && contentType.includes('application/json')) {
      console.log('[IMAGE_UPLOAD_CONTENT_TYPE] application/json (base64)');
      // Parse JSON request body
      const body = await request.json();
      const { base64: base64Data, customer_id, mime_type } = body;
      
      // Validate required fields
      if (!base64Data || typeof base64Data !== 'string') {
        console.log('[IMAGE_UPLOAD_NO_BASE64]', typeof base64Data);
        return fail(request, 'NO_BASE64_DATA', 400);
      }
      
      if (!customer_id || typeof customer_id !== 'string') {
        console.log('[IMAGE_UPLOAD_NO_CUSTOMER_ID]', typeof customer_id);
        return fail(request, 'NO_CUSTOMER_ID', 400);
      }
      
      // Extract file type
      let base64Match;
      let base64Content;
      
      if (base64Data.startsWith('data:')) {
        // Regular base64 with data URL prefix
        base64Match = base64Data.match(/^data:(.+);base64,(.+)$/);
        if (!base64Match) {
          console.log('[IMAGE_UPLOAD_INVALID_BASE64]', base64Data.slice(0, 50));
          return fail(request, 'INVALID_BASE64_FORMAT', 400);
        }
        
        fileType = mime_type || base64Match[1];
        base64Content = base64Match[2];
      } else {
        // Raw base64 without prefix, use provided mime_type
        if (!mime_type || typeof mime_type !== 'string') {
          console.log('[IMAGE_UPLOAD_NO_MIME_TYPE] Missing mime_type for raw base64');
          return fail(request, 'NO_MIME_TYPE', 400);
        }
        
        fileType = mime_type;
        base64Content = base64Data;
      }
      
      ext = fileType?.split('/')[1] || 'png';
      console.log('[IMAGE_UPLOAD_BASE64_INFO]', { customer_id, type: fileType, ext, size: base64Content.length });
      
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create Blob from ArrayBuffer
      file = new Blob([bytes], { type: fileType });
      console.log('[IMAGE_UPLOAD_BASE64_INFO]', { type: fileType, ext, size: file.size });
    } else {
      console.log('[IMAGE_UPLOAD_INVALID_CONTENT_TYPE]', contentType);
      return fail(request, 'INVALID_CONTENT_TYPE', 400);
    }

    // Generate a unique key for the R2 bucket
    const key = `images/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    console.log('[IMAGE_UPLOAD_KEY]', key);
    
    // 防御性检查：确保key不包含完整URL
    if (key.startsWith('http://') || key.startsWith('https://')) {
      console.error('[IMAGE_UPLOAD_KEY_ERROR] Key contains full URL:', key);
      return fail(request, 'INVALID_KEY_FORMAT', 500);
    }
    
    // 防御性检查：确保key格式正确，以images/开头
    if (!key.startsWith('images/')) {
      console.error('[IMAGE_UPLOAD_KEY_ERROR] Key does not start with images/:', key);
      return fail(request, 'INVALID_KEY_FORMAT', 500);
    }

    // Check if R2_BUCKET is available
    if (!env.R2_BUCKET) {
      console.error('[IMAGE_UPLOAD_R2_BUCKET_NOT_AVAILABLE]');
      return fail(request, 'R2_BUCKET_NOT_AVAILABLE', 500);
    }

    // Upload the file to R2 bucket
    await env.R2_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: fileType },
      customMetadata: {
        uploadedAt: Date.now().toString(),
        originalName: file.name || 'unknown'
      }
    });

    // 🔒 写后读确认（强制）：确保R2对象已经可读
    let probe;
    for (let i = 0; i < 3; i++) {
      probe = await env.R2_BUCKET.get(key);
      if (probe) break;
      await new Promise(r => setTimeout(r, 150));
    }

    if (!probe) {
      console.error('[IMAGE_UPLOAD_R2_CONSISTENCY_ERROR] R2 object not readable after 3 retries');
      throw new Error('R2_WRITE_NOT_VISIBLE_AFTER_RETRY');
    }

    // Generate a Worker proxy URL instead of direct R2 URL
    // Extract just the file name from the key (remove 'images/' prefix)
    const fileName = key.replace('images/', '');
    const publicUrl = `https://jev-rebuild-worker.bensonlove1986.workers.dev/images/${fileName}`;
    
    // 防御性检查：确保publicUrl不包含重复的https://
    if (publicUrl.match(/https:\/\/[^/]+\/https:\//)) {
      console.error('[IMAGE_UPLOAD_URL_ERROR] URL contains duplicate https://:', publicUrl);
      return fail(request, 'INVALID_URL_FORMAT', 500);
    }
    
    // Log success and public URL
    console.log('[IMAGE_UPLOAD_OK]', { key, url: publicUrl });

    // Return the response with proper JSON format
    const responseBody = {
      ok: true,
      image_url: publicUrl,
      key: key
    };
    
    console.log('[IMAGE_UPLOAD_RESPONSE]', responseBody);
    return ok(request, responseBody);
  } catch (error) {
    console.error('[IMAGE_UPLOAD_FATAL]', error);
    console.error('[IMAGE_UPLOAD_FATAL_STACK]', error.stack);
    
    // Return a proper JSON error response with CORS headers
    return fail(request, 'UPLOAD_FAILED', 500, { message: error.message || 'An unknown error occurred' });
  }
}

/**
 * Handles image retrieval requests (for development purposes)
 * @param {Request} request - The incoming request
 * @param {string} imageId - The image ID to retrieve
 * @returns {Response} - The response object
 */
export async function handleGetImage(request, imageId) {
  try {
    const fileData = uploadedImages.get(imageId);
    
    if (!fileData) {
      return new Response('Image not found', { status: 404 });
    }
    
    return new Response(fileData.buffer, {
      headers: {
        'Content-Type': fileData.contentType,
        'Content-Disposition': `inline; filename="${fileData.fileName}"`,
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error('[IMAGE_RETRIEVAL_ERROR]', error);
    return new Response('Failed to retrieve image', { status: 500 });
  }
}