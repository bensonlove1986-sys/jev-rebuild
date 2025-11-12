// JEV L7.8 Invite Manager - 邀请码管理模块
// 负责生成和验证邀请码，支持用户注册验证

class JEVInviteManager {
  constructor() {
    // 配置信息
    this.config = {
      inviteCodeLength: 12,
      defaultExpiryDays: 30,
      maxUsesPerCode: 1, // 默认每个邀请码只能使用一次
      codePrefix: 'JEV-'
    };

    // 邀请码存储（实际项目中应使用数据库）
    this.inviteCodes = new Map();
    
    // 初始化：从本地存储加载邀请码（仅用于演示）
    this.loadInviteCodes();
  }

  // 生成随机字符串
  generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 生成邀请码
  generateInviteCode(options = {}) {
    // 提取选项参数
    const { 
      expiryDays = this.config.defaultExpiryDays,
      maxUses = this.config.maxUsesPerCode,
      prefix = this.config.codePrefix,
      metadata = {}
    } = options;

    // 生成邀请码
    const randomPart = this.generateRandomString(this.config.inviteCodeLength);
    const year = new Date().getFullYear();
    const codeNumber = String(this.inviteCodes.size + 1).padStart(3, '0');
    const inviteCode = `${prefix}${year}-${codeNumber}-${randomPart}`;

    // 计算过期时间
    const expires = new Date();
    expires.setDate(expires.getDate() + expiryDays);

    // 创建邀请码对象
    const inviteData = {
      invite_code: inviteCode,
      created_at: new Date().toISOString(),
      expires: expires.toISOString(),
      status: 'active',
      bound_user: null,
      uses: 0,
      max_uses: maxUses,
      metadata
    };

    // 存储邀请码
    this.inviteCodes.set(inviteCode, inviteData);
    
    // 保存到本地存储（仅用于演示）
    this.saveInviteCodes();

    return {
      success: true,
      data: inviteData
    };
  }

  // 验证邀请码
  validateInviteCode(inviteCode) {
    // 查找邀请码
    const inviteData = this.inviteCodes.get(inviteCode);

    // 检查邀请码是否存在
    if (!inviteData) {
      return {
        success: false,
        message: '邀请码不存在',
        code: 'INVALID_CODE'
      };
    }

    // 检查状态
    if (inviteData.status !== 'active') {
      return {
        success: false,
        message: '邀请码已失效',
        code: 'INACTIVE_CODE'
      };
    }

    // 检查是否过期
    const now = new Date();
    const expires = new Date(inviteData.expires);
    if (now > expires) {
      // 更新状态为过期
      inviteData.status = 'expired';
      this.saveInviteCodes();
      
      return {
        success: false,
        message: '邀请码已过期',
        code: 'EXPIRED_CODE'
      };
    }

    // 检查使用次数
    if (inviteData.uses >= inviteData.max_uses) {
      // 更新状态为已使用
      inviteData.status = 'used';
      this.saveInviteCodes();
      
      return {
        success: false,
        message: '邀请码已被使用',
        code: 'USED_CODE'
      };
    }

    // 检查是否已绑定用户
    if (inviteData.bound_user) {
      return {
        success: false,
        message: '邀请码已绑定到其他用户',
        code: 'BOUND_CODE'
      };
    }

    // 邀请码有效
    return {
      success: true,
      data: inviteData
    };
  }

  // 使用邀请码（绑定用户）
  useInviteCode(inviteCode, userEmail) {
    // 先验证邀请码
    const validation = this.validateInviteCode(inviteCode);
    
    if (!validation.success) {
      return validation;
    }

    // 获取邀请码数据
    const inviteData = this.inviteCodes.get(inviteCode);

    // 更新使用信息
    inviteData.uses += 1;
    inviteData.bound_user = userEmail;
    inviteData.used_at = new Date().toISOString();

    // 如果达到最大使用次数，标记为已使用
    if (inviteData.uses >= inviteData.max_uses) {
      inviteData.status = 'used';
    }

    // 保存更新
    this.saveInviteCodes();

    return {
      success: true,
      message: '邀请码使用成功',
      data: inviteData
    };
  }

  // 撤销邀请码
  revokeInviteCode(inviteCode) {
    const inviteData = this.inviteCodes.get(inviteCode);

    if (!inviteData) {
      return {
        success: false,
        message: '邀请码不存在',
        code: 'INVALID_CODE'
      };
    }

    // 只能撤销未使用的邀请码
    if (inviteData.uses > 0 || inviteData.status !== 'active') {
      return {
        success: false,
        message: '无法撤销已使用或已失效的邀请码',
        code: 'CANNOT_REVOKE'
      };
    }

    // 更新状态为撤销
    inviteData.status = 'revoked';
    inviteData.revoked_at = new Date().toISOString();

    // 保存更新
    this.saveInviteCodes();

    return {
      success: true,
      message: '邀请码已撤销',
      data: inviteData
    };
  }

  // 获取邀请码列表
  getInviteCodes(filter = {}) {
    const codes = Array.from(this.inviteCodes.values());
    
    // 应用过滤条件
    if (filter.status) {
      return codes.filter(code => code.status === filter.status);
    }
    
    if (filter.user) {
      return codes.filter(code => code.bound_user === filter.user);
    }
    
    return codes;
  }

  // 查找邀请码
  findInviteCode(inviteCode) {
    return this.inviteCodes.get(inviteCode) || null;
  }

  // 从本地存储加载邀请码（仅用于演示）
  loadInviteCodes() {
    try {
      const stored = localStorage.getItem('JEV_INVITE_CODES');
      if (stored) {
        const codes = JSON.parse(stored);
        codes.forEach(code => {
          this.inviteCodes.set(code.invite_code, code);
        });
      }
    } catch (error) {
      console.error('Error loading invite codes from localStorage:', error);
    }
  }

  // 保存邀请码到本地存储（仅用于演示）
  saveInviteCodes() {
    try {
      const codes = Array.from(this.inviteCodes.values());
      localStorage.setItem('JEV_INVITE_CODES', JSON.stringify(codes));
    } catch (error) {
      console.error('Error saving invite codes to localStorage:', error);
    }
  }

  // 清理过期的邀请码
  cleanupExpiredCodes() {
    const now = new Date();
    let cleanedCount = 0;
    
    this.inviteCodes.forEach((code, key) => {
      if (code.status === 'active' && new Date(code.expires) < now) {
        code.status = 'expired';
        code.expired_at = now.toISOString();
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      this.saveInviteCodes();
    }
    
    return cleanedCount;
  }

  // 生成批量邀请码
  generateBatchInviteCodes(count, options = {}) {
    const codes = [];
    
    for (let i = 0; i < count; i++) {
      const result = this.generateInviteCode(options);
      if (result.success) {
        codes.push(result.data);
      }
    }
    
    return {
      success: true,
      count: codes.length,
      data: codes
    };
  }

  // 检查邀请码统计信息
  getInviteCodeStats() {
    const total = this.inviteCodes.size;
    const active = Array.from(this.inviteCodes.values()).filter(code => code.status === 'active').length;
    const used = Array.from(this.inviteCodes.values()).filter(code => code.status === 'used').length;
    const expired = Array.from(this.inviteCodes.values()).filter(code => code.status === 'expired').length;
    const revoked = Array.from(this.inviteCodes.values()).filter(code => code.status === 'revoked').length;
    
    return {
      total,
      active,
      used,
      expired,
      revoked,
      available: active
    };
  }
}

// 创建全局实例
const jevInviteManager = new JEVInviteManager();

// 导出（支持模块化使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = jevInviteManager;
} else if (typeof window !== 'undefined') {
  window.jevInviteManager = jevInviteManager;
}

export default jevInviteManager;

// 以下是用于集成到Client Gateway Bridge的API处理函数
// 这些函数应该在服务器端环境中使用

/**
 * 生成邀请码的API处理函数
 * @param {Object} request - HTTP请求对象
 * @param {Object} response - HTTP响应对象
 */
async function handleGenerateInvite(request, response) {
  try {
    // 这里应该添加身份验证，确保只有管理员可以生成邀请码
    
    // 解析请求体
    const body = await request.json();
    
    // 生成邀请码
    const result = jevInviteManager.generateInviteCode(body);
    
    if (result.success) {
      response.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      response.status(400).json({
        success: false,
        message: result.message || '生成邀请码失败'
      });
    }
  } catch (error) {
    response.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
}

/**
 * 验证邀请码的API处理函数
 * @param {Object} request - HTTP请求对象
 * @param {Object} response - HTTP响应对象
 */
async function handleValidateInvite(request, response) {
  try {
    // 解析请求体
    const body = await request.json();
    const { invite_code } = body;
    
    if (!invite_code) {
      return response.status(400).json({
        success: false,
        message: '缺少邀请码'
      });
    }
    
    // 验证邀请码
    const result = jevInviteManager.validateInviteCode(invite_code);
    
    response.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    response.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
}

/**
 * 使用邀请码的API处理函数（注册时调用）
 * @param {Object} request - HTTP请求对象
 * @param {Object} response - HTTP响应对象
 */
async function handleUseInvite(request, response) {
  try {
    // 解析请求体
    const body = await request.json();
    const { invite_code, user_email } = body;
    
    if (!invite_code || !user_email) {
      return response.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 使用邀请码
    const result = jevInviteManager.useInviteCode(invite_code, user_email);
    
    response.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    response.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
}

/**
 * 获取邀请码统计信息的API处理函数
 * @param {Object} request - HTTP请求对象
 * @param {Object} response - HTTP响应对象
 */
async function handleGetInviteStats(request, response) {
  try {
    // 这里应该添加身份验证
    
    const stats = jevInviteManager.getInviteCodeStats();
    
    response.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
}

// 导出API处理函数（服务器端使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleGenerateInvite,
    handleValidateInvite,
    handleUseInvite,
    handleGetInviteStats
  };
}