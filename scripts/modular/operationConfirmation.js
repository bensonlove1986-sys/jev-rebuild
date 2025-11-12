/**
 * 操作确认机制和令牌白名单管理
 * 实现交互式操作确认和安全令牌验证功能
 */

const readline = require('readline');
const { securityPolicy } = require('./advancedSecurityPolicy.js');

/**
 * 操作确认管理器类
 */
class OperationConfirmationManager {
  constructor() {
    this.rl = null;
    this.tokenRegistry = new Map(); // 内存中的令牌注册表
  }

  /**
   * 初始化操作确认管理器
   */
  async initialize() {
    try {
      // 确保安全策略已加载
      if (!securityPolicy.policy) {
        await securityPolicy.loadPolicy();
      }

      // 初始化令牌注册表
      await this.loadTokenRegistry();
      
      console.log('✅ 操作确认管理器初始化完成');
      console.log(`📋 令牌白名单配置: ${securityPolicy.policy.tokenWhitelist?.join(', ') || '无'}`);
      console.log(`🔍 确认设置: ${securityPolicy.policy.confirmBeforeExecute ? '已启用' : '已禁用'}`);
      
      return true;
    } catch (error) {
      console.error('❌ 操作确认管理器初始化失败:', error.message);
      return false;
    }
  }

  /**
   * 创建命令行交互接口
   */
  createReadlineInterface() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
      });
    }
    return this.rl;
  }

  /**
   * 关闭命令行交互接口
   */
  closeReadlineInterface() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * 交互式确认操作
   */
  async promptConfirmation(action, options = {}) {
    try {
      // 检查是否需要确认
      if (!securityPolicy.policy.confirmBeforeExecute) {
        console.log('⚠️  操作确认机制未启用，自动允许');
        return { confirmed: true, autoConfirmed: true };
      }

      // 如果已跳过确认，直接返回
      if (options.skipConfirmation) {
        return { confirmed: true, autoConfirmed: true };
      }

      const rl = this.createReadlineInterface();
      
      return new Promise((resolve) => {
        const operationDetails = this.formatOperationDetails(action, options);
        
        console.log('\n🔐 安全操作确认');
        console.log('================');
        console.log(operationDetails);
        console.log('================');
        
        rl.question('确认执行此操作? (y/n) [n]: ', async (answer) => {
          const confirmed = answer.trim().toLowerCase() === 'y';
          
          if (confirmed) {
            // 如果需要令牌验证，进行验证
            if (this.requiresTokenVerification(action, options)) {
              const tokenResult = await this.verifyToken(action);
              if (!tokenResult.verified) {
                console.log('❌ 令牌验证失败，操作被拒绝');
                resolve({ confirmed: false, reason: 'token_verification_failed' });
                return;
              }
              resolve({ confirmed: true, tokenVerified: true });
            } else {
              resolve({ confirmed: true });
            }
          } else {
            console.log('❌ 操作已取消');
            resolve({ confirmed: false, reason: 'user_cancelled' });
          }
        });
      });
    } catch (error) {
      console.error('❌ 操作确认过程中出错:', error.message);
      return { confirmed: false, reason: 'error', error: error.message };
    }
  }

  /**
   * 格式化操作详情用于显示
   */
  formatOperationDetails(action, options = {}) {
    let details = `操作类型: ${action}\n`;
    
    if (options.path) {
      details += `目标路径: ${options.path}\n`;
    }
    
    if (options.token) {
      details += `提供的令牌: ${options.token}\n`;
    }
    
    if (options.params) {
      details += `操作参数: ${JSON.stringify(options.params, null, 2)}\n`;
    }
    
    if (options.timeout) {
      details += `超时设置: ${options.timeout}ms\n`;
    }
    
    // 添加风险等级提示
    const riskLevel = this.assessRiskLevel(action, options);
    details += `风险等级: ${riskLevel.level} - ${riskLevel.description}\n`;
    
    return details;
  }

  /**
   * 评估操作风险等级
   */
  assessRiskLevel(action, options = {}) {
    // 高风险操作
    const highRiskActions = ['delete', 'remove', 'format', 'execute', 'run'];
    const highRiskPaths = ['system', 'windows', 'boot', 'etc', 'var'];
    
    // 检查是否为高风险操作
    if (highRiskActions.some(risky => action.toLowerCase().includes(risky))) {
      return { level: '高风险', description: '此操作可能导致数据丢失或系统变更' };
    }
    
    // 检查是否涉及高风险路径
    if (options.path) {
      const pathLower = options.path.toLowerCase();
      if (highRiskPaths.some(risky => pathLower.includes(risky))) {
        return { level: '中风险', description: '操作涉及敏感系统路径' };
      }
    }
    
    // 默认低风险
    return { level: '低风险', description: '常规操作，风险较低' };
  }

  /**
   * 判断是否需要令牌验证
   */
  requiresTokenVerification(action, options = {}) {
    // 对于高风险操作，要求令牌验证
    const riskLevel = this.assessRiskLevel(action, options);
    return riskLevel.level === '高风险' && securityPolicy.policy.tokenWhitelist && securityPolicy.policy.tokenWhitelist.length > 0;
  }

  /**
   * 验证操作令牌
   */
  async verifyToken(action) {
    try {
      const rl = this.createReadlineInterface();
      
      return new Promise((resolve) => {
        rl.question('请输入安全令牌: ', (token) => {
          const trimmedToken = token.trim();
          const isValid = this.validateToken(trimmedToken);
          
          if (isValid) {
            // 记录令牌使用
            this.recordTokenUsage(trimmedToken, action);
            resolve({ verified: true, token: trimmedToken });
          } else {
            resolve({ verified: false, reason: 'invalid_token' });
          }
        });
      });
    } catch (error) {
      console.error('❌ 令牌验证过程中出错:', error.message);
      return { verified: false, reason: 'error' };
    }
  }

  /**
   * 验证令牌是否在白名单中
   */
  validateToken(token) {
    if (!token || !securityPolicy.policy.tokenWhitelist) {
      return false;
    }
    
    return securityPolicy.policy.tokenWhitelist.includes(token);
  }

  /**
   * 记录令牌使用情况
   */
  recordTokenUsage(token, action) {
    const usageRecord = {
      token,
      action,
      timestamp: Date.now(),
      count: (this.tokenRegistry.get(token)?.count || 0) + 1
    };
    
    this.tokenRegistry.set(token, usageRecord);
    
    // 记录日志
    securityPolicy.log('security', 'token_used', {
      token: this.maskToken(token), // 部分屏蔽令牌
      action,
      timestamp: Date.now()
    });
  }

  /**
   * 部分屏蔽令牌（安全显示）
   */
  maskToken(token) {
    if (!token || token.length <= 4) {
      return '*'.repeat(token.length);
    }
    
    const firstTwo = token.substring(0, 2);
    const lastTwo = token.substring(token.length - 2);
    const masked = '*'.repeat(token.length - 4);
    
    return `${firstTwo}${masked}${lastTwo}`;
  }

  /**
   * 加载令牌注册表
   */
  async loadTokenRegistry() {
    try {
      // 尝试从externalMemory加载令牌使用记录
      const memory = securityPolicy.ExternalMemory || require('./externalMemory.js').ExternalMemory;
      if (memory) {
        try {
          const registryData = await memory.get('security:token_registry');
          if (registryData && typeof registryData === 'object') {
            this.tokenRegistry = new Map(Object.entries(registryData));
            console.log(`✅ 已加载 ${this.tokenRegistry.size} 条令牌使用记录`);
          }
        } catch (err) {
          console.warn('⚠️  从externalMemory加载令牌记录失败:', err.message);
        }
      }
    } catch (error) {
      console.warn('⚠️  初始化令牌注册表失败:', error.message);
    }
  }

  /**
   * 保存令牌注册表
   */
  async saveTokenRegistry() {
    try {
      const registryData = Object.fromEntries(this.tokenRegistry);
      
      const memory = securityPolicy.ExternalMemory || require('./externalMemory.js').ExternalMemory;
      if (memory) {
        await memory.set('security:token_registry', registryData);
        console.log(`✅ 已保存 ${this.tokenRegistry.size} 条令牌使用记录`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ 保存令牌注册表失败:', error.message);
      return false;
    }
  }

  /**
   * 管理令牌白名单
   */
  async manageTokenWhitelist() {
    try {
      const rl = this.createReadlineInterface();
      
      return new Promise((resolve) => {
        console.log('\n📋 令牌白名单管理');
        console.log('================');
        console.log('当前白名单令牌:');
        
        const currentTokens = securityPolicy.policy.tokenWhitelist || [];
        if (currentTokens.length === 0) {
          console.log('  (空)');
        } else {
          currentTokens.forEach((token, index) => {
            console.log(`  ${index + 1}. ${token}`);
          });
        }
        
        console.log('\n操作选项:');
        console.log('  1. 添加令牌');
        console.log('  2. 删除令牌');
        console.log('  3. 清空白名单');
        console.log('  4. 退出');
        
        rl.question('请选择操作 [4]: ', async (choice) => {
          choice = choice.trim() || '4';
          
          switch (choice) {
            case '1':
              await this.addTokenToWhitelist();
              break;
            case '2':
              await this.removeTokenFromWhitelist();
              break;
            case '3':
              await this.clearTokenWhitelist();
              break;
            case '4':
              console.log('退出令牌管理');
              break;
            default:
              console.log('无效选择');
          }
          
          resolve();
        });
      });
    } catch (error) {
      console.error('❌ 管理令牌白名单时出错:', error.message);
      return false;
    }
  }

  /**
   * 添加令牌到白名单
   */
  async addTokenToWhitelist() {
    try {
      const rl = this.createReadlineInterface();
      
      return new Promise((resolve) => {
        rl.question('请输入要添加的令牌: ', async (token) => {
          const trimmedToken = token.trim();
          
          if (!trimmedToken) {
            console.log('❌ 令牌不能为空');
            resolve();
            return;
          }
          
          if (!securityPolicy.policy.tokenWhitelist) {
            securityPolicy.policy.tokenWhitelist = [];
          }
          
          if (securityPolicy.policy.tokenWhitelist.includes(trimmedToken)) {
            console.log('⚠️  令牌已在白名单中');
          } else {
            securityPolicy.policy.tokenWhitelist.push(trimmedToken);
            await securityPolicy.savePolicy();
            console.log('✅ 令牌已添加到白名单');
          }
          
          resolve();
        });
      });
    } catch (error) {
      console.error('❌ 添加令牌失败:', error.message);
      return false;
    }
  }

  /**
   * 从白名单删除令牌
   */
  async removeTokenFromWhitelist() {
    try {
      const rl = this.createReadlineInterface();
      const currentTokens = securityPolicy.policy.tokenWhitelist || [];
      
      if (currentTokens.length === 0) {
        console.log('❌ 白名单为空');
        return false;
      }
      
      return new Promise((resolve) => {
        console.log('\n选择要删除的令牌:');
        currentTokens.forEach((token, index) => {
          console.log(`  ${index + 1}. ${token}`);
        });
        
        rl.question('请输入令牌编号或直接输入令牌值: ', async (input) => {
          let tokenToRemove = null;
          
          // 尝试作为数字索引处理
          const index = parseInt(input) - 1;
          if (!isNaN(index) && index >= 0 && index < currentTokens.length) {
            tokenToRemove = currentTokens[index];
          } else {
            // 直接作为令牌值处理
            tokenToRemove = input.trim();
          }
          
          const tokenIndex = securityPolicy.policy.tokenWhitelist.indexOf(tokenToRemove);
          if (tokenIndex > -1) {
            securityPolicy.policy.tokenWhitelist.splice(tokenIndex, 1);
            await securityPolicy.savePolicy();
            console.log(`✅ 令牌 ${tokenToRemove} 已从白名单删除`);
          } else {
            console.log('❌ 未找到指定的令牌');
          }
          
          resolve();
        });
      });
    } catch (error) {
      console.error('❌ 删除令牌失败:', error.message);
      return false;
    }
  }

  /**
   * 清空令牌白名单
   */
  async clearTokenWhitelist() {
    try {
      const rl = this.createReadlineInterface();
      
      return new Promise((resolve) => {
        rl.question('确定要清空所有令牌白名单吗? (y/n) [n]: ', async (answer) => {
          if (answer.trim().toLowerCase() === 'y') {
            securityPolicy.policy.tokenWhitelist = [];
            await securityPolicy.savePolicy();
            console.log('✅ 令牌白名单已清空');
          } else {
            console.log('操作已取消');
          }
          
          resolve();
        });
      });
    } catch (error) {
      console.error('❌ 清空令牌白名单失败:', error.message);
      return false;
    }
  }

  /**
   * 切换操作确认设置
   */
  async toggleConfirmationSetting() {
    try {
      const currentSetting = securityPolicy.policy.confirmBeforeExecute;
      securityPolicy.policy.confirmBeforeExecute = !currentSetting;
      
      await securityPolicy.savePolicy();
      
      const newStatus = securityPolicy.policy.confirmBeforeExecute ? '已启用' : '已禁用';
      console.log(`✅ 操作确认机制已${newStatus}`);
      
      return securityPolicy.policy.confirmBeforeExecute;
    } catch (error) {
      console.error('❌ 切换确认设置失败:', error.message);
      return securityPolicy.policy.confirmBeforeExecute;
    }
  }
}

// 创建全局实例
const operationConfirmationManager = new OperationConfirmationManager();

// 导出模块
module.exports = {
  OperationConfirmationManager,
  operationConfirmationManager,
  promptConfirmation: (action, options) => operationConfirmationManager.promptConfirmation(action, options),
  validateToken: (token) => operationConfirmationManager.validateToken(token),
  manageTokens: () => operationConfirmationManager.manageTokenWhitelist(),
  toggleConfirmation: () => operationConfirmationManager.toggleConfirmationSetting()
};

// 如果直接运行，提供交互式管理界面
if (require.main === module) {
  (async () => {
    console.log('🔐 JEV系统操作确认管理器');
    console.log('=====================');
    
    await operationConfirmationManager.initialize();
    
    const rl = operationConfirmationManager.createReadlineInterface();
    
    const showMenu = async () => {
      console.log('\n操作菜单:');
      console.log('1. 管理令牌白名单');
      console.log('2. 切换操作确认设置');
      console.log('3. 查看当前设置');
      console.log('4. 退出');
      
      rl.question('请选择操作 [4]: ', async (choice) => {
        choice = choice.trim() || '4';
        
        switch (choice) {
          case '1':
            await operationConfirmationManager.manageTokenWhitelist();
            break;
          case '2':
            await operationConfirmationManager.toggleConfirmationSetting();
            break;
          case '3':
            console.log('\n当前安全设置:');
            console.log(`操作确认: ${securityPolicy.policy.confirmBeforeExecute ? '已启用' : '已禁用'}`);
            console.log(`令牌白名单: ${securityPolicy.policy.tokenWhitelist?.join(', ') || '无'}`);
            break;
          case '4':
            console.log('感谢使用，再见!');
            operationConfirmationManager.closeReadlineInterface();
            process.exit(0);
          default:
            console.log('无效选择，请重试');
        }
        
        showMenu();
      });
    };
    
    showMenu();
  })();
}