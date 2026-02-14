/**
 * @FREEZE_CONTRACT
 * Single Source of Truth.
 * Any fallback, duplication, or override is forbidden.
 */

// 热更新失效配置
if (import.meta.hot) {
  import.meta.hot.invalidate();
}

import type { ApiPath, ForbiddenUrl } from "./types";
import { resolveUrl } from '@/utils/apiClient';
import { safeFetch } from '@/main';

/**
 * fetchApi —— 只能接收 API Path
 * ❌ 不能传 URL
 * ❌ 不能传模块路径
 */
export async function fetchApi<
  TResponse = unknown
>(
  path: ApiPath & Exclude<ApiPath, ForbiddenUrl>,
  options?: RequestInit,
  controller?: AbortController
): Promise<TResponse> {
  // 构建 fetch 选项
  const fetchOptions = {
    ...options,
    // 添加 AbortSignal
    signal: controller?.signal,
    // 明确设置 credentials 为 include
    credentials: 'include' as const,
    // 防止浏览器自动跟随重定向
    redirect: 'error' as const,
    // 统一 JSON header
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  try {
    // 使用 safeFetch 并直接传递相对路径
    const res = await safeFetch(path, fetchOptions);
    const text = await res.text();
    
    if (!res.ok) {
      throw new Error(`API_ERROR_${res.status}: ${text}`);
    }

    try {
      // 尝试解析JSON
      const data = JSON.parse(text);
      return data as TResponse;
    } catch {
      // 如果JSON解析失败，直接返回文本内容
      return text as TResponse;
    }
  } catch (error: any) {
    // 区分不同类型的错误
    if (error.name === 'AbortError') {
      throw error; // 继续抛出 AbortError，让调用者处理
    } else if (error.message.includes('Failed to fetch')) {
      // 标记为客户端资源耗尽错误
      throw new Error(`CLIENT_RESOURCE_EXHAUSTED: Failed to fetch ${path}`);
    } else {
      // 其他错误保持原样
      throw error;
    }
  }
}

// 导出API_BASE，确保唯一事实源
import { JEV_RUNTIME } from '@/core/jev_runtime_config';
export const API_BASE_URL = JEV_RUNTIME.API_BASE;

// 重新导出 safeFetch 函数，确保统一的导出方式
export { safeFetch } from '@/main';

export type ApiClient = never;