import React, { useEffect, useState } from 'react';
import { eventBus } from '../utils/eventBus';

interface Notification {
  id: string;
  customer_id: string;
  customer_name: string;
  message: string;
  timestamp: number;
}

const NewMessageNotification: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // 监听新消息事件
    const handleNewMessage = (data: any) => {
      if (data.role === 'customer') {
        // 确保同一messageId全生命周期只触发一次UI提示
        if (data._uiNotified) {
          return;
        }
        data._uiNotified = true;
        
        // 显示新消息通知
        const newNotification: Notification = {
          id: `${data.customer_id}-${Date.now()}`,
          customer_id: data.customer_id,
          customer_name: data.customer_name || '新客户',
          message: data.text || '新消息',
          timestamp: Date.now()
        };

        setNotifications(prev => [...prev, newNotification]);

        // 播放提示音
        playNotificationSound();

        // 10秒后自动移除通知
        setTimeout(() => {
          removeNotification(newNotification.id);
        }, 10000);
      }
    };

    eventBus.on('chat:newMessage', handleNewMessage);

    return () => {
      eventBus.off('chat:newMessage', handleNewMessage);
    };
  }, []);

  // 播放提示音
  const playNotificationSound = () => {
    try {
      // 创建音频上下文
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 创建简单的提示音
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  // 移除通知
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  return (
    <div className="global-notification-container">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className="global-notification" 
          onClick={() => removeNotification(notification.id)}
        >
          <div className="notification-content">
            <div className="notification-title">新消息</div>
            <div className="notification-customer">{notification.customer_name}</div>
            <div className="notification-message">{notification.message}</div>
            <div className="notification-time">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <button 
            className="notification-close" 
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notification.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NewMessageNotification;
