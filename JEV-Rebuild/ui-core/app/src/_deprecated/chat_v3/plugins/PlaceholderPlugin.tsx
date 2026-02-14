import React from 'react';

const PlaceholderPlugin: React.FC<any> = ({ context }) => {
  // 占位插件，用于展示插件栏的扩展能力
  return (
    <button
      className="chat-v3-plugin placeholder"
      onClick={() => {
        // 占位插件，点击无实际功能
      }}
      disabled
      title="未来插件占位"
    >
      更多插件
    </button>
  );
};

export default PlaceholderPlugin;