// JEV Session Store Durable Object

/**
 * Session Store Durable Object
 * 用于管理用户会话和状态
 */
export class SessionStore {
  constructor(state, env) {
    // 初始化Durable Object状态和环境
    this.state = state;
    this.env = env;
    
    // 自动持久化状态变更
    this.storage = state.storage;
    
    // 会话数据缓存
    this.sessionData = null;
  }

  /**
   * 处理HTTP请求
   */
  async fetch(request) {
    // 解析URL获取操作类型
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();
    
    try {
      // 根据不同的操作类型处理请求
      switch (action) {
        case 'get':
          return await this.getSessionData(request);
        case 'set':
          return await this.setSessionData(request);
        case 'delete':
          return await this.deleteSessionData(request);
        case 'clear':
          return await this.clearAllData(request);
        case 'ping':
          return new Response(JSON.stringify({ success: true, message: 'Durable Object is working' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        default:
          return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      console.error('Durable Object error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 获取会话数据
   */
  async getSessionData(request) {
    try {
      // 解析请求体获取sessionId
      const data = await request.json();
      const { sessionId } = data;
      
      if (!sessionId) {
        return new Response(JSON.stringify({ success: false, error: 'sessionId is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 从存储中获取数据
      const sessionData = await this.storage.get(sessionId);
      
      return new Response(JSON.stringify({
        success: true,
        data: sessionData || null
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      throw new Error('Failed to get session data: ' + error.message);
    }
  }

  /**
   * 设置会话数据
   */
  async setSessionData(request) {
    try {
      // 解析请求体
      const data = await request.json();
      const { sessionId, value, ttl = 86400 } = data; // 默认TTL为24小时
      
      if (!sessionId || value === undefined) {
        return new Response(JSON.stringify({ success: false, error: 'sessionId and value are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 存储数据，设置过期时间
      await this.storage.put(sessionId, value, { expirationTtl: ttl });
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Session data stored successfully',
        sessionId
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      throw new Error('Failed to set session data: ' + error.message);
    }
  }

  /**
   * 删除会话数据
   */
  async deleteSessionData(request) {
    try {
      // 解析请求体获取sessionId
      const data = await request.json();
      const { sessionId } = data;
      
      if (!sessionId) {
        return new Response(JSON.stringify({ success: false, error: 'sessionId is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 从存储中删除数据
      await this.storage.delete(sessionId);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Session data deleted successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      throw new Error('Failed to delete session data: ' + error.message);
    }
  }

  /**
   * 清除所有数据
   */
  async clearAllData() {
    try {
      // 清除所有键值对
      await this.storage.deleteAll();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'All session data cleared successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      throw new Error('Failed to clear session data: ' + error.message);
    }
  }
}

/**
 * 另一个Durable Object类：计数器
 */
export class Counter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();
    
    try {
      switch (action) {
        case 'increment':
          return await this.increment(request);
        case 'get':
          return await this.getValue();
        case 'reset':
          return await this.reset();
        default:
          return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async increment(request) {
    // 获取当前值
    let value = await this.storage.get('counter') || 0;
    
    // 增量（默认为1）
    const data = await request.json().catch(() => ({}));
    const increment = data.increment || 1;
    
    // 增加计数
    value += increment;
    
    // 保存新值
    await this.storage.put('counter', value);
    
    return new Response(JSON.stringify({
      success: true,
      value
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getValue() {
    const value = await this.storage.get('counter') || 0;
    
    return new Response(JSON.stringify({
      success: true,
      value
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async reset() {
    await this.storage.put('counter', 0);
    
    return new Response(JSON.stringify({
      success: true,
      value: 0,
      message: 'Counter reset'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}