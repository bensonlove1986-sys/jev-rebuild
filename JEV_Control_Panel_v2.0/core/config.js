/**
 * 模块名称：CONFIG（全局配置）
 * 功能：集中管理所有配置项，包括API地址、时间间隔、端口等
 * 依赖模块：无
 * 作者：JEV 系统
 */

export const CONFIG = {
    VERSION: "L6.0",
    API_BASE: "http://localhost:1822",
    WORKER_URL: "https://jevshop.bensonlove1986.workers.dev",
    IMAGE_API: "https://tupianlujing.bensonlove1986.workers.dev",
    REFRESH_INTERVAL: 20000,
    HEARTBEAT_INTERVAL: 30000,
    DEFAULT_MODE: "AI",
    THEME: "dark",
    ENABLE_LOGGER: true,
    CHANNELS: ["website", "wechat", "whatsapp"],
    // 功能模块开关
    USE_MAILER: true
};
