import React, { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  MessageOutlined,
  UserOutlined,
  ShoppingOutlined,
  RobotOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  VideoCameraOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useModuleStore } from '../store/moduleStore';
import type { ModuleType } from '../store/moduleStore';
import { useSystemStore } from '../store/systemStore';
import { useCustomersStore } from '../store/customersStore';
import { moduleRegistry } from '../modules/moduleRegistry';
// 暂时注释掉 PresencePanel 导入
// import { PresencePanel } from '../components/PresencePanel';


const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

// 图标映射
const IconMap = {
  MessageOutlined: MessageOutlined,
  UserOutlined: UserOutlined,
  ShoppingOutlined: ShoppingOutlined,
  RobotOutlined: RobotOutlined,
  SettingOutlined: SettingOutlined,
  FileTextOutlined: FileTextOutlined,
  ShoppingCartOutlined: ShoppingCartOutlined,
  VideoCameraOutlined: VideoCameraOutlined,
  TeamOutlined: TeamOutlined,
  InfoCircleOutlined: InfoCircleOutlined,
  QuestionCircleOutlined: QuestionCircleOutlined,
};

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // 简化布局，移除复杂动画和动态样式，提高兼容性
  const { currentModule, setModule } = useModuleStore();
  const { isHealthy, lastCheckAt } = useSystemStore();
  const { selectedCustomerId, customers } = useCustomersStore();
  const [, setCollapsed] = useState(false);
  // 容器引用
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // 处理菜单点击
  const handleMenuClick = (e: { key: string }) => {
    // 验证模块类型有效性
    const validModules: ModuleType[] = [
      'chat', 'chat_v3', 'chat_modular', 'customers', 'orders', 'ai', 'system',
      'products', 'pi', 'shopify', 'facebook', 'youtube', 'contact',
      'about', 'fqa', 'forum'
    ];
    if (validModules.includes(e.key as ModuleType)) {
      setModule(e.key as ModuleType);
    }
  };

  // 从registry获取菜单项，排除需要放入子菜单的模块和系统模块
  const otherRegistryModules = moduleRegistry.getEnabledModules()
    .filter(module => !['shopify', 'facebook', 'youtube', 'system'].includes(module.key));
    
  // 生成其他模块的菜单项
  const otherMenuItems = otherRegistryModules.map(module => {
    const IconComponent = IconMap[module.icon as keyof typeof IconMap] || MessageOutlined;
    return {
      key: module.key,
      icon: React.createElement(IconComponent),
      label: module.name,
    };
  });

  // 添加使用社区和连通外界菜单项及其子菜单，系统状态菜单项固定在最后
  const menuItems = [
    ...otherMenuItems,
    {
      key: 'community',
      icon: React.createElement(TeamOutlined),
      label: '使用社区',
      children: [
        {
          key: 'about',
          icon: React.createElement(InfoCircleOutlined),
          label: '关于系统',
        },
        {
          key: 'fqa',
          icon: React.createElement(QuestionCircleOutlined),
          label: 'FQA',
        },
        {
          key: 'forum',
          icon: React.createElement(MessageOutlined),
          label: '论坛',
        },
      ],
    },
    {
      key: 'external',
      icon: React.createElement(LinkOutlined),
      label: '连通外界',
      children: [
        {
          key: 'shopify',
          icon: React.createElement(ShoppingCartOutlined),
          label: 'SHOPIFY集成',
        },
        {
          key: 'facebook',
          icon: React.createElement(MessageOutlined),
          label: 'FACEBOOK集成',
        },
        {
          key: 'youtube',
          icon: React.createElement(VideoCameraOutlined),
          label: 'YOUTUBE集成',
        },
      ],
    },
    // 系统状态菜单项固定在所有菜单项的最底部
    {
      key: 'system',
      icon: React.createElement(SettingOutlined),
      label: '系统状态',
    },
  ];
  // 获取当前选中的客户
  const selectedCustomer = customers.find(c => c.customer_id === selectedCustomerId);

  return (
    <div ref={containerRef} className="relative">
      <Layout className="h-screen bg-gray-50">
        <Header className="bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 shadow-sm">
        <div className="flex items-center">
          {/* 现代化LOGO */}
          <div className="flex items-center cursor-pointer">
            <div 
              className="mr-3 flex items-center justify-center"
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #1890ff, #40a9ff)',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
              }}
            >
              JEV
            </div>
            
            {/* 简化标题 */}
            <div>
              <Title 
                level={3} 
                className="m-0 font-bold text-gray-800"
                style={{ fontSize: '20px', fontWeight: 600 }}
              >
                业务工作台
              </Title>
              <div className="flex items-center mt-1">
                <Text className="text-gray-500 text-xs">嘉尔威跨境电商专用</Text>
                <div className="ml-2 w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* 当前系统状态 */}
          <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <Text className="text-sm font-medium">
              {isHealthy ? '在线' : '降级'}
            </Text>
            {lastCheckAt && (
              <Text className="text-xs text-gray-400 ml-2">
                {new Date(lastCheckAt).toLocaleTimeString()}
              </Text>
            )}
          </div>
          
          {/* 当前客户上下文 */}
          {selectedCustomer && (
            <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
              <InfoCircleOutlined className="text-blue-500 mr-1" />
              <Text className="text-sm font-medium text-gray-700">
                {selectedCustomer.display_name}
              </Text>
              <ClockCircleOutlined className="text-gray-400 ml-1 mr-1" />
              <Text className="text-xs text-gray-500">
                {new Date(selectedCustomer.last_message_at || 0).toLocaleDateString()}
              </Text>
            </div>
          )}
        </div>
      </Header>
      
      <Layout>
        {/* 左侧业务导航 */}
        <Sider 
          width={220} 
          className="bg-white border-r border-gray-200 shadow-sm"
          collapsedWidth="80"
          onCollapse={(value) => setCollapsed(value)}
          collapsible
        >
          <div className="p-4 h-full flex flex-col">
            <div className="mb-6">
              <Text className="font-semibold text-lg">业务导航</Text>
            </div>
            <Menu
              mode="inline"
              selectedKeys={[currentModule]}
              style={{ height: '100%', borderRight: 0, flex: 1 }}
              onClick={handleMenuClick}
              items={menuItems}
              className="border-0"
            />
          </div>
        </Sider>
        
        {/* 中央内容区域 - 包含聊天框和主视图 */}
        <Layout className="flex">
          {/* 中央业务主视图 */}
          <Content className="overflow-hidden flex-1">
            {children}
          </Content>
          {/* 暂时移除 Presence Radar 面板 */}
          {/* <div style={{ width: 350, borderLeft: '1px solid #e8e8e8', overflow: 'auto' }}>
            <PresencePanel />
          </div> */}
        </Layout>
      </Layout>
    </Layout>
  </div>
  );
};
