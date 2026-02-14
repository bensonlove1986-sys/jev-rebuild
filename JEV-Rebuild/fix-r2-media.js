// 一次性修复脚本：修复 R2 中缺失的历史 WhatsApp 图片实体
// 注意：这是一次性脚本，执行后应删除或注释

const fs = require('fs');
const path = require('path');

// 存储文件路径
const storageDir = path.join(process.cwd(), 'worker-core', 'storage');
const messageStorePath = path.join(storageDir, 'messages.json');

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

// 从 media_path 提取 R2 key
function getR2KeyFromMediaPath(media_path) {
  if (!media_path || !media_path.startsWith('/api/media/r2/')) {
    return null;
  }
  return media_path.substring('/api/media/r2/'.length);
}

// 从 R2 key 提取 Twilio Media URL
function getTwilioMediaUrlFromR2Key(r2Key) {
  // R2 key 格式：whatsapp/{MediaSid}/{MessageSid}
  const parts = r2Key.split('/');
  if (parts.length >= 3 && parts[0] === 'whatsapp') {
    const mediaSid = parts[1];
    return `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages/${parts[2]}/Media/${mediaSid}`;
  }
  return null;
}

// 检查 R2 对象是否存在（模拟）
async function checkR2ObjectExists(r2Key) {
  // 注意：在真实环境中，这里应该使用 R2 存储的 API 来检查对象是否存在
  // 由于这是本地开发环境，我们模拟 R2 存储
  console.log(`[R2_CHECK] Checking if object exists: ${r2Key}`);
  
  // 模拟所有对象都不存在，以便测试补救逻辑
  return false;
}

// 从 Twilio Media API 拉取媒体并写入 R2（模拟）
async function fetchFromTwilioAndWriteToR2(mediaUrl, r2Key) {
  // 注意：在真实环境中，这里应该：
  // 1. 使用 Twilio 凭证从 MediaUrl 拉取二进制数据
  // 2. 将二进制数据写入 R2 存储，使用 r2Key 作为键
  
  console.log(`[TWILIO_FETCH] Fetching media from Twilio: ${mediaUrl}`);
  console.log(`[R2_WRITE] Writing to R2 with key: ${r2Key}`);
  
  // 模拟成功
  return true;
}

// 主修复函数
async function fixR2Media() {
  console.log('[R2_MEDIA_FIX_START] Starting R2 media fix');

  // 加载本地 messageStore
  const messageStoreData = loadStore(messageStorePath);
  const messageStore = new Map(Object.entries(messageStoreData));

  let totalChats = 0;
  let totalMessages = 0;
  let totalMediaMessages = 0;
  let totalMissingMedia = 0;
  let totalFixed = 0;
  let totalDropped = 0;

  // 遍历所有聊天
  for (const [storageKey, messages] of messageStore.entries()) {
    if (Array.isArray(messages) && messages.length > 0) {
      totalChats++;
      let changed = false;

      console.log(`[FIX_PROCESSING] Processing chat: ${storageKey} with ${messages.length} messages`);

      // 遍历每条消息
      for (const msg of messages) {
        totalMessages++;
        if (msg.media_path) {
          totalMediaMessages++;
          const mediaPath = msg.media_path;
          const r2Key = getR2KeyFromMediaPath(mediaPath);

          if (!r2Key) {
            console.log('[MEDIA_PATH_INVALID] Invalid media_path format:', mediaPath);
            delete msg.media_path;
            changed = true;
            totalDropped++;
            continue;
          }

          // 检查 R2 对象是否存在
          const exists = await checkR2ObjectExists(r2Key);

          if (!exists) {
            totalMissingMedia++;
            console.log('[R2_OBJECT_MISSING] R2 object not found for:', mediaPath);

            // 尝试从 Twilio Media API 重新拉取
            const mediaUrl = getTwilioMediaUrlFromR2Key(r2Key);

            if (mediaUrl) {
              console.log('[TWILIO_RETRY] Attempting to fetch from Twilio:', mediaUrl);
              const success = await fetchFromTwilioAndWriteToR2(mediaUrl, r2Key);

              if (success) {
                console.log('[R2_FIX_SUCCESS] Successfully fetched from Twilio and wrote to R2:', r2Key);
                totalFixed++;
              } else {
                console.log('[TWILIO_FETCH_FAILED] Failed to fetch from Twilio, dropping media_path:', mediaPath);
                delete msg.media_path;
                changed = true;
                totalDropped++;
              }
            } else {
              console.log('[MEDIA_URL_INVALID] Could not extract media URL from R2 key, dropping media_path:', mediaPath);
              delete msg.media_path;
              changed = true;
              totalDropped++;
            }
          } else {
            console.log('[R2_OBJECT_FOUND] R2 object exists for:', mediaPath);
          }
        }
      }

      // 如果有变化，保存回存储
      if (changed) {
        messageStore.set(storageKey, messages);
        console.log(`[R2_MEDIA_CHAT_UPDATED] Updated chat: ${storageKey}`);
      }
    }
  }

  // 保存所有修改
  saveStore(messageStorePath, Object.fromEntries(messageStore));

  console.log('[R2_MEDIA_FIX_DONE] R2 media fix completed');
  console.log(`[FIX_STATS]`);
  console.log(`- Total chats processed: ${totalChats}`);
  console.log(`- Total messages processed: ${totalMessages}`);
  console.log(`- Total media messages: ${totalMediaMessages}`);
  console.log(`- Total missing media: ${totalMissingMedia}`);
  console.log(`- Total fixed: ${totalFixed}`);
  console.log(`- Total dropped: ${totalDropped}`);

  // 注意：在真实环境中，需要使用实际的 R2 存储 API
  console.log('[FIX_NOTE] This script uses simulated R2 storage. In production, use actual R2 API.');
  console.log('[FIX_NOTE] This is a one-time script. Remove or comment after execution.');
}

// 执行修复
fixR2Media().catch(error => {
  console.error('[FIX_ERROR]', error);
});
