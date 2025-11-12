export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const SHARED = env.WEBHOOK_SHARED_SECRET || env.WEBHOOK_SECRET || '';
    const incoming = request.headers.get('X-Webhook-Secret') || request.headers.get('x-webhook-secret') || url.searchParams.get('secret') || '';

    // Helpers
    const sniffType = (bytes) => {
      if (!bytes || bytes.length < 12) return { ct: 'application/octet-stream', ext: 'bin' };
      const b0 = bytes[0], b1 = bytes[1], b2 = bytes[2], b3 = bytes[3];
      // PNG: 89 50 4E 47
      if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47) return { ct: 'image/png', ext: 'png' };
      // JPEG: FF D8
      if (b0 === 0xFF && b1 === 0xD8) return { ct: 'image/jpeg', ext: 'jpg' };
      // GIF: 47 49 46 38
      if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46 && b3 === 0x38) return { ct: 'image/gif', ext: 'gif' };
      // WEBP: RIFF .... WEBP
      if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46) return { ct: 'image/webp', ext: 'webp' };
      return { ct: 'application/octet-stream', ext: 'bin' };
    };
    const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

    // Receive base64 image (Push)
    if (path === '/receive-image') {
      if (SHARED && SHARED !== incoming) return json({ success: false, error: 'Forbidden: invalid webhook secret' }, 403);
      let imageB64 = null, base64Url = null, contactId = null, contactPhone = null, fileName = null;
      try {
        const b = await request.json();
        imageB64 = b.image_b64 || b.imageBase64 || null;
        base64Url = b.base64_url || b.data_url || b.dataUrl || null;
        contactId = b.contact_id || b.contactId || null;
        contactPhone = b.contact_phone || b.contactPhone || null;
        fileName = b.image_name || b.filename || b.file_name || null;
      } catch {}
      if (!imageB64 && base64Url && /^data:image\//i.test(base64Url)) {
        const m = base64Url.match(/data:[^;]+;base64,([A-Za-z0-9+/=]+)/i);
        if (m) imageB64 = m[1];
      }
      if (!imageB64) return json({ success: false, error: '缺少 image_b64/base64_url' }, 400);

      // Decode base64 → bytes
      let bytes = null;
      try {
        const raw = atob(imageB64);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        bytes = arr;
      } catch (e) {
        return json({ success: false, error: 'Base64 解码失败', detail: e.message }, 400);
      }

      // Size limit
      const maxBytes = Number(env.RECEIVE_IMAGE_MAX_BYTES || 6 * 1024 * 1024) || (6 * 1024 * 1024);
      if (bytes.length > maxBytes) return json({ success: false, error: '图片过大', limit: maxBytes, size: bytes.length }, 413);

      // Type sniff
      const guessed = sniffType(bytes);
      const ct = guessed.ct;
      const ext = guessed.ext;
      const allowed = new Set(['image/png','image/jpeg','image/gif','image/webp']);
      if (!allowed.has(ct)) return json({ success: false, error: '不支持的图片类型', content_type: ct }, 415);

      // Hash
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hashHex = toHex(digest);

      // Key
      const now = new Date(); const yyyy = now.getUTCFullYear(); const mm = String(now.getUTCMonth()+1).padStart(2,'0'); const dd = String(now.getUTCDate()).padStart(2,'0');
      const safeName = (fileName || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
      const id = (contactPhone || contactId || 'unknown').replace(/[^+0-9a-zA-Z_-]/g, '_');
      const objectKey = `whatsapp/${id}/${yyyy}/${mm}/${dd}/${safeName}_${hashHex}.${ext}`;

      // R2 bindings
      const bucket = env.R2_BUCKET || env.JEV_IMAGES;
      const bucketName = env.R2_BUCKET_NAME || 'jev-images';
      const accountId = env.R2_ACCOUNT_ID || '';
      if (!bucket || typeof bucket.put !== 'function') return json({ success: false, error: 'R2 bucket binding missing' }, 500);

      // Dedup: head if available, otherwise get
      let existing = null;
      try { existing = (typeof bucket.head === 'function') ? await bucket.head(objectKey) : await bucket.get(objectKey); } catch {}

      if (!existing) {
        await bucket.put(objectKey, bytes, { httpMetadata: { contentType: ct }, customMetadata: { contact_id: String(contactId || ''), contact_phone: String(contactPhone || ''), original_name: String(fileName || ''), hash: hashHex, size_bytes: String(bytes.length), created_at: now.toISOString() } });
      }

      const publicBase = env.R2_PUBLIC_BASE || (accountId ? `https://pub-${accountId}.r2.dev` : '');
      const publicUrl = publicBase ? `${publicBase}/${encodeURIComponent(bucketName)}/${objectKey}` : `${url.origin}/images/${encodeURIComponent(objectKey)}`;
      const workerUrl = `${url.origin}/images/${encodeURIComponent(objectKey)}`;

      return json({ success: true, key: objectKey, bucket: bucketName, content_type: ct, url: publicUrl, worker_url: workerUrl, size_bytes: bytes.length, hash: hashHex, saved: !existing, existing: !!existing }, 200);
    }

    // Read image by key (public)
    if (path.startsWith('/images/')) {
      const bucket = env.R2_BUCKET || env.JEV_IMAGES; if (!bucket || typeof bucket.get !== 'function') return json({ success: false, error: 'R2 bucket binding missing' }, 500);
      const keyName = decodeURIComponent(url.pathname.slice('/images/'.length));
      try {
        const obj = await bucket.get(keyName);
        if (!obj) return json({ success: false, error: 'Not Found' }, 404);
        const ct = obj.httpMetadata?.contentType || 'application/octet-stream';
        return new Response(obj.body, { status: 200, headers: { 'Content-Type': ct, ...cors } });
      } catch (e) { return json({ success: false, error: e.message }, 500); }
    }

    // Query metadata (protected)
    if (path.startsWith('/images-meta/')) {
      if (SHARED && SHARED !== incoming) return json({ success: false, error: 'Forbidden: invalid webhook secret' }, 403);
      const bucket = env.R2_BUCKET || env.JEV_IMAGES; if (!bucket || (typeof bucket.get !== 'function' && typeof bucket.head !== 'function')) return json({ success: false, error: 'R2 bucket binding missing' }, 500);
      const bucketName = env.R2_BUCKET_NAME || 'jev-images';
      const keyName = decodeURIComponent(url.pathname.slice('/images-meta/'.length));
      try {
        const obj = (typeof bucket.head === 'function') ? await bucket.head(keyName) : await bucket.get(keyName);
        if (!obj) return json({ success: false, error: 'Not Found' }, 404);
        const httpMeta = obj.httpMetadata || {}; const customMeta = obj.customMetadata || {};
        const ct = httpMeta.contentType || 'application/octet-stream';
        const size = (typeof obj.size === 'number') ? obj.size : (typeof obj.body?.size === 'number' ? obj.body.size : undefined);
        return json({ success: true, key: keyName, bucket: bucketName, content_type: ct, size_bytes: size, http_metadata: httpMeta, custom_metadata: customMeta, etag: obj.etag }, 200);
      } catch (e) { return json({ success: false, error: e.message }, 500); }
    }

    // Update metadata (protected)
    if (path.startsWith('/images-meta/update/')) {
      if (SHARED && SHARED !== incoming) return json({ success: false, error: 'Forbidden: invalid webhook secret' }, 403);
      if (request.method !== 'POST') return json({ success: false, error: 'Method Not Allowed', allow: 'POST' }, 405);
      const bucket = env.R2_BUCKET || env.JEV_IMAGES; if (!bucket || (typeof bucket.get !== 'function' || typeof bucket.put !== 'function')) return json({ success: false, error: 'R2 bucket binding missing' }, 500);
      const bucketName = env.R2_BUCKET_NAME || 'jev-images';
      const keyName = decodeURIComponent(url.pathname.slice('/images-meta/update/'.length));
      let updates = {}; try { updates = await request.json(); } catch {}
      const whitelist = new Set(['contact_id','contact_phone','original_name','hash','size_bytes','created_at']);
      const toStr = (v) => (v === null || v === undefined) ? '' : String(v);
      try {
        const obj = await bucket.get(keyName); if (!obj) return json({ success: false, error: 'Not Found' }, 404);
        const httpMeta = obj.httpMetadata || {}; const existing = obj.customMetadata || {};
        const filtered = {}; for (const [k, v] of Object.entries(updates || {})) { if (whitelist.has(k)) filtered[k] = toStr(v); }
        const merged = Object.assign({}, existing || {}, filtered);
        const ct = httpMeta.contentType || 'application/octet-stream';
        await bucket.put(keyName, obj.body, { httpMetadata: { contentType: ct }, customMetadata: merged });
        const head = (typeof bucket.head === 'function') ? await bucket.head(keyName) : await bucket.get(keyName);
        const size = (typeof head?.size === 'number') ? head.size : (typeof head?.body?.size === 'number' ? head.body.size : undefined);
        return json({ success: true, key: keyName, bucket: bucketName, content_type: ct, size_bytes: size, http_metadata: head?.httpMetadata || httpMeta, custom_metadata: head?.customMetadata || merged, etag: head?.etag, action: 'metadata_updated' }, 200);
      } catch (e) { return json({ success: false, error: e.message }, 500); }
    }

    return json({ success: false, error: 'Not Found' }, 404);
  }
};
