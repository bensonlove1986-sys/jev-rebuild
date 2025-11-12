// JEV 客户端配置
const clientConfig = {
  client: {
    name: "JEV 客户端",
    version: "1.0.0",
    features: {
      dark_mode: true,
      responsive: true,
      notifications: true,
      offline_mode: true
    },
    responsive: true,
    browser_compatibility: {
      supported_browsers: [
        {
          name: "Chrome",
          minimum_version: "90"
        },
        {
          name: "Firefox",
          minimum_version: "88"
        },
        {
          name: "Safari",
          minimum_version: "14"
        },
        {
          name: "Edge",
          minimum_version: "90"
        }
      ],
      mobile_support: {
        ios: {
          minimum_version: "14.0"
        },
        android: {
          minimum_version: "10.0"
        }
      }
    },
    default_language: "zh-CN",
    supported_languages: ["zh-CN", "en-US", "ja-JP", "ko-KR"],
    api_endpoints: {
      main: "/api",
      auth: "/api/auth",
      messages: "/api/messages",
      users: "/api/users"
    },
    timeout_settings: {
      api_request: 30000,
      connection_check: 5000,
      message_send: 10000
    },
    cache_settings: {
      max_items: 100,
      ttl: 3600000
    }
  },
  ui: {
    theme: {
      primary: "#007bff",
      secondary: "#6c757d",
      success: "#28a745",
      danger: "#dc3545",
      warning: "#ffc107",
      info: "#17a2b8",
      light: "#f8f9fa",
      dark: "#343a40"
    },
    components: {
      chat: {
        auto_scroll: true,
        max_messages: 500,
        show_typing_indicator: true,
        enable_emoji_picker: true
      },
      notifications: {
        position: "top-right",
        auto_close: true,
        timeout: 5000
      }
    }
  },
  security: {
    enable_encryption: true,
    session_timeout: 3600000,
    remember_login: true,
    use_local_storage: true,
    secure_cookies: true
  },
  performance: {
    lazy_load: true,
    minify_resources: true,
    use_cdn: false,
    cache_assets: true
  },
  debug: {
    enabled: false,
    log_level: "error",
    console_logging: false,
    network_logging: false
  }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = clientConfig;
} else if (typeof window !== 'undefined') {
  window.clientConfig = clientConfig;
}
