import React from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function ChatModule() {
  // ✅ 所有逻辑只能写在组件函数内部
  // ❌ 顶层只能 import / type / interface

  return (
    <ChatSafe />
  );
}

function ChatSafe() {
  // 检测chat版本开关
  const getChatVersion = () => {
    // 优先检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const urlVersion = urlParams.get('chat');
    if (urlVersion) {
      return urlVersion;
    }
    
    // 其次检查localStorage
    const localStorageVersion = localStorage.getItem('chat_version');
    if (localStorageVersion) {
      return localStorageVersion;
    }
    
    // 默认使用旧版
    return 'legacy';
  };

  const chatVersion = getChatVersion();
  
  // 根据版本选择加载不同的聊天组件
  const renderChatComponent = () => {
    if (chatVersion === 'v2') {
      // 动态导入新版ChatShell
      const ChatShell = React.lazy(() => import('../chat_v2/ChatShell'));
      
      return (
        <React.Suspense fallback={<div>Loading Chat v2...</div>}>
          <ChatShell />
        </React.Suspense>
      );
    } else {
      // 动态导入旧版Chat
      const Chat = React.lazy(() => import('../../components/Chat'));
      
      return (
        <React.Suspense fallback={<div>Loading Chat...</div>}>
          <Chat />
        </React.Suspense>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow overflow-hidden">
      <ErrorBoundary>
        {renderChatComponent()}
      </ErrorBoundary>
    </div>
  );
}
