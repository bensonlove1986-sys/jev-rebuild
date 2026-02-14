import React, { useRef, useState, useEffect } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Space, 
  Typography, 
  Switch, 
  Slider, 
  Select, 
  Divider, 
  List, 
  Empty, 
  Spin, 
  Collapse,
  Tooltip,
  Alert
} from 'antd';
import { 
  ReloadOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  SettingOutlined,
  FontSizeOutlined,
  PictureOutlined,
  HistoryOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useConfigStore, MonitorConfig } from '../../store/configStore';
import { MonitorService, MonitorEvent } from '../../services/monitorService';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { Panel } = Collapse;

const BrowserMonitorModule: React.FC = () => {
  // 获取配置存储
  const { monitorConfig, updateMonitorConfig, resetMonitorConfig } = useConfigStore();
  
  // 状态管理
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorService, setMonitorService] = useState<MonitorService | null>(null);
  const [lastExtractedText, setLastExtractedText] = useState('');
  const [lastCapturedImage, setLastCapturedImage] = useState<HTMLCanvasElement | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 引用
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const serviceRef = useRef<MonitorService | null>(null);
  
  // 初始化监控服务
  useEffect(() => {
    if (iframeRef.current) {
      const service = new MonitorService(iframeRef.current, monitorConfig);
      serviceRef.current = service;
      setMonitorService(service);
      
      // 订阅监控事件
      service.on('monitor_started', () => {
        setIsMonitoring(true);
        setError(null);
      });
      
      service.on('monitor_stopped', () => {
        setIsMonitoring(false);
      });
      
      service.on('text_extracted', (event) => {
        setLastExtractedText(event.data);
        updateHistoryList('text', event.data);
      });
      
      service.on('image_captured', (event) => {
        setLastCapturedImage(event.data);
        updateHistoryList('image', event.data);
      });
      
      service.on('monitor_error', (event) => {
        console.error('[BrowserMonitorModule] Monitoring error:', event.error);
        setError(event.error.message);
      });
      
      // 清理函数
      return () => {
        service.stopMonitoring();
        service.off('monitor_started', () => {});
        service.off('monitor_stopped', () => {});
        service.off('text_extracted', () => {});
        service.off('image_captured', () => {});
        service.off('monitor_error', () => {});
      };
    }
  }, []);
  
  // 更新监控配置
  useEffect(() => {
    if (serviceRef.current) {
      serviceRef.current.updateConfig(monitorConfig);
    }
  }, [monitorConfig]);
  
  // 更新历史记录列表
  const updateHistoryList = (type: 'text' | 'image', content: string | HTMLCanvasElement) => {
    const newItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date().toLocaleString()
    };
    
    setHistoryList(prev => [newItem, ...prev].slice(0, monitorConfig.maxHistoryCount));
  };
  
  // 处理监控开关
  const handleMonitorToggle = (checked: boolean) => {
    if (serviceRef.current) {
      if (checked) {
        serviceRef.current.startMonitoring();
      } else {
        serviceRef.current.stopMonitoring();
      }
    }
  };
  
  // 处理URL变化
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMonitorConfig({ targetUrl: e.target.value });
  };
  
  // 处理URL提交
  const handleUrlSubmit = () => {
    if (iframeRef.current && monitorConfig.targetUrl) {
      setIsLoading(true);
      iframeRef.current.src = monitorConfig.targetUrl;
      
      // 监听iframe加载完成
      iframeRef.current.onload = () => {
        setIsLoading(false);
        setError(null);
      };
      
      // 监听iframe加载错误
      iframeRef.current.onerror = () => {
        setIsLoading(false);
        setError('无法加载目标URL，请检查网络连接或URL是否正确');
      };
    }
  };
  
  // 处理监控类型变化
  const handleMonitorTypesChange = (value: string[]) => {
    updateMonitorConfig({ monitorTypes: value });
  };
  
  // 处理监控频率变化
  const handleIntervalChange = (value: number) => {
    updateMonitorConfig({ monitorInterval: value });
  };
  
  // 处理图片质量变化
  const handleImageQualityChange = (value: number) => {
    updateMonitorConfig({ imageQuality: value / 100 });
  };
  
  // 处理最大历史记录数变化
  const handleMaxHistoryChange = (value: number) => {
    updateMonitorConfig({ maxHistoryCount: value });
  };
  
  // 处理节流开关变化
  const handleThrottleToggle = (checked: boolean) => {
    updateMonitorConfig({ enableThrottling: checked });
  };
  
  // 重置配置
  const handleResetConfig = () => {
    resetMonitorConfig();
  };
  
  // 清空历史记录
  const handleClearHistory = () => {
    setHistoryList([]);
    if (serviceRef.current) {
      serviceRef.current.clearHistory();
    }
  };
  
  // 刷新iframe
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.contentWindow?.location.reload();
      iframeRef.current.onload = () => {
        setIsLoading(false);
        setError(null);
      };
      iframeRef.current.onerror = () => {
        setIsLoading(false);
        setError('刷新失败，请检查网络连接');
      };
    }
  };
  
  // 渲染监控配置面板
  const renderConfigPanel = () => (
    <Card 
      title={
        <Space>
          <SettingOutlined />
          <Text strong>监控配置</Text>
        </Space>
      }
      size="small"
      className="mb-4"
    >
      <Space direction="vertical" className="w-full" size="middle">
        {/* 监控开关 */}
        <div className="flex items-center justify-between">
          <Tooltip title="启用/禁用监控">
            <Space>
              {isMonitoring ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              <Text>启用监控</Text>
            </Space>
          </Tooltip>
          <Switch 
            checked={isMonitoring} 
            onChange={handleMonitorToggle} 
            checkedChildren={<PlayCircleOutlined />}
            unCheckedChildren={<PauseCircleOutlined />}
          />
        </div>
        
        {/* 目标URL */}
        <div>
          <Text strong className="block mb-2">目标URL</Text>
          <Search
            placeholder="输入监控URL"
            allowClear
            enterButton={<ReloadOutlined />}
            size="middle"
            value={monitorConfig.targetUrl}
            onChange={handleUrlChange}
            onSearch={handleUrlSubmit}
            className="w-full"
          />
        </div>
        
        {/* 监控类型 */}
        <div>
          <Text strong className="block mb-2">监控类型</Text>
          <Select
            mode="multiple"
            placeholder="选择监控类型"
            value={monitorConfig.monitorTypes}
            onChange={handleMonitorTypesChange}
            className="w-full"
          >
            <Option value="text" icon={<FontSizeOutlined />}>文字</Option>
            <Option value="image" icon={<PictureOutlined />}>图片</Option>
          </Select>
        </div>
        
        {/* 监控频率 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Text strong>监控频率</Text>
            <Text type="secondary">{monitorConfig.monitorInterval}ms</Text>
          </div>
          <Slider
            min={1000}
            max={10000}
            step={500}
            value={monitorConfig.monitorInterval}
            onChange={handleIntervalChange}
            tooltip={{ formatter: (value) => `${value}ms` }}
          />
        </div>
        
        {/* 图片质量 */}
        {monitorConfig.monitorTypes.includes('image') && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Text strong>图片质量</Text>
              <Text type="secondary">{(monitorConfig.imageQuality * 100).toFixed(0)}%</Text>
            </div>
            <Slider
              min={10}
              max={100}
              step={5}
              value={monitorConfig.imageQuality * 100}
              onChange={handleImageQualityChange}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </div>
        )}
        
        {/* 最大历史记录数 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Text strong>最大历史记录</Text>
            <Text type="secondary">{monitorConfig.maxHistoryCount}条</Text>
          </div>
          <Slider
            min={10}
            max={200}
            step={10}
            value={monitorConfig.maxHistoryCount}
            onChange={handleMaxHistoryChange}
            tooltip={{ formatter: (value) => `${value}条` }}
          />
        </div>
        
        {/* 启用节流 */}
        <div className="flex items-center justify-between">
          <Tooltip title="启用节流可以减少监控频率，降低资源消耗">
            <Space>
              <SettingOutlined />
              <Text>启用节流</Text>
            </Space>
          </Tooltip>
          <Switch 
            checked={monitorConfig.enableThrottling} 
            onChange={handleThrottleToggle} 
          />
        </div>
        
        {/* 操作按钮 */}
        <Space className="w-full" direction="vertical">
          <Divider style={{ margin: '8px 0' }} />
          <Button 
            type="default" 
            danger 
            icon={<ClearOutlined />} 
            onClick={handleResetConfig}
            block
          >
            重置配置
          </Button>
        </Space>
      </Space>
    </Card>
  );
  
  // 渲染监控结果面板
  const renderResultPanel = () => (
    <Card 
      title={
        <Space>
          <HistoryOutlined />
          <Text strong>监控结果</Text>
          <Button 
            type="text" 
            icon={<ClearOutlined />} 
            onClick={handleClearHistory}
            size="small"
            danger
          >
            清空
          </Button>
        </Space>
      }
      size="small"
      className="mb-4"
    >
      {error && (
        <Alert 
          message="错误" 
          description={error} 
          type="error" 
          showIcon 
          closable 
          onClose={() => setError(null)}
          className="mb-4"
        />
      )}
      
      {/* 最新文字提取结果 */}
      {monitorConfig.monitorTypes.includes('text') && lastExtractedText && (
        <Card size="small" className="mb-4">
          <Title level={5} className="mb-2">
            <FontSizeOutlined /> 最新文字提取
          </Title>
          <Paragraph 
            ellipsis={{ rows: 3, expandable: true, symbol: '查看更多' }}
            className="mb-0"
          >
            {lastExtractedText}
          </Paragraph>
        </Card>
      )}
      
      {/* 最新图片捕获结果 */}
      {monitorConfig.monitorTypes.includes('image') && lastCapturedImage && (
        <Card size="small" className="mb-4">
          <Title level={5} className="mb-2">
            <PictureOutlined /> 最新图片捕获
          </Title>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px'
          }}>
            <img 
              src={lastCapturedImage.toDataURL()} 
              alt="最新捕获" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '200px',
                objectFit: 'contain'
              }} 
            />
          </div>
        </Card>
      )}
      
      {/* 监控历史 */}
      <Title level={5} className="mb-2">历史记录</Title>
      {historyList.length === 0 ? (
        <Empty description="暂无监控历史" />
      ) : (
        <List
          size="small"
          dataSource={historyList}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              actions={[
                <Text type="secondary" key="time">
                  {item.timestamp}
                </Text>
              ]}
            >
              <List.Item.Meta
                avatar={
                  item.type === 'text' ? 
                    <FontSizeOutlined style={{ fontSize: '20px', color: '#1890ff' }} /> :
                    <PictureOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
                }
                title={
                  item.type === 'text' ? 
                    <Text strong>文字提取</Text> :
                    <Text strong>图片捕获</Text>
                }
                description={
                  item.type === 'text' ? (
                    <Paragraph 
                      ellipsis={{ rows: 2 }}
                      className="mb-0"
                    >
                      {item.content}
                    </Paragraph>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      padding: '5px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      maxWidth: '150px'
                    }}>
                      <img 
                        src={(item.content as HTMLCanvasElement).toDataURL()} 
                        alt="捕获的图片" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '80px',
                          objectFit: 'contain'
                        }} 
                      />
                    </div>
                  )
                }
              />
            </List.Item>
          )}
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      )}
    </Card>
  );
  
  // 渲染浏览器视图
  const renderBrowserView = () => (
    <Card 
      title="内置浏览器"
      size="small"
      extra={
        <Space>
          <Button 
            type="text" 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            size="small"
          >
            刷新
          </Button>
        </Space>
      }
      className="h-full flex flex-col"
    >
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        position: 'relative'
      }}>
        {isLoading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 100
          }}>
            <Spin tip="加载中..." />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={monitorConfig.targetUrl}
          title="监控页面"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-orientation-lock"
          referrerPolicy="no-referrer"
          style={{ 
            backgroundColor: '#ffffff',
            transition: 'opacity 0.3s'
          }}
        />
      </div>
    </Card>
  );
  
  return (
    <div className="h-full bg-gray-50 p-4 overflow-hidden">
      <Title level={4} className="mb-4">
        <Space>
          <SettingOutlined />
          内置浏览器监控
        </Space>
      </Title>
      
      <div className="flex flex-col md:flex-row h-[calc(100%-64px)] gap-4">
        {/* 左侧配置和结果区域 */}
        <div style={{ 
          width: '100%', 
          md: '350px',
          overflow: 'auto',
          flexShrink: 0
        }}>
          <Collapse defaultActiveKey={['1', '2']} ghost>
            <Panel header="监控配置" key="1">
              {renderConfigPanel()}
            </Panel>
            <Panel header="监控结果" key="2">
              {renderResultPanel()}
            </Panel>
          </Collapse>
        </div>
        
        {/* 右侧浏览器视图 */}
        <div style={{ 
          flex: 1, 
          overflow: 'hidden',
          minWidth: 0
        }}>
          {renderBrowserView()}
        </div>
      </div>
    </div>
  );
};

export default BrowserMonitorModule;
