import { JEV_RUNTIME } from '@/core/jev_runtime_config';

/**
 * 统一 API URL 构建器
 * L9.6 架构：防止 URL 二次拼接
 */
export function buildApiUrl(path: string): string {
  if (!path) return "";

  // 规则 3：已是绝对路径 → 直接返回，防重复拼接
  if (path.startsWith("http")) {
    return path;
  }

  // 强制修复双斜杠
  if (path.startsWith("//")) {
    path = path.slice(1);
  }

  // 确保路径以 / 开头
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // 媒体资源特殊处理：如果路径包含 /api/media/r2/，使用远程 Worker
  if (path.includes("/api/media/r2/")) {
    return JEV_RUNTIME.REMOTE_API_BASE + path;
  }

  // 构建完整 URL
  return JEV_RUNTIME.API_BASE + path;
}

/**
 * 构建 OCR 相关 URL
 */
export function buildOcrUrl(action: string, params?: Record<string, string>): string {
  let path = `/api/ocr/${action}`;
  
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params).toString();
    path += `?${searchParams}`;
  }
  
  return buildApiUrl(path);
}

/**
 * 构建媒体上传 URL
 */
export function buildMediaUploadUrl(): string {
  return "/api/upload/media";
}

/**
 * 构建媒体访问 URL
 */
export function buildMediaUrl(mediaPath: string): string {
  return buildApiUrl(mediaPath);
}

/**
 * 获取 API 基础 URL
 */
export function getApiBase(): string {
  return JEV_RUNTIME.API_BASE;
}
