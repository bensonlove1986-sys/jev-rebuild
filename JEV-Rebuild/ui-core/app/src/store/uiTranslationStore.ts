// uiTranslationStore.ts - 用于存储翻译结果，仅作为UI层状态，不影响消息原始结构

export type TranslationEntry = {
  messageId: string
  translatedText: string
  sourceLang?: string
  targetLang?: string
  createdAt: number
}

// 使用Map存储翻译结果，key为messageId
class UiTranslationStore {
  private store: Map<string, TranslationEntry>

  constructor() {
    this.store = new Map()
  }

  // 添加或更新翻译结果
  setTranslation(messageId: string, translatedText: string, sourceLang?: string, targetLang?: string): void {
    this.store.set(messageId, {
      messageId,
      translatedText,
      sourceLang,
      targetLang,
      createdAt: Date.now()
    })
  }

  // 获取翻译结果
  getTranslation(messageId: string): TranslationEntry | undefined {
    return this.store.get(messageId)
  }

  // 检查是否存在翻译结果
  hasTranslation(messageId: string): boolean {
    return this.store.has(messageId)
  }

  // 删除翻译结果
  removeTranslation(messageId: string): void {
    this.store.delete(messageId)
  }

  // 清空所有翻译结果
  clear(): void {
    this.store.clear()
  }
}

// 导出单例实例
export const uiTranslationStore = new UiTranslationStore()
