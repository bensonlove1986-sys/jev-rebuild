const STATUSES = new Set(['confirmed', 'pending_list']);
const CHANNELS = new Set(['taobao', '1688', 'official_agent', 'other']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(value, max) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function requiredText(value, max, label, errors) {
  const next = text(value, max);
  if (!next) errors.push(`${label} is required`);
  return next;
}

export function normalizePriceInput(input, { partial = false } = {}) {
  const errors = [];
  const source = input && typeof input === 'object' ? input : {};
  const out = {};

  if (!partial || source.model !== undefined) {
    out.model = requiredText(source.model, 80, 'model', errors);
  }
  if (!partial || source.status !== undefined) {
    const status = text(source.status, 32);
    if (!STATUSES.has(status)) errors.push('status must be confirmed or pending_list');
    else out.status = status;
  }
  if (!partial || source.exTaxUnitPrice !== undefined) {
    const price = Number(source.exTaxUnitPrice);
    if (!Number.isFinite(price) || price < 0) errors.push('exTaxUnitPrice must be a number >= 0');
    else out.exTaxUnitPrice = Math.round(price * 100) / 100;
  }
  if (!partial || source.currency !== undefined) {
    const currency = text(source.currency || 'CNY', 8).toUpperCase() || 'CNY';
    if (!/^[A-Z]{3}$/.test(currency)) errors.push('currency must be a 3-letter code');
    else out.currency = currency;
  } else if (!partial) {
    out.currency = 'CNY';
  }
  if (!partial || source.channel !== undefined) {
    const channel = text(source.channel, 32);
    if (!CHANNELS.has(channel)) errors.push('channel must be taobao, 1688, official_agent, or other');
    else out.channel = channel;
  }
  if (!partial || source.shopOrAgentName !== undefined) {
    out.shopOrAgentName = requiredText(source.shopOrAgentName, 120, 'shopOrAgentName', errors);
  }
  if (!partial || source.shopOrProductLink !== undefined) {
    out.shopOrProductLink = requiredText(source.shopOrProductLink, 300, 'shopOrProductLink', errors);
  }
  if (!partial || source.confirmedDate !== undefined) {
    const confirmedDate = text(source.confirmedDate, 10);
    if (!DATE_RE.test(confirmedDate)) errors.push('confirmedDate must be YYYY-MM-DD');
    else out.confirmedDate = confirmedDate;
  }
  if (!partial || source.inquiredBy !== undefined) {
    out.inquiredBy = requiredText(source.inquiredBy, 80, 'inquiredBy', errors);
  }
  if (source.orderRef !== undefined) out.orderRef = text(source.orderRef, 40);
  else if (!partial) out.orderRef = '';
  if (source.leadTime !== undefined) out.leadTime = text(source.leadTime, 80);
  else if (!partial) out.leadTime = '';
  if (source.qtyNote !== undefined) out.qtyNote = text(source.qtyNote, 120);
  else if (!partial) out.qtyNote = '';
  if (source.notes !== undefined) out.notes = text(source.notes, 500);
  else if (!partial) out.notes = '';
  if (source.productImagePath !== undefined) out.productImagePath = text(source.productImagePath, 300);
  else if (!partial) out.productImagePath = '';

  return { errors, value: out };
}

export function publicRow(row) {
  return {
    id: row.id,
    model: row.model,
    status: row.status,
    exTaxUnitPrice: row.exTaxUnitPrice,
    currency: row.currency,
    channel: row.channel,
    shopOrAgentName: row.shopOrAgentName,
    shopOrProductLink: row.shopOrProductLink,
    confirmedDate: row.confirmedDate,
    inquiredBy: row.inquiredBy,
    orderRef: row.orderRef || '',
    leadTime: row.leadTime || '',
    qtyNote: row.qtyNote || '',
    notes: row.notes || '',
    productImagePath: row.productImagePath || '',
    updatedBy: row.updatedBy || '',
    updatedAt: row.updatedAt || '',
    createdBy: row.createdBy || '',
    createdAt: row.createdAt || '',
    sample: false,
  };
}
