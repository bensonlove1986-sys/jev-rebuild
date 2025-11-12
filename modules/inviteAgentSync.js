// JEV L8.9.7-SYNC - 邀请码注册与客服身份中心联动蓝图
// 联动逻辑核心模块

class InviteAgentSync {
  constructor() {
    this.syncEndpoint = '/api/agents/sync';
    this.listEndpoint = '/api/agents/list';
    this.pollingInterval = null;
    this.pollingTime = 10000; // 10秒轮询
  }

  /**
   * 同步客服注册与邀请码绑定信息
   * @param {Object} data - 同步数据
   * @param {string} data.agent_id - 客服ID
   * @param {string} data.agent_name - 客服名称
   * @param {string} data.invite_code - 邀请码
   * @param {string} data.registered_at - 注册时间
   * @returns {Promise<Object>} 同步结果
   */
  async syncAgentWithInvite(data) {
    try {
      const response = await fetch(this.syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('同步客服与邀请码绑定信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取客服列表（包含邀请码绑定信息）
   * @returns {Promise<Array>} 客服列表
   */
  async getAgentList() {
    try {
      const response = await fetch(this.listEndpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.agents || [];
    } catch (error) {
      console.error('获取客服列表失败:', error);
      return [];
    }
  }

  /**
   * 启动轮询
   * @param {Function} callback - 轮询回调函数
   */
  startPolling(callback) {
    // 先停止可能存在的轮询
    this.stopPolling();
    
    // 立即执行一次
    this.getAgentList().then(agents => {
      callback(agents);
    });
    
    // 设置定时轮询
    this.pollingInterval = setInterval(async () => {
      try {
        const agents = await this.getAgentList();
        callback(agents);
      } catch (error) {
        console.error('轮询客服列表失败:', error);
      }
    }, this.pollingTime);
  }

  /**
   * 停止轮询
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * 过滤客服列表
   * @param {Array} agents - 客服列表
   * @param {Object} filters - 过滤条件
   * @param {string} filters.inviteCode - 按邀请码过滤
   * @param {string} filters.status - 按状态过滤（active/inactive）
   * @returns {Array} 过滤后的客服列表
   */
  filterAgents(agents, filters = {}) {
    return agents.filter(agent => {
      // 按邀请码过滤
      if (filters.inviteCode && 
          !agent.invite_code.toLowerCase().includes(filters.inviteCode.toLowerCase())) {
        return false;
      }
      
      // 按状态过滤
      if (filters.status && agent.status !== filters.status) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * 格式化时间戳
   * @param {string} timestamp - ISO时间戳
   * @returns {string} 格式化后的时间
   */
  formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return timestamp;
    }
  }

  /**
   * 获取客服状态显示信息
   * @param {string} status - 客服状态
   * @returns {Object} 状态显示信息
   */
  getStatusInfo(status) {
    const statusMap = {
      'active': {
        text: '在线',
        class: 'status-active',
        icon: 'fa-circle'
      },
      'inactive': {
        text: '离线',
        class: 'status-inactive',
        icon: 'fa-circle'
      }
    };
    
    return statusMap[status] || {
      text: '未知',
      class: 'status-unknown',
      icon: 'fa-question-circle'
    };
  }

  /**
   * 检查客服是否在线（基于最后在线时间）
   * @param {string} lastSeen - 最后在线时间
   * @param {number} timeoutMinutes - 超时分钟数，默认5分钟
   * @returns {boolean} 是否在线
   */
  isAgentOnline(lastSeen, timeoutMinutes = 5) {
    try {
      const lastSeenTime = new Date(lastSeen).getTime();
      const currentTime = new Date().getTime();
      const timeoutMs = timeoutMinutes * 60 * 1000;
      
      return (currentTime - lastSeenTime) < timeoutMs;
    } catch (error) {
      return false;
    }
  }
}

// 导出单例实例
const inviteAgentSync = new InviteAgentSync();

// 仅使用全局变量方式导出，确保浏览器兼容性
if (typeof window !== 'undefined') {
  window.inviteAgentSync = inviteAgentSync;
}