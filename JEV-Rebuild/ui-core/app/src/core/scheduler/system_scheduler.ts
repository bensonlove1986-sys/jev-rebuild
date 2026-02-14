/**
 * JEV-Rebuild Runtime Kernel
 *
 * Responsibilities:
 * - Action orchestration
 * - Priority scheduling
 * - State write gate
 * - Render batching
 *
 * DO NOT ADD:
 * - UI logic
 * - API calls
 * - Business rules
 *
 * This file is orchestration-only.
 */
// System Scheduler - 系统级调度中心
// 统一的 Action Dispatch 入口 + 单一状态写入通道 + 事件去重机制

import { useChatStore } from '@/modules/chat_modular/store/chatStore';
import { handleWSMessageReceived } from './handlers/message.handler';
import { handleOCRResultReceived } from './handlers/ocr.handler';
import { handlePresenceUpdated } from './handlers/presence.handler';

console.log("[SCHEDULER_MODULE_LOADED]")

type Action = {
  type: string
  key?: string
  payload?: any
  priority?: number
}

const globalAny = globalThis as any

if (!globalAny.__RUNNING_ACTIONS__) {
  globalAny.__RUNNING_ACTIONS__ = new Map<string, boolean>()
}

if (!globalAny.__MESSAGE_LOCKS__) {
  globalAny.__MESSAGE_LOCKS__ = new Map<string, boolean>()
}

const runningActions: Map<string, boolean> = globalAny.__RUNNING_ACTIONS__
const messageLocks: Map<string, boolean> = globalAny.__MESSAGE_LOCKS__

let actionQueue: Promise<any> = Promise.resolve()

// Render Stabilizer — Batch Gate
let pendingPatch: any = {}
let batchScheduled = false

// Priority Queue
let priorityQueue: Action[] = []
let priorityQueueProcessing = false

export function dispatch(action: Action) {
  if (action.priority) {
    // 高优先级 action 进入优先队列
    priorityQueue.push(action)
    processPriorityQueue()
  } else {
    // 普通 action 进入正常队列
    actionQueue = actionQueue.then(() => execute(action))
  }
  return actionQueue
}

async function processPriorityQueue() {
  if (priorityQueueProcessing) return
  
  priorityQueueProcessing = true
  
  try {
    // 按优先级排序（数字越大优先级越高）
    priorityQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0))
    
    while (priorityQueue.length > 0) {
      const action = priorityQueue.shift()
      if (action) {
        await execute(action)
      }
    }
  } finally {
    priorityQueueProcessing = false
  }
}

async function execute(action: Action) {
  const actionKey = action.key || action.type

  if (runningActions.has(actionKey)) {
    console.warn('[ACTION_SKIPPED_DUPLICATE]', actionKey)
    return
  }

  runningActions.set(actionKey, true)

  console.log('[ACTION_START]', action.type, actionKey)

  try {
    await reducer(action)
  } catch (err) {
    console.error('[ACTION_ERROR]', action.type, err)
  } finally {
    runningActions.delete(actionKey)
    console.log('[ACTION_END]', action.type, actionKey)
  }
}



async function reducer(action: Action) {
  switch (action.type) {

    case "AI_GENERATE_REPLY":
      const aiPatch = await handleAIGenerate(action.payload)
      if (aiPatch) {
        applyStatePatch(aiPatch)
      }
      return

    case "SEND_MESSAGE":
      const sendPatch = await handleSend(action.payload)
      if (sendPatch) {
        applyStatePatch(sendPatch)
      }
      return

    case "TRANSLATE_MESSAGE":
      const translatePatch = await handleTranslate(action.payload)
      if (translatePatch) {
        applyStatePatch(translatePatch)
      }
      return

    case "OCR_PROCESS":
      const ocrPatch = await handleOCR(action.payload)
      if (ocrPatch) {
        applyStatePatch(ocrPatch)
      }
      return

    case "WS_MESSAGE_RECEIVED":
      const wsPatch = await handleWSMessageReceived(action.payload)
      if (wsPatch) {
        applyStatePatch(wsPatch)
      }
      return

    case "AI_RESULT_RECEIVED":
      // AI 结果处理已移除
      console.log('[AI_RESULT_RECEIVED] AI result handling removed')
      return

    case "OCR_RESULT_RECEIVED":
      const ocrResultPatch = await handleOCRResultReceived(action.payload)
      if (ocrResultPatch) {
        applyStatePatch(ocrResultPatch)
      }
      return

    case "PRESENCE_UPDATED":
      const presencePatch = await handlePresenceUpdated(action.payload)
      if (presencePatch) {
        applyStatePatch(presencePatch)
      }
      return

    case "STATE_PATCH":
      applyStatePatch(action.payload)
      return

    default:
      console.warn("[UNKNOWN_ACTION]", action.type)
  }
}



function applyStatePatch(patch: any) {
  // merge patch
  pendingPatch = {
    ...pendingPatch,
    ...patch,
    chat: {
      ...(pendingPatch.chat || {}),
      ...(patch.chat || {})
    }
  }

  if (!batchScheduled) {
    batchScheduled = true

    queueMicrotask(() => {
      try {
        if (pendingPatch.chat) {
          const chatStore = useChatStore.getState()
          
          // 处理 messages 更新
          if (pendingPatch.chat.messages) {
            const messagesPatch = pendingPatch.chat.messages
            
            // 检查是否是函数形式的更新
            if (typeof messagesPatch === 'function') {
              // 获取当前消息
              const currentMessages = [] // chatStore.messages 是按 chatId 组织的，这里需要根据具体情况处理
              // 由于 chatStore 的结构，我们需要使用 appendMessage 方法来添加消息
              // 这里简化处理，假设 messagesPatch 返回的是新消息数组
              const newMessages = messagesPatch(currentMessages)
              
              // 遍历新消息并添加
              if (Array.isArray(newMessages)) {
                newMessages.forEach(message => {
                  if (message) {
                    chatStore.appendMessage(message, 'SYSTEM_SCHEDULER')
                  }
                })
              }
            } else if (Array.isArray(messagesPatch)) {
              // 如果是数组形式的更新，遍历并添加
              messagesPatch.forEach(message => {
                if (message) {
                  chatStore.appendMessage(message, 'SYSTEM_SCHEDULER')
                }
              })
            }
          }
        }

        // 如果未来有 otherStore，在这里一起 flush
        // if (pendingPatch.other) otherStore.setState(pendingPatch.other)

      } finally {
        pendingPatch = {}
        batchScheduled = false
      }
    })
  }
}

export async function withMessageLock(message_id: string, fn: () => Promise<any>) {
  if (messageLocks.has(message_id)) {
    console.warn('[MESSAGE_LOCKED]', message_id)
    return
  }

  messageLocks.set(message_id, true)

  try {
    await fn()
  } catch (err) {
    console.error('[MESSAGE_LOCK_ERROR]', message_id, err)
  } finally {
    messageLocks.delete(message_id)
  }
}

// TODO[SCHEDULER_SPLIT]:
// handler logic should be moved to core/scheduler/handlers/
// system_scheduler must remain orchestration-only.
async function handleAIGenerate(payload: any) {
  const { message_id } = payload || {}
  if (message_id) {
    await withMessageLock(message_id, async () => {
      // AI 生成逻辑将在这里实现
      console.log('[AI_GENERATE_REPLY]', message_id)
    })
  }
  // 返回 patch
  return {}
}

// TODO[SCHEDULER_SPLIT]:
// handler logic should be moved to core/scheduler/handlers/
// system_scheduler must remain orchestration-only.
async function handleSend(payload: any) {
  const { message_id } = payload || {}
  if (message_id) {
    await withMessageLock(message_id, async () => {
      // 发送逻辑将在这里实现
      console.log('[SEND_MESSAGE]', message_id)
    })
  }
  // 返回 patch
  return {}
}

// TODO[SCHEDULER_SPLIT]:
// handler logic should be moved to core/scheduler/handlers/
// system_scheduler must remain orchestration-only.
async function handleTranslate(payload: any) {
  const { message_id } = payload || {}
  if (message_id) {
    await withMessageLock(message_id, async () => {
      // 翻译逻辑将在这里实现
      console.log('[TRANSLATE_MESSAGE]', message_id)
    })
  }
  // 返回 patch
  return {}
}

// TODO[SCHEDULER_SPLIT]:
// handler logic should be moved to core/scheduler/handlers/
// system_scheduler must remain orchestration-only.
async function handleOCR(payload: any) {
  const { message_id } = payload || {}
  if (message_id) {
    await withMessageLock(message_id, async () => {
      // OCR 逻辑将在这里实现
      console.log('[OCR_PROCESS]', message_id)
    })
  }
  // 返回 patch
  return {}
}
