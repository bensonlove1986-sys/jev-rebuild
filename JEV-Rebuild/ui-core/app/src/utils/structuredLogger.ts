// 日志级别常量
export const LogLevels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
} as const;

export type LogLevel = typeof LogLevels[keyof typeof LogLevels];

// 日志配置接口
interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  showTimestamp?: boolean;
  showLevel?: boolean;
}

// 日志条目接口
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  levelName: string;
  prefix?: string;
  message: string;
  data?: any;
  component?: string;
}

// 日志存储类 - 用于实时日志查看
export class LogStore {
  private static instance: LogStore;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // 最大日志数量，防止内存溢出
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  // 获取单例实例
  static getInstance(): LogStore {
    if (!LogStore.instance) {
      LogStore.instance = new LogStore();
    }
    return LogStore.instance;
  }

  // 添加日志条目
  addLog(entry: LogEntry): void {
    this.logs.unshift(entry); // 新日志添加到开头
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // 通知所有监听器
    this.listeners.forEach(listener => listener());
  }

  // 获取日志列表
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // 清空日志
  clearLogs(): void {
    this.logs = [];
    this.listeners.forEach(listener => listener());
  }

  // 添加监听器
  addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  // 移除监听器
  removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }
}

// 结构化日志工具类
class StructuredLogger {
  private config: LoggerConfig;
  private component?: string;
  private logStore: LogStore;

  constructor(config?: Partial<LoggerConfig>, component?: string) {
    this.config = {
      level: LogLevels.DEBUG,
      prefix: 'APP',
      showTimestamp: true,
      showLevel: true,
      ...config
    };
    this.component = component;
    this.logStore = LogStore.getInstance();
  }

  // 设置日志级别
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  // 设置组件名称
  setComponent(component: string): void {
    this.component = component;
  }

  // 创建带组件名称的logger实例
  withComponent(component: string): StructuredLogger {
    return new StructuredLogger(this.config, component);
  }

  // 格式化日志条目
  private formatLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    const levelName = Object.keys(LogLevels).find(key => LogLevels[key as keyof typeof LogLevels] === level) || 'UNKNOWN';
    
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      levelName,
      prefix: this.config.prefix,
      message,
      data,
      component: this.component
    };
    
    return entry;
  }

  // 打印日志
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.config.level) {
      return;
    }

    const entry = this.formatLogEntry(level, message, data);
    
    // 添加到日志存储，用于实时查看
    this.logStore.addLog(entry);
    
    const formattedMessage = this.formatConsoleMessage(entry);
    
    // 只有当data存在时，才将其作为第二个参数传递给console方法
    // 避免输出undefined
    switch (level) {
      case LogLevels.DEBUG:
        if (data !== undefined) {
          console.debug(formattedMessage, data);
        } else {
          console.debug(formattedMessage);
        }
        break;
      case LogLevels.INFO:
        if (data !== undefined) {
          console.info(formattedMessage, data);
        } else {
          console.info(formattedMessage);
        }
        break;
      case LogLevels.WARN:
        if (data !== undefined) {
          console.warn(formattedMessage, data);
        } else {
          console.warn(formattedMessage);
        }
        break;
      case LogLevels.ERROR:
        if (data !== undefined) {
          console.error(formattedMessage, data);
        } else {
          console.error(formattedMessage);
        }
        break;
      case LogLevels.FATAL:
        if (data !== undefined) {
          console.error(formattedMessage, data);
        } else {
          console.error(formattedMessage);
        }
        break;
    }
  }

  // 格式化控制台消息
  private formatConsoleMessage(entry: LogEntry): string {
    const parts: string[] = [];
    
    if (this.config.showTimestamp) {
      parts.push(`[${new Date(entry.timestamp).toISOString()}]`);
    }
    
    if (this.config.showLevel) {
      parts.push(`[${entry.levelName}]`);
    }
    
    if (entry.prefix) {
      parts.push(`[${entry.prefix}]`);
    }
    
    if (entry.component) {
      parts.push(`[${entry.component}]`);
    }
    
    parts.push(entry.message);
    
    return parts.join(' ');
  }

  // 调试日志
  debug(message: string, data?: any): void {
    this.log(LogLevels.DEBUG, message, data);
  }

  // 信息日志
  info(message: string, data?: any): void {
    this.log(LogLevels.INFO, message, data);
  }

  // 警告日志
  warn(message: string, data?: any): void {
    this.log(LogLevels.WARN, message, data);
  }

  // 错误日志
  error(message: string, data?: any): void {
    this.log(LogLevels.ERROR, message, data);
  }

  // 致命错误日志
  fatal(message: string, data?: any): void {
    this.log(LogLevels.FATAL, message, data);
  }

  // 性能监控日志
  performance(event: string, duration: number, data?: any): void {
    this.log(
      LogLevels.INFO,
      `Performance metric: ${event}`,
      { duration, ...data }
    );
  }
}

// 创建默认logger实例
const defaultLogger = new StructuredLogger();

// 导出单例logger
export const logger = defaultLogger;

// 导出带组件名称的logger创建函数
export const createLogger = (component: string): StructuredLogger => {
  return defaultLogger.withComponent(component);
};

// 导出日志存储单例
export const logStore = LogStore.getInstance();
