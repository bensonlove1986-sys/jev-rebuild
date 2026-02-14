// Image proxy route for handling image requests through Worker

function resolveMediaKey(pathname) {
  // remove leading slash
  let key = pathname.replace(/^\/+/, "")

  // ===== 新结构 =====
  if (key.startsWith("api/media/r2/")) {
    return key.slice("api/media/r2/".length)
  }

  // ===== CDN 未来扩展 =====
  if (key.startsWith("api/media/cdn/")) {
    return key.slice("api/media/cdn/".length)
  }

  // ===== 旧版本兼容 =====
  if (key.startsWith("media/")) {
    return key.slice("media/".length)
  }

  // fallback（保持现有行为）
  return key
}

export async function handleImageProxy(request, env) {
  const url = new URL(request.url);
  let key = resolveMediaKey(url.pathname)
  console.log("[NORMALIZED_R2_KEY]", key)

  if (!key || key.includes('..')) {
    return new Response('Invalid media path', { status: 400 });
  }

  // 使用 R2_BUCKET 绑定，与上传时使用的绑定一致
  const object = await env.R2_BUCKET.get(key);

  if (!object) {
    return new Response('Image not found', { status: 404 });
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/png',
      'Cache-Control': 'public, max-age=31536000'
    }
  });
}