// 一次性迁移脚本：清洗所有历史消息的 media_path
// 注意：这是一次性脚本，执行后应删除或注释

const fs = require('fs');
const path = require('path');

// 存储文件路径
const storageDir = path.join(process.cwd(), 'worker-core', 'storage');
const messageStorePath = path.join(storageDir, 'messages.json');

// 统一修复函数（必须原样使用）
function fixMediaPath(media_path) {
  if (!media_path) return undefined;

  // 已经正确
  if (media_path.startsWith('/api/media/')) {
    return media_path;
  }

  // 包含 https 的历史污染数据
  if (media_path.includes('http')) {
    const idx = media_path.indexOf('/api/media/');
    if (idx !== -1) {
      return media_path.slice(idx);
    }
    return undefined;
  }

  // 其他异常格式直接丢弃
  return undefined;
}

// 从文件加载存储
function loadStore(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[STORAGE_LOAD_ERROR]', error);
  }
  return {};
}

// 保存存储到文件
function saveStore(filePath, data) {
  try {
    // 确保存储目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[STORAGE_SAVE_ERROR]', error);
  }
}

// 主迁移函数
async function migrateMediaPath() {
  console.log('[MEDIA_PATH_MIGRATION_START] Starting media_path migration');

  // 加载本地 messageStore
  const messageStoreData = loadStore(messageStorePath);
  const messageStore = new Map(Object.entries(messageStoreData));

  let totalChats = 0;
  let totalMessages = 0;
  let totalFixed = 0;
  let totalDropped = 0;

  // 遍历所有聊天
  for (const [storageKey, messages] of messageStore.entries()) {
    if (Array.isArray(messages) && messages.length > 0) {
      totalChats++;
      let changed = false;

      console.log(`[MIGRATION_PROCESSING] Processing chat: ${storageKey} with ${messages.length} messages`);

      // 遍历每条消息
      for (const msg of messages) {
        totalMessages++;
        if (msg.media_path) {
          const original = msg.media_path;
          const fixed = fixMediaPath(msg.media_path);

          if (!fixed) {
            console.log('[MEDIA_PATH_CLEAN_DROP]', {
              chatId: storageKey,
              message_id: msg.message_id,
              original: original
            });
            delete msg.media_path;
            changed = true;
            totalDropped++;
          } else if (fixed !== msg.media_path) {
            console.log('[MEDIA_PATH_CLEAN_FIX]', {
              chatId: storageKey,
              message_id: msg.message_id,
              original: original,
              fixed: fixed
            });
            msg.media_path = fixed;
            changed = true;
            totalFixed++;
          }
        }
      }

      // 如果有变化，保存回存储
      if (changed) {
        messageStore.set(storageKey, messages);
        console.log(`[MEDIA_PATH_CHAT_UPDATED] Updated chat: ${storageKey}`);
      }
    }
  }

  // 保存所有修改
  saveStore(messageStorePath, Object.fromEntries(messageStore));

  console.log('[MEDIA_PATH_MIGRATION_DONE] Migration completed');
  console.log(`[MIGRATION_STATS]`);
  console.log(`- Total chats processed: ${totalChats}`);
  console.log(`- Total messages processed: ${totalMessages}`);
  console.log(`- Total media_path fixed: ${totalFixed}`);
  console.log(`- Total media_path dropped: ${totalDropped}`);

  // 注意：对于 Durable Object 存储，需要在 Cloudflare Workers 环境中执行类似的迁移
  console.log('[MIGRATION_NOTE] For Durable Object storage, you need to run a similar migration in the Cloudflare Workers environment');
  console.log('[MIGRATION_NOTE] This script only processes local messageStore, not Durable Object storage');
}

// 执行迁移
migrateMediaPath().catch(error => {
  console.error('[MIGRATION_ERROR]', error);
});
