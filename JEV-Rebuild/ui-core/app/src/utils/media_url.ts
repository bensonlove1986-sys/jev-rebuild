export function buildMediaUrl(baseUrl: string, input: string): string {
  if (!input) return "";

  const raw = String(input).trim();

  // 1) 绝对 URL：直接返回（关键：阻断二次拼接）
  if (/^https?:\/\//i.test(raw)) return raw;

  // 2) 处理 //cdn.xxx 这种
  if (/^\/\//.test(raw)) {
    const proto = baseUrl.startsWith("https://") ? "https:" : "http:";
    return proto + raw;
  }

  // 3) 清洗污染：如果里面夹了完整 URL，只保留 /api/media/... 之后的部分
  let path = raw;
  const apiIdx = path.indexOf("/api/media/");
  if (apiIdx >= 0) path = path.slice(apiIdx);

  // 4) 保证是相对路径
  if (!path.startsWith("/")) path = "/" + path;

  // 5) 幂等 join（永远只拼一次）
  const base = new URL(baseUrl);
  return new URL(path, base).toString();
}
