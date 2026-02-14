// @deprecated
// first generation chat UI layout
import React from 'react';
import Sidebar from '../../components/Sidebar';
import Chat from '../../components/Chat';
import SystemStatus from '../../components/SystemStatus';

const ChatLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <SystemStatus />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <Chat />
      </div>
    </div>
  );
};

export default ChatLayout;