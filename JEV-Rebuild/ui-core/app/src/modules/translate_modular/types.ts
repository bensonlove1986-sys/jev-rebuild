// 翻译模块类型定义

// 翻译状态
export type TranslationStatus = 'done' | 'error' | 'loading';

// 翻译模式
export type TranslationMode = 'auto' | 'manual';

// 翻译结果结构
export interface TranslationResult {
  target: string; // 目标语言，固定为 "zh-CN"
  text: string; // 翻译后的中文
  engine: string; // 翻译引擎，固定为 "deepseek"
  mode: TranslationMode; // 翻译模式
  status: TranslationStatus; // 翻译状态
}

// 扩展消息类型，添加翻译字段
export interface MessageWithTranslation {
  translation?: TranslationResult;
}

// 翻译配置
export interface TranslationConfig {
  mode: TranslationMode; // 翻译模式
  autoTranslateInbound: boolean; // 是否自动翻译入站消息
  targetLanguage: string; // 目标语言
}
