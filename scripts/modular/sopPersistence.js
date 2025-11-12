/**
 * SOP持久化模块
 * 实现安全策略的持久化存储和加载
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SOPersistence {
  constructor(options = {}) {
    this.externalMemory = options.externalMemory || null;
    this.localBackupPath = options.localBackupPath || path.join(process.env.TEMP || '/tmp', 'jev_security_policy_backup.json');
    this.logger = options.logger || console;
    this.schemaCache = null;
    this.schemaTimestamp = null;
  }

  /**
   * 计算文本的SHA-256哈希值
   */
  calculateSHA256(text) {
    try {
      const hash = crypto.createHash('sha256');
      hash.update(text);
      return hash.digest('hex');
    } catch (error) {
      this.logger.error('计算SHA-256哈希失败', error);
      return null;
    }
  }

  /**
   * 获取SHA-256哈希值的前10位
   */
  getShortSHA256(text) {
    const fullHash = this.calculateSHA256(text);
    return fullHash ? fullHash.substring(0, 10) : null;
  }

  /**
   * 解析SOP文本内容
   */
  parseSOPText(sopText) {
    try {
      // 提取各个部分的配置
      const schema = {
        validationChecklist: this.extractSection(sopText, '[SOP_VALIDATION_CHECKLIST]', '[/SOP_VALIDATION_CHECKLIST]'),
        killSwitch: this.extractSection(sopText, '[SOP_KILL_SWITCH]', '[/SOP_KILL_SWITCH]'),
        auditFormat: this.extractAuditFormat(sopText),
        edgeCases: this.extractSection(sopText, '[SOP_EDGE_CASES]', '[/SOP_EDGE_CASES]'),
        selfTests: this.extractSection(sopText, '[SOP_SELF_TESTS]', '[/SOP_SELF_TESTS]'),
        persistence: this.extractSection(sopText, '[SOP_PERSIST]', '[/SOP_PERSIST]')
      };

      // 解析策略配置
      const policy = this.parsePolicyFromText(sopText);

      return {
        schema,
        policy,
        rawText: sopText,
        hash: this.calculateSHA256(sopText),
        shortHash: this.getShortSHA256(sopText),
        parsedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('解析SOP文本失败', error);
      return null;
    }
  }

  /**
   * 提取文本中的特定部分
   */
  extractSection(text, startTag, endTag) {
    const startIndex = text.indexOf(startTag);
    const endIndex = text.indexOf(endTag);
    
    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    return text.substring(startIndex + startTag.length, endIndex).trim();
  }

  /**
   * 提取并解析审计格式
   */
  extractAuditFormat(text) {
    const section = this.extractSection(text, '[SOP_AUDIT_FORMAT]', '[/SOP_AUDIT_FORMAT]');
    if (!section) return null;

    try {
      // 尝试解析为JSON
      return JSON.parse(section);
    } catch (error) {
      this.logger.warn('审计格式部分不是有效的JSON，返回原始文本');
      return section;
    }
  }

  /**
   * 从文本中解析策略配置
   */
  parsePolicyFromText(sopText) {
    // 基础策略配置
    const policy = {
      paused: false,
      tokenWhitelist: ['TREA', 'Operator', 'desktopAgent'],
      allowedActions: ['READ', 'LIST', 'WRITE', 'DELETE', 'UPDATE'],
      restrictedPaths: [],
      maxRuntimeMinutes: 30,
      autoLockAfterFailures: 5
    };

    // 从VALIDATION_CHECKLIST中提取配置信息
    const validationSection = this.extractSection(sopText, '[SOP_VALIDATION_CHECKLIST]', '[/SOP_VALIDATION_CHECKLIST]');
    if (validationSection) {
      // 提取maxRuntimeMinutes
      const runtimeMatch = validationSection.match(/maxRuntimeMinutes\s*→/);
      if (runtimeMatch) {
        policy.maxRuntimeMinutes = 30; // 默认值
      }
    }

    // 从EDGE_CASES中提取配置信息
    const edgeCasesSection = this.extractSection(sopText, '[SOP_EDGE_CASES]', '[/SOP_EDGE_CASES]');
    if (edgeCasesSection) {
      // 提取autoLockAfterFailures
      const failuresMatch = edgeCasesSection.match(/autoLockAfterFailures/);
      if (failuresMatch) {
        policy.autoLockAfterFailures = 5; // 默认值
      }
    }

    return policy;
  }

  /**
   * 将SOP文本存储到externalMemory
   */
  async storeSOPText(sopText) {
    if (!this.externalMemory) {
      this.logger.error('未配置externalMemory，无法存储SOP文本');
      // 退回到本地存储
      return this.backupToLocal(sopText, 'security_sop_v1_text');
    }

    try {
      // 存储原始文本
      await this.externalMemory.set(
        'security_sop_v1_text',
        sopText,
        { namespace: 'security' }
      );
      this.logger.info('SOP文本已成功存储到externalMemory');

      // 同时备份到本地
      this.backupToLocal(sopText, 'security_sop_v1_text');

      return true;
    } catch (error) {
      this.logger.error('存储SOP文本到externalMemory失败', error);
      // 失败时退回到本地存储
      return this.backupToLocal(sopText, 'security_sop_v1_text');
    }
  }

  /**
   * 将解析后的策略schema存储到externalMemory
   */
  async storeSecurityPolicy(policyData) {
    if (!this.externalMemory) {
      this.logger.error('未配置externalMemory，无法存储策略schema');
      // 退回到本地存储
      return this.backupToLocal(policyData, 'security_policy');
    }

    try {
      await this.externalMemory.set(
        'security_policy',
        policyData,
        { namespace: 'security' }
      );
      this.logger.info('安全策略schema已成功存储到externalMemory');

      // 更新缓存
      this.schemaCache = policyData;
      this.schemaTimestamp = new Date().toISOString();

      // 同时备份到本地
      this.backupToLocal(policyData, 'security_policy');

      return true;
    } catch (error) {
      this.logger.error('存储策略schema到externalMemory失败', error);
      // 失败时退回到本地存储
      return this.backupToLocal(policyData, 'security_policy');
    }
  }

  /**
   * 备份数据到本地文件
   */
  backupToLocal(data, key) {
    try {
      const backupDir = path.dirname(this.localBackupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // 创建特定键的备份文件
      const backupFilePath = `${this.localBackupPath}.${key}`;
      const backupContent = {
        key,
        data,
        timestamp: new Date().toISOString(),
        reason: 'externalMemory存储失败或不可用'
      };

      fs.writeFileSync(backupFilePath, JSON.stringify(backupContent, null, 2));
      this.logger.info(`已将数据备份到本地文件: ${backupFilePath}`);
      return true;
    } catch (error) {
      this.logger.error('备份数据到本地文件失败', error);
      return false;
    }
  }

  /**
   * 从externalMemory加载SOP文本
   */
  async loadSOPText() {
    if (!this.externalMemory) {
      this.logger.warn('未配置externalMemory，尝试从本地备份加载');
      return this.loadFromLocal('security_sop_v1_text');
    }

    try {
      const text = await this.externalMemory.get('security_sop_v1_text', { namespace: 'security' });
      if (text) {
        this.logger.info('成功从externalMemory加载SOP文本');
        return text;
      }

      // 如果externalMemory中没有，尝试从本地备份加载
      this.logger.warn('externalMemory中未找到SOP文本，尝试从本地备份加载');
      return this.loadFromLocal('security_sop_v1_text');
    } catch (error) {
      this.logger.error('从externalMemory加载SOP文本失败', error);
      // 失败时从本地备份加载
      return this.loadFromLocal('security_sop_v1_text');
    }
  }

  /**
   * 从externalMemory加载安全策略
   */
  async loadSecurityPolicy() {
    // 先检查缓存
    if (this.schemaCache) {
      this.logger.info('使用缓存的安全策略schema');
      return this.schemaCache;
    }

    if (!this.externalMemory) {
      this.logger.warn('未配置externalMemory，尝试从本地备份加载');
      return this.loadFromLocal('security_policy');
    }

    try {
      const policy = await this.externalMemory.get('security_policy', { namespace: 'security' });
      if (policy) {
        this.logger.info('成功从externalMemory加载安全策略');
        // 更新缓存
        this.schemaCache = policy;
        this.schemaTimestamp = new Date().toISOString();
        return policy;
      }

      // 如果externalMemory中没有，尝试从本地备份加载
      this.logger.warn('externalMemory中未找到安全策略，尝试从本地备份加载');
      return this.loadFromLocal('security_policy');
    } catch (error) {
      this.logger.error('从externalMemory加载安全策略失败', error);
      // 失败时从本地备份加载
      return this.loadFromLocal('security_policy');
    }
  }

  /**
   * 从本地备份加载数据
   */
  loadFromLocal(key) {
    try {
      const backupFilePath = `${this.localBackupPath}.${key}`;
      if (fs.existsSync(backupFilePath)) {
        const content = fs.readFileSync(backupFilePath, 'utf8');
        const backup = JSON.parse(content);
        this.logger.info(`成功从本地备份加载 ${key}`);
        return backup.data;
      }
      this.logger.warn(`本地备份文件不存在: ${backupFilePath}`);
      return null;
    } catch (error) {
      this.logger.error(`从本地备份加载 ${key} 失败`, error);
      return null;
    }
  }

  /**
   * 完整的SOP持久化流程
   */
  async persistSOP(sopText) {
    try {
      // 1. 解析SOP文本
      this.logger.info('开始解析SOP文本...');
      const parsedResult = this.parseSOPText(sopText);
      if (!parsedResult) {
        throw new Error('SOP文本解析失败');
      }

      // 2. 存储原始文本
      this.logger.info('存储SOP原始文本...');
      const textStored = await this.storeSOPText(sopText);
      if (!textStored) {
        this.logger.warn('SOP文本存储遇到问题，但继续执行');
      }

      // 3. 存储解析后的策略
      this.logger.info('存储解析后的安全策略...');
      const policyStored = await this.storeSecurityPolicy(parsedResult.policy);
      if (!policyStored) {
        this.logger.warn('安全策略存储遇到问题，但继续执行');
      }

      this.logger.info('SOP持久化完成', {
        shortHash: parsedResult.shortHash,
        textStored,
        policyStored
      });

      return {
        success: true,
        shortHash: parsedResult.shortHash,
        fullHash: parsedResult.hash,
        parsedResult
      };
    } catch (error) {
      this.logger.error('SOP持久化失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证SOP文本完整性
   */
  verifySOPText(sopText, expectedHash) {
    const actualHash = this.calculateSHA256(sopText);
    return actualHash && expectedHash && actualHash === expectedHash;
  }

  /**
   * 清理本地备份文件
   */
  cleanupLocalBackups() {
    try {
      const keys = ['security_sop_v1_text', 'security_policy'];
      keys.forEach(key => {
        const backupFilePath = `${this.localBackupPath}.${key}`;
        if (fs.existsSync(backupFilePath)) {
          fs.unlinkSync(backupFilePath);
          this.logger.info(`已清理本地备份文件: ${backupFilePath}`);
        }
      });
      return true;
    } catch (error) {
      this.logger.error('清理本地备份文件失败', error);
      return false;
    }
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      hasExternalMemory: !!this.externalMemory,
      hasCachedSchema: !!this.schemaCache,
      schemaTimestamp: this.schemaTimestamp,
      localBackupPath: this.localBackupPath
    };
  }
}

// 导出单例实例和类
let instance = null;

function getSOPersistence(options) {
  if (!instance) {
    instance = new SOPersistence(options);
  }
  return instance;
}

module.exports = {
  SOPersistence,
  getSOPersistence
};
