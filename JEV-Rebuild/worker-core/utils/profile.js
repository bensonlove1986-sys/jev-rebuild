// 统一的 Profile 写入函数 - 确保 profile 在第一次出现 customer_id 时被写入 KV（安全版本）

export async function ensureProfile(env, customerId, source, displayName = customerId, customerInfo = {}) {
  // 生成 customer key，使用正确的前缀
  const customerKey = `customer:${customerId}`;
  
  // 尝试从 KV 读取现有档案
  let existingProfile = null;
  try {
    if (env.INBOX_KV?.get) {
      const existingProfileRaw = await env.INBOX_KV.get(customerKey);
      if (existingProfileRaw) {
        existingProfile = JSON.parse(existingProfileRaw);
        console.log(`[PROFILE_READ_SUCCESS] ${customerKey}`);
      }
    }
  } catch (e) {
    console.error(`[PROFILE_READ_FAIL] ${customerKey} error:`, e);
  }
  
  // 3.1 后端：确保 stable_name 的来源与持久化
  // 确定 stable_name 的来源：使用新的 displayName（如果有效）或现有档案中的 stable_name
  const resolvedStableName = displayName !== customerId ? displayName : existingProfile?.stable_name || existingProfile?.display_name || existingProfile?.customer_name || existingProfile?.real_name || displayName;
  
  // 创建或更新 profile 对象
  const customerProfile = {
    ...existingProfile, // 保留现有档案的字段
    customer_id: customerId,
    // 只有当提供了新的 displayName 或现有档案没有名称时，才更新名称字段
    display_name: displayName !== customerId ? displayName : existingProfile?.display_name || displayName,
    real_name: displayName !== customerId ? displayName : existingProfile?.real_name || displayName,
    customer_name: displayName !== customerId ? displayName : existingProfile?.customer_name || displayName,
    // 添加 stable_name 字段，确保稳定返回
    stable_name: resolvedStableName,
    source: source,
    last_message_at: Date.now(),
    created_at: existingProfile?.created_at || Date.now(),
    updated_at: Date.now(),
    // 添加地址相关字段（如果不存在）
    address: existingProfile?.address || '',
    city: existingProfile?.city || '',
    state: existingProfile?.state || '',
    zip_code: existingProfile?.zip_code || '',
    // 添加额外的客户信息（如果提供）
    ...customerInfo
  };
  
  // 打印 profile 快照
  console.log('[PROFILE_SNAPSHOT]', {
    stable_name: customerProfile.stable_name,
    display_name: customerProfile.display_name,
    profile_keys: Object.keys(customerProfile)
  });
  
  console.log('[PROFILE_NAME_RESOLVED]', {
    customer_id: customerId,
    stable_name: customerProfile.stable_name,
    source_field: displayName !== customerId ? 'new_displayName' : existingProfile?.stable_name ? 'existing_stable_name' : 'fallback'
  });
  
  console.log('[PROFILE_EXTRA_INFO]', {
    customer_id: customerId,
    extra_fields: Object.keys(customerInfo)
  });
  
  // 安全写入 KV - 允许失败，不影响主流程
  let kvSaved = false;
  try {
    if (env.INBOX_KV?.put) {
      await env.INBOX_KV.put(customerKey, JSON.stringify(customerProfile));
      kvSaved = true;
      console.log(`[PROFILE_WRITE_OK] ${customerKey} source=${source} display_name=${customerProfile.display_name} stable_name=${customerProfile.stable_name} extra_fields=${Object.keys(customerInfo).length}`);
    } else {
      console.warn(`[PROFILE_WRITE_SKIP] INBOX_KV not bound or missing put method`);
    }
  } catch (e) {
    console.error(`[PROFILE_WRITE_FAIL] ${customerKey} error:`, e);
  }
  
  return customerProfile;
}