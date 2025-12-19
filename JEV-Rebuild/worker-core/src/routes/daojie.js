export async function handleDaojie(request, env) {
  const payload = await request.json();

  // 不进行自动翻译，完全由UI端手动触发
  
  const message = {
    type: 'raw_daojie',
    received_at: Date.now(),
    payload
  };

  // WebSocket 已被禁用，不再广播
  // const id = env.DAOJIE_STREAM.idFromName('global');
  // const stub = env.DAOJIE_STREAM.get(id);
  // await stub.fetch('https://do/broadcast', {
  //   method: 'POST',
  //   body: JSON.stringify(message)
  // });

  // ChatHistoryDO 已被禁用，不再保存消息
  // if (payload && payload.contactId && payload.message) {
  //   const chatId = env.CHAT_HISTORY.idFromName(payload.contactId);
  //   const chatStub = env.CHAT_HISTORY.get(chatId);
  //   
  //   await chatStub.fetch('https://do/append', {
  //     method: 'POST',
  //     body: JSON.stringify({
  //       contactId: payload.contactId,
  //       role: 'customer',
  //       text: payload.message,
  //       timestamp: Date.now()
  //     })
  //   });
  // }

  return new Response(
    JSON.stringify({ status: 'received' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}

// 获取客户列表（仅用于展示）
export async function getCustomers(request, env) {
  try {
    // 1. 获取API密钥
    const apiKey = env.DAIJIE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. 调用Daojie官方API获取会话列表，转换为客户列表格式
    const response = await fetch('https://api.gohighlevel.com/v1/conversations/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Daojie API error: ${errorText}`);
      return new Response(
        JSON.stringify({ customers: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. 转换为客户列表格式
    const data = await response.json();
    const customers = (data.data?.conversations || []).map(conv => ({
      id: conv.conversationId,
      conversationId: conv.conversationId,
      name: conv.contactName,
      country: conv.contactCountry || '未知',
      status: 'active',
      lastContact: conv.lastMessageAt,
      totalOrders: 0,
      lastMessage: conv.lastMessage,
      channel: conv.channel
    }));
    
    // 4. 返回客户列表
    return new Response(
      JSON.stringify({ customers }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error getting customers:', error);
    return new Response(
      JSON.stringify({ customers: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 回复客户（生产级固化：Daojie PIT 官方回复通道）
export async function replyToCustomer(request, env) {
  try {
    console.log('=== Daojie PIT API: Entering replyToCustomer function ===');
    
    // 1. 获取PIT JWT（环境变量）
    const pitJwt = env.PIT_JWT;
    console.log('Daojie PIT API: PIT JWT configured:', !!pitJwt);
    
    if (!pitJwt) {
      console.error('PIT_JWT not configured in environment variables');
      return new Response(
        JSON.stringify({ error: 'PIT_JWT not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. 解析请求体
    console.log('Daojie PIT API: Reading request body...');
    const rawBody = await request.text();
    console.log('Daojie PIT API: Raw request body:', rawBody);
    
    const body = JSON.parse(rawBody);
    
    // 3. 安全加固：检查禁止字段
    const forbiddenFields = ['conversationId', 'locationId', 'authorization'];
    const detectedForbiddenFields = forbiddenFields.filter(field => body.hasOwnProperty(field));
    
    if (detectedForbiddenFields.length > 0) {
      console.error('Forbidden fields detected:', detectedForbiddenFields);
      return new Response(
        JSON.stringify({ error: 'forbidden_field_detected' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { contactId, message } = body;
    
    console.log('Daojie PIT API: Parsed request body:', {
      contactId,
      message: message ? `${message.substring(0, 50)}...` : message
    });
    
    // 4. 验证必需字段
    if (!contactId) {
      console.error('Missing required field: contactId');
      return new Response(
        JSON.stringify({ error: 'missing contactId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!message) {
      console.error('Missing required field: message');
      return new Response(
        JSON.stringify({ error: 'missing message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 不进行自动翻译，完全由UI端手动触发
    // 直接使用传入的message发送
    const finalMessage = message;
    
    // 4. 固定 Headers (使用 PIT JWT)
    const headers = {
      'Authorization': `Bearer ${pitJwt}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    };
    
    // 5. 严格按照要求生成 payload 结构
    const payload = {
      locationId: env.DAIJIE_LOCATION_ID || "3SsfTbU1lmAPpkG9iB6C",
      contactId,
      type: "WhatsApp",
      message: finalMessage,
      channel: "whatsapp",
      MessageType: 19,
      whatsapp: { parentMessageAltId: "", type: "message" }
    };
    
    // 6. 调用 Daojie 官方 PIT API
    console.log('Daojie PIT API: Sending WhatsApp reply', {
      contactId,
      messageLength: message.length,
      type: payload.type,
      messageType: payload.MessageType
    });
    
    const pitUrl = 'https://services.leadconnectorhq.com/conversations/messages';
    console.log('Daojie PIT API: Calling external API:', pitUrl);
    
    const response = await fetch(pitUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    // 7. 处理 API 响应 - 原样透出 status + body
    console.log('Daojie PIT API: External API response status:', response.status);
    const responseBody = await response.text();
    
    // 日志降级：仅提取 traceId，不打印完整响应体
    let traceId = 'unknown';
    try {
      const responseJson = JSON.parse(responseBody);
      if (responseJson.traceId) {
        traceId = responseJson.traceId;
        console.log('Daojie PIT API: External API traceId:', traceId);
      }
    } catch (e) {
      // 如果响应不是 JSON，跳过解析
    }
    
    // ChatHistoryDO 已被禁用，不再保存消息
    // if (response.ok) {
    //   const chatId = env.CHAT_HISTORY.idFromName(contactId);
    //   const chatStub = env.CHAT_HISTORY.get(chatId);
    //   
    //   await chatStub.fetch('https://do/append', {
    //     method: 'POST',
    //     body: JSON.stringify({
    //       contactId,
    //       role: 'agent',
    //       text: finalMessage,
    //       timestamp: Date.now()
    //     })
    //   });
    // }

    // 原样透出外部 API 的 status 和 body
    return new Response(
      responseBody,
      { 
        status: response.status, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Daojie PIT API: Error sending reply - Line:', error.lineNumber || error.stack.split('\n')[1]);
    console.error('Daojie PIT API: Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ error: 'Failed to send message', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}