// 模块注册中心
// 管理所有业务模块的配置和元数据

export interface ModuleConfig {
  key: string;
  name: string;
  icon: string;
  description: string;
  component: () => Promise<React.ComponentType>;
  default?: boolean;
  enabled: boolean;
}

// 模块注册中心
class ModuleRegistry {
  private modules: Map<string, ModuleConfig> = new Map();
  
  // 注册模块
  registerModule(config: ModuleConfig) {
    this.modules.set(config.key, config);
  }
  
  // 获取所有模块
  getAllModules(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }
  
  // 获取启用的模块
  getEnabledModules(): ModuleConfig[] {
    return this.getAllModules().filter(module => module.enabled);
  }
  
  // 获取默认模块
  getDefaultModule(): ModuleConfig | undefined {
    return this.getEnabledModules().find(module => module.default) || this.getEnabledModules()[0];
  }
  
  // 根据key获取模块
  getModule(key: string): ModuleConfig | undefined {
    return this.modules.get(key);
  }
  
  // 启用/禁用模块
  setModuleEnabled(key: string, enabled: boolean) {
    const module = this.getModule(key);
    if (module) {
      this.modules.set(key, { ...module, enabled });
    }
  }
}

// 创建单例实例
export const moduleRegistry = new ModuleRegistry();



// 新增聊天模块
moduleRegistry.registerModule({
  key: 'chat',
  name: '聊天',
  icon: 'MessageOutlined',
  description: 'WhatsApp风格聊天系统',
  component: () => import('./chat_modular/ChatModule').then(m => m.default),
  default: true,
  enabled: true
});

moduleRegistry.registerModule({
  key: 'customers',
  name: 'CRM',
  icon: 'UserOutlined',
  description: '客户关系管理',
  component: () => import('./customer/CustomerModule').then(m => m.default),
  enabled: true
});

moduleRegistry.registerModule({
  key: 'orders',
  name: '订单',
  icon: 'ShoppingOutlined',
  description: '订单管理',
  component: () => import('./order/OrderModule').then(m => m.default),
  enabled: true
});

moduleRegistry.registerModule({
  key: 'ai',
  name: 'AI 助手',
  icon: 'RobotOutlined',
  description: 'AI 辅助',
  component: () => import('./ai/AIModule').then(m => m.default),
  enabled: true
});

// 新增PI制作模块
moduleRegistry.registerModule({
  key: 'pi',
  name: 'PI制作',
  icon: 'FileTextOutlined',
  description: 'PI（形式发票）制作和管理',
  component: () => import('./pi/PIModule').then(m => m.default),
  enabled: true
});

// 新增产品中心模块
moduleRegistry.registerModule({
  key: 'products',
  name: '产品中心',
  icon: 'ShoppingOutlined',
  description: '产品管理和展示',
  component: () => import('./products/ProductsModule').then(m => m.default),
  enabled: true
});

// 新增SHOPIFY集成模块
moduleRegistry.registerModule({
  key: 'shopify',
  name: 'SHOPIFY集成',
  icon: 'ShoppingCartOutlined',
  description: 'SHOPIFY平台集成',
  component: () => import('./shopify/ShopifyModule').then(m => m.default),
  enabled: true
});

// 新增FACEBOOK集成模块
moduleRegistry.registerModule({
  key: 'facebook',
  name: 'FACEBOOK集成',
  icon: 'MessageOutlined',
  description: 'Facebook平台集成',
  component: () => import('./facebook/FacebookModule').then(m => m.default),
  enabled: true
});

// 新增YOUTUBE集成模块
moduleRegistry.registerModule({
  key: 'youtube',
  name: 'YOUTUBE集成',
  icon: 'VideoCameraOutlined',
  description: 'YouTube平台集成',
  component: () => import('./youtube/YoutubeModule').then(m => m.default),
  enabled: true
});

// 联系人管理模块
moduleRegistry.registerModule({
  key: 'contact',
  name: '联系人',
  icon: 'UserOutlined',
  description: '联系人管理系统',
  component: () => import('./contact/ContactManager').then(m => m.default),
  enabled: true
});

// 系统状态模块 - 移到最后
moduleRegistry.registerModule({
  key: 'system',
  name: '系统状态',
  icon: 'SettingOutlined',
  description: '系统监控',
  component: () => import('./system/SystemModule').then(m => m.default),
  enabled: true
});



// 社区相关模块 - 作为"使用社区"子菜单存在，这里不单独注册
// moduleRegistry.registerModule({
//   key: 'about',
//   name: '关于系统',
//   icon: 'TeamOutlined',
//   description: '系统信息和更新日志',
//   component: () => import('./community/AboutModule').then(m => m.default),
//   enabled: true
// });

// moduleRegistry.registerModule({
//   key: 'faq',
//   name: 'FQA',
//   icon: 'QuestionCircleOutlined',
//   description: '常见问题解答',
//   component: () => import('./community/FQAModule').then(m => m.default),
//   enabled: true
// });

// moduleRegistry.registerModule({
//   key: 'forum',
//   name: '论坛',
//   icon: 'MessageOutlined',
//   description: '社区交流论坛',
//   component: () => import('./community/ForumModule').then(m => m.default),
//   enabled: true
// });
