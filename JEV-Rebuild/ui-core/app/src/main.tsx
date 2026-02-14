import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { getJevRuntimeConfig } from './core/jev_runtime_config';

// 确保 WhatsAppInboxService 模块被执行
import './services/WhatsAppInboxService';

const config = getJevRuntimeConfig();
console.log('JEV Runtime Config:', config);

// 定义 safeFetch 函数
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    // 构建完整的 URL
    let fullUrl: string;
    
    // 如果是相对路径，使用 API_BASE
    if (url.startsWith('/')) {
      fullUrl = config.apiBase + url;
    } else {
      // 如果是绝对路径，直接使用
      fullUrl = url;
    }
    
    console.log('[SAFE_FETCH] Fetching:', fullUrl);
    
    // 发送请求
    const response = await fetch(fullUrl, options);
    
    return response;
  } catch (error) {
    console.error('[SAFE_FETCH_ERROR]', error);
    throw error;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
