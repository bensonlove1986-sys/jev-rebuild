import { JEV_RUNTIME } from '../core/jev_runtime_config';

export function buildApiUrl(path: string) {
  if (!path) throw new Error('EMPTY_URL_INPUT');
  
  // 去除两端空格
  const trimmedPath = path.trim();
  
  // 当 path 已经是绝对 URL 时，不再拼接 API_BASE
  if (trimmedPath.startsWith("http://") || trimmedPath.startsWith("https://")) {
    return trimmedPath;
  }
  
  // 当 path 以 / 开头时，直接拼接 API_BASE
  if (trimmedPath.startsWith("/")) {
    return JEV_RUNTIME.API_BASE + trimmedPath;
  }
  
  // 否则，在 API_BASE 后添加 / 再拼接 path
  return JEV_RUNTIME.API_BASE + "/" + trimmedPath;
}

// 兼容旧代码，将 resolveUrl 指向 buildApiUrl
export function resolveUrl(path: string) {
  return buildApiUrl(path);
}