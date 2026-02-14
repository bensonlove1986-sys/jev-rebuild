import React, { useRef, useState } from 'react';
import { Card, Input, Button, Space, Tabs, Typography } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Search } = Input;

interface Tab {
  key: string;
  title: string;
  type: 'browser';
}

const BrowserModule: React.FC = () => {
  // 只保留必要的状态
  const [tabs, setTabs] = useState<Tab[]>([
    { key: '1', title: '网页浏览', type: 'browser' }
  ]);
  const [activeKey, setActiveKey] = useState('1');
  // 添加 useRef 保存 iframe 元素
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // 从 localStorage 恢复 URL
  const [url, setUrl] = useState(localStorage.getItem('browserUrl') || 'https://app.daojiemarketing.com/v2/location/3SsfTbU1lmAPpkG9iB6C/conversations/conversations');
  
  // 保存 URL 到 localStorage
  React.useEffect(() => {
    localStorage.setItem('browserUrl', url);
  }, [url]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  // 简化的URL提交，不使用message和loading状态
  const handleUrlSubmit = () => {
    if (!url) {
      console.warn('请输入URL');
      return;
    }
    
    // 直接更新 iframe 的 src 属性
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  // 处理iframe加载完成事件 - 仅记录日志，不触发状态更新
  const handleIframeLoad = () => {
    console.warn(`已加载: ${url}`);
  };

  // 处理iframe加载错误事件 - 仅记录日志，不触发状态更新
  const handleIframeError = () => {
    console.warn(`加载失败: ${url}`);
  };

  const handleAddTab = () => {
    const newKey = String(tabs.length + 1);
    const newTab: Tab = {
      key: newKey,
      title: '新标签页',
      type: 'browser'
    };
    setTabs([...tabs, newTab]);
    setActiveKey(newKey);
  };

  const handleTabChange = (key: string) => {
    setActiveKey(key);
  };

  const handleTabClose = (key: string) => {
    const newTabs = tabs.filter(t => t.key !== key);
    setTabs(newTabs);
    if (activeKey === key && newTabs.length > 0) {
      setActiveKey(newTabs[0].key);
    }
  };

  // 渲染网页浏览面板 - 简化版，仅保留iframe
  const renderBrowserPanel = () => (
    <div className="p-4 h-full overflow-hidden flex flex-col">
      <div className="mb-4">
        <Title level={4} className="m-0 mb-3">网页浏览</Title>
        <Space size="small" className="w-full">
          <Search
            placeholder="输入URL"
            allowClear
            enterButton="访问"
            size="large"
            value={url}
            onChange={handleUrlChange}
            onSearch={handleUrlSubmit}
            className="flex-1"
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleUrlSubmit}
          />
        </Space>
      </div>

      <Card 
        className="flex-1 w-full overflow-hidden" 
        styles={{
          body: { padding: 0, height: '100%' },
          root: { border: '1px solid #f0f0f0', borderRadius: '6px' }
        }}
      >
        {url && (
          <div className="w-full h-full overflow-hidden">
            <iframe
              ref={iframeRef}
              src={url}
              title="网页浏览"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-orientation-lock"
              referrerPolicy="no-referrer"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </div>
        )}
        {!url && (
          <div className="flex items-center justify-center h-full text-gray-500">
            请输入URL并点击访问按钮
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <div className="h-full bg-white">
      <div className="p-4 bg-white border-b border-gray-200">
        <Space size="middle" className="mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTab}>
            新建标签页
          </Button>
        </Space>
        <Tabs
          activeKey={activeKey}
          items={tabs.map(tab => ({
            key: tab.key,
            label: tab.title,
            closable: tabs.length > 1,
            onClose: () => handleTabClose(tab.key)
          }))}
          onChange={handleTabChange}
          className="mb-0"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderBrowserPanel()}
      </div>
    </div>
  );
};

export default BrowserModule;