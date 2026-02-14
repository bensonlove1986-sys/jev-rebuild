import React from 'react';

interface PluginsBarProps {
  children: React.ReactNode;
}

const PluginsBar: React.FC<PluginsBarProps> = ({ children }) => {
  return (
    <div className="chat-v3-plugins">
      {children}
    </div>
  );
};

export default PluginsBar;