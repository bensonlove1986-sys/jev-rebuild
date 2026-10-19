/**
 * Customer-facing share text for a confirmed price.
 * Only the model and the ex-tax sellable price are allowed through.
 * Shop links, shop names, order refs, and cost fields must never appear.
 */

const BLOCKED_BODY_KEYS = [
  'costPrice',
  'cost',
  'costCurrency',
  'margin',
  'profit',
  'supplierCost',
  'bestSupplierQuote',
  'procurementNote',
  'procurementPriceMemory',
  'defaultMarginRate',
  'minimumSellPrice',
];

export function assertNoCostFields(body) {
  if (!body || typeof body !== 'object') return null;
  for (const key of BLOCKED_BODY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      return `Field ${key} is not part of the confirmed price library`;
    }
  }
  return null;
}

function cleanLine(value, max) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

export function formatExTax(amount, currency) {
  const n = Number(amount);
  const fixed = Number.isFinite(n) ? n.toFixed(2) : '';
  const code = cleanLine(currency || 'CNY', 8).toUpperCase() || 'CNY';
  return { amount: fixed, currency: code };
}

export function buildShare(row) {
  const model = cleanLine(row && row.model, 80);
  const { amount, currency } = formatExTax(row && row.exTaxUnitPrice, row && row.currency);
  const quotable = row && row.status === 'confirmed' && model && amount;
  const customerText = quotable
    ? `Need ${model}? Ex-tax from ${amount} ${currency}. Qty + nameplate → quote.`
    : null;
  const copyText = quotable ? `${model} 未税 ${amount} ${currency}` : null;
  return {
    quotable: Boolean(quotable),
    customerText,
    copyText,
    whatsappUrl: customerText ? `https://wa.me/?text=${encodeURIComponent(customerText)}` : null,
    pendingNotice: quotable ? null : '挂牌待确认，勿直接报给客户。',
  };
}

export function shareContainsSensitive(text, row) {
  if (!text) return false;
  const banned = [
    row && row.shopOrProductLink,
    row && row.shopOrAgentName,
    row && row.orderRef,
    row && row.notes,
    row && row.inquiredBy,
    'costPrice',
    '成本',
  ];
  return banned.some((value) => {
    const token = cleanLine(value, 200);
    return token.length >= 3 && text.includes(token);
  });
}
