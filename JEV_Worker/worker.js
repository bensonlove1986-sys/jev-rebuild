// JEV Worker v11.1 - AI Service Handler

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { action, data } = body;
    
    // Validate API key from header
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey || !validateApiKey(apiKey)) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        code: 401
      }), {
        status: 401,
        headers: getCorsHeaders()
      });
    }
    
    // Route to appropriate handler
    let result;
    switch (action) {
      case 'ocr':
        result = await handleOCR(data);
        break;
      case 'translate':
        result = await handleTranslate(data);
        break;
      case 'quote':
        result = await handleQuote(data);
        break;
      case 'pdf':
        result = await handlePDF(data);
        break;
      case 'status':
        result = getStatus();
        break;
      default:
        return new Response(JSON.stringify({
          error: 'Unknown action',
          code: 400
        }), {
          status: 400,
          headers: getCorsHeaders()
        });
    }
    
    return new Response(JSON.stringify(result), {
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Worker error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      code: 500
    }), {
      status: 500,
      headers: getCorsHeaders()
    });
  }
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'X-Worker-Sync': 'true',
    'X-Worker-Version': 'v11.1'
  };
}

function validateApiKey(apiKey) {
  // This is a placeholder - in production, validate against KV store
  return apiKey.length >= 32;
}

async function handleOCR(data) {
  // Mock OCR handler
  return {
    success: true,
    text: data.image ? 'Recognized text from image' : 'No image provided',
    confidence: 0.95
  };
}

async function handleTranslate(data) {
  const { text, targetLang = 'zh-CN' } = data;
  // Mock translation
  return {
    success: true,
    original: text,
    translated: `[Translated to ${targetLang}]: ${text}`,
    language: targetLang
  };
}

async function handleQuote(data) {
  const { product, quantity, currency = 'USD' } = data;
  // Mock pricing calculation
  const price = Math.random() * 1000;
  const profit = price * 0.3;
  
  return {
    success: true,
    product,
    quantity,
    price: price.toFixed(2),
    currency,
    profit: profit.toFixed(2),
    margin: '30%',
    recommendation: 'Competitive price'
  };
}

async function handlePDF(data) {
  // Mock PDF generation
  return {
    success: true,
    pdfUrl: 'https://example.com/generated.pdf',
    fileName: `invoice_${Date.now()}.pdf`,
    size: '2.5MB'
  };
}

function getStatus() {
  return {
    version: 'v11.1',
    status: 'online',
    modules: {
      ocr: 'active',
      translate: 'active',
      quote: 'active',
      pdf: 'active'
    },
    timestamp: new Date().toISOString(),
    system_state: 'stable',
    lock: 'active'
  };
}