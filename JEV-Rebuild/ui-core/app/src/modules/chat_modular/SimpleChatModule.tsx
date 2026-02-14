import React from 'react';

// 简单聊天模块，不依赖任何其他组件
const SimpleChatModule: React.FC = () => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#f0f2f5',
      overflow: 'hidden',
      border: '3px solid red',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '24px',
      color: '#333'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}>
        <h1 style={{ marginBottom: '20px', color: '#25D366' }}>🎉 聊天模块加载成功！</h1>
        <p>这是一个简单的聊天模块，用于测试加载功能。</p>
        <p>所有复杂依赖已移除。</p>
        <p style={{ marginTop: '20px', fontSize: '16px', color: '#666' }}>当前时间: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default SimpleChatModule;