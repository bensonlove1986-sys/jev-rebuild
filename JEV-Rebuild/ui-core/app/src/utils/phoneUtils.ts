// 电话号码国家判断工具

interface CountryInfo {
  name: string;
  code: string;
  prefix: string;
}

// 支持的国家列表
const COUNTRIES: CountryInfo[] = [
  { name: '中国', code: 'CN', prefix: '+86' },
  { name: '美国', code: 'US', prefix: '+1' },
  { name: '日本', code: 'JP', prefix: '+81' },
  { name: '韩国', code: 'KR', prefix: '+82' },
  { name: '英国', code: 'GB', prefix: '+44' },
  { name: '法国', code: 'FR', prefix: '+33' },
  { name: '德国', code: 'DE', prefix: '+49' },
  { name: '澳大利亚', code: 'AU', prefix: '+61' },
  { name: '加拿大', code: 'CA', prefix: '+1' },
  { name: '新加坡', code: 'SG', prefix: '+65' },
  { name: '印度', code: 'IN', prefix: '+91' },
  { name: '俄罗斯', code: 'RU', prefix: '+7' },
  { name: '巴西', code: 'BR', prefix: '+55' },
  { name: '墨西哥', code: 'MX', prefix: '+52' },
  { name: '印度尼西亚', code: 'ID', prefix: '+62' },
  { name: '泰国', code: 'TH', prefix: '+66' },
  { name: '马来西亚', code: 'MY', prefix: '+60' },
  { name: '越南', code: 'VN', prefix: '+84' },
  { name: '菲律宾', code: 'PH', prefix: '+63' }
];

/**
 * 根据电话号码判断所属国家
 * @param phone 电话号码
 * @returns 国家信息或未知
 */
export function getCountryFromPhone(phone: string): CountryInfo {
  if (!phone) {
    return { name: '未知', code: 'Unknown', prefix: '' };
  }

  // 标准化电话号码格式
  let normalizedPhone = phone.replace(/\s+/g, ''); // 移除空格
  normalizedPhone = normalizedPhone.replace(/^00/, '+'); // 将 00 替换为 +

  // 优先匹配带国际区号的电话号码
  for (const country of COUNTRIES) {
    if (normalizedPhone.startsWith(country.prefix)) {
      return country;
    }
  }

  // 检查是否是中国手机号（不带国际区号）
  const chinaMobileRegex = /^1[3-9]\d{9}$/;
  if (chinaMobileRegex.test(normalizedPhone)) {
    return COUNTRIES[0]; // 中国
  }

  return { name: '未知', code: 'Unknown', prefix: '' };
}

/**
 * 格式化电话号码
 * @param phone 电话号码
 * @returns 格式化后的电话号码
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // 移除所有非数字字符，只保留 + 号
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // 中国手机号特殊处理
  if (cleaned.startsWith('+861') && cleaned.length === 13) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7, 11)} ${cleaned.slice(11)}`;
  }
  
  return cleaned;
}

/**
 * 验证电话号码格式
 * @param phone 电话号码
 * @returns 是否是有效电话号码
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 8 && cleaned.length <= 15;
}

/**
 * 获取电话号码的国家代码
 * @param phone 电话号码
 * @returns 国家代码
 */
export function getCountryCodeFromPhone(phone: string): string {
  return getCountryFromPhone(phone).code;
}

/**
 * 获取电话号码的国家名称
 * @param phone 电话号码
 * @returns 国家名称
 */
export function getCountryNameFromPhone(phone: string): string {
  return getCountryFromPhone(phone).name;
}
