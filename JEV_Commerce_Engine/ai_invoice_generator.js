// JEV Global AI Commerce Engine v13.0 - AI Invoice Generator
// 执行边界：STRICT / LOCK=ACTIVE / PATH_LOCK=TRUE

const fs = require('fs');
const path = require('path');

// 加载配置
const configPath = path.join(__dirname, 'commerce_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 多语言模板
const templates = {
  'en': {
    pi_title: 'Proforma Invoice',
    invoice_title: 'Commercial Invoice',
    from: 'From:',
    to: 'To:',
    invoice_no: 'Invoice Number:',
    date: 'Date:',
    due_date: 'Due Date:',
    item: 'Item',
    description: 'Description',
    quantity: 'Quantity',
    unit_price: 'Unit Price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    tax: 'Tax',
    shipping: 'Shipping',
    total: 'Total Amount',
    payment_terms: 'Payment Terms:',
    thank_you: 'Thank you for your business!'
  },
  'zh': {
    pi_title: '形式发票',
    invoice_title: '商业发票',
    from: '发件方:',
    to: '收件方:',
    invoice_no: '发票编号:',
    date: '日期:',
    due_date: '到期日:',
    item: '项目',
    description: '描述',
    quantity: '数量',
    unit_price: '单价',
    amount: '金额',
    subtotal: '小计',
    tax: '税费',
    shipping: '运费',
    total: '总金额',
    payment_terms: '付款条款:',
    thank_you: '感谢您的业务！'
  },
  'hi': {
    pi_title: 'प्रोफॉर्मा इनवॉइस',
    invoice_title: 'वाणिज्यिक इनवॉइस',
    from: 'से:',
    to: 'को:',
    invoice_no: 'इनवॉइस नंबर:',
    date: 'तिथि:',
    due_date: 'नियत तिथि:',
    item: 'वस्तु',
    description: 'वर्णन',
    quantity: 'मात्रा',
    unit_price: 'यूनिट मूल्य',
    amount: 'राशि',
    subtotal: 'उप-कुल',
    tax: 'कर',
    shipping: 'शिपिंग',
    total: 'कुल राशि',
    payment_terms: 'भुगतान नियम:',
    thank_you: 'आपके व्यवसाय के लिए धन्यवाद!'
  }
};

// 生成形式发票 (Proforma Invoice)
function generatePI(customer, items) {
  if (!customer || !items || !Array.isArray(items)) {
    throw new Error('客户信息和商品列表是必需的');
  }
  
  // 计算总价
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const shipping = subtotal > 5000 ? 0 : 200; // 订单超过5000免运费
  const tax = subtotal * 0.05; // 5%税费
  const total = subtotal + shipping + tax;
  
  const piData = {
    invoice_id: "PI-" + Date.now(),
    invoice_type: "proforma",
    customer_name: customer.name,
    customer_email: customer.email || '',
    customer_phone: customer.phone || '',
    country: customer.country,
    address: customer.address || '',
    items: items.map(item => ({
      ...item,
      total_price: (item.price * item.qty).toFixed(2)
    })),
    date: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后到期
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    shipping: shipping.toFixed(2),
    total: total.toFixed(2),
    currency: customer.currency || config.default_currency,
    payment_terms: customer.payment_terms || "30天内付款",
    language: customer.language || 'en',
    status: "pending"
  };
  
  // 记录生成的PI
  logActivity('PI_GENERATED', {
    invoice_id: piData.invoice_id,
    customer_name: piData.customer_name,
    total_amount: piData.total,
    currency: piData.currency
  });
  
  return piData;
}

// 生成正式商业发票
function generateInvoice(piData) {
  if (!piData || !piData.invoice_id) {
    throw new Error('无效的形式发票数据');
  }
  
  const invoiceData = {
    ...piData,
    invoice_id: "INV-" + Date.now(),
    invoice_type: "commercial",
    original_pi_id: piData.invoice_id,
    status: "issued",
    issued_date: new Date().toISOString()
  };
  
  // 记录生成的发票
  logActivity('INVOICE_GENERATED', {
    invoice_id: invoiceData.invoice_id,
    original_pi_id: invoiceData.original_pi_id,
    customer_name: invoiceData.customer_name,
    total_amount: invoiceData.total
  });
  
  return invoiceData;
}

// 生成HTML格式的发票
function generateInvoiceHTML(invoiceData) {
  const lang = invoiceData.language || 'en';
  const t = templates[lang] || templates.en;
  const currencySymbol = getCurrencySymbol(invoiceData.currency);
  
  let itemsHTML = '';
  invoiceData.items.forEach((item, index) => {
    itemsHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name || 'Item'}</td>
        <td>${item.description || ''}</td>
        <td>${item.qty}</td>
        <td>${currencySymbol}${parseFloat(item.price).toFixed(2)}</td>
        <td>${currencySymbol}${parseFloat(item.total_price).toFixed(2)}</td>
      </tr>
    `;
  });
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${t[invoiceData.invoice_type === 'proforma' ? 'pi_title' : 'invoice_title']} - ${invoiceData.invoice_id}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; }
        h1 { color: #2c3e50; }
        .info { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .info-block { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total-section { text-align: right; margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .total-row.total { font-weight: bold; font-size: 18px; }
        .footer { margin-top: 40px; text-align: center; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${t[invoiceData.invoice_type === 'proforma' ? 'pi_title' : 'invoice_title']}</h1>
        <p>${invoiceData.invoice_id} | ${new Date(invoiceData.date).toLocaleDateString()}</p>
      </div>
      
      <div class="info">
        <div class="info-block">
          <h3>${t.from}</h3>
          <p>JEV Global Commerce</p>
          <p>International Trading Co.</p>
          <p>contact@jevcommerce.com</p>
        </div>
        <div class="info-block">
          <h3>${t.to}</h3>
          <p>${invoiceData.customer_name}</p>
          <p>${invoiceData.address || ''}</p>
          <p>${invoiceData.country || ''}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>${t.item}</th>
            <th>${t.description}</th>
            <th>${t.quantity}</th>
            <th>${t.unit_price}</th>
            <th>${t.amount}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div class="total-section">
        <div class="total-row">
          <span>${t.subtotal}:</span>
          <span>${currencySymbol}${parseFloat(invoiceData.subtotal).toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>${t.tax}:</span>
          <span>${currencySymbol}${parseFloat(invoiceData.tax).toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>${t.shipping}:</span>
          <span>${currencySymbol}${parseFloat(invoiceData.shipping).toFixed(2)}</span>
        </div>
        <div class="total-row total">
          <span>${t.total}:</span>
          <span>${currencySymbol}${parseFloat(invoiceData.total).toFixed(2)}</span>
        </div>
      </div>
      
      <div style="margin-top: 30px;">
        <h3>${t.payment_terms}</h3>
        <p>${invoiceData.payment_terms}</p>
      </div>
      
      <div class="footer">
        <p>${t.thank_you}</p>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

// 获取货币符号
function getCurrencySymbol(currency) {
  const symbols = {
    'USD': '$',
    'RMB': '¥',
    'INR': '₹',
    'BDT': '৳',
    'PKR': '₨',
    'VND': '₫',
    'DZD': 'دج',
    'EUR': '€'
  };
  return symbols[currency] || currency;
}

// 日志记录
function logActivity(action, details) {
  const logPath = path.join(__dirname, 'commerce_audit.log');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${action} | ${JSON.stringify(details)}\n`;
  
  try {
    fs.appendFileSync(logPath, logEntry);
    console.log(`[LOG] ${action} recorded`);
  } catch (error) {
    console.error(`[ERROR] Failed to log activity: ${error.message}`);
  }
}

// 导出模块
module.exports = {
  generatePI,
  generateInvoice,
  generateInvoiceHTML,
  getCurrencySymbol
};