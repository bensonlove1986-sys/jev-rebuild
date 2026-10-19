import type { PriceRow, PriceShare } from './types';

function cleanLine(value: unknown, max: number) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

export function buildShare(row: Pick<PriceRow, 'model' | 'status' | 'exTaxUnitPrice' | 'currency'>): PriceShare {
  const model = cleanLine(row.model, 80);
  const amount = Number.isFinite(Number(row.exTaxUnitPrice)) ? Number(row.exTaxUnitPrice).toFixed(2) : '';
  const currency = cleanLine(row.currency || 'CNY', 8).toUpperCase() || 'CNY';
  const quotable = row.status === 'confirmed' && Boolean(model) && Boolean(amount);
  const customerText = quotable
    ? `Need ${model}? Ex-tax from ${amount} ${currency}. Qty + nameplate → quote.`
    : null;
  const copyText = quotable ? `${model} 未税 ${amount} ${currency}` : null;
  return {
    quotable,
    customerText,
    copyText,
    whatsappUrl: customerText ? `https://wa.me/?text=${encodeURIComponent(customerText)}` : null,
    pendingNotice: quotable ? null : '挂牌待确认，勿直接报给客户。',
  };
}

export function shareFor(row: PriceRow): PriceShare {
  const local = buildShare(row);
  if (!row.share) return local;
  if (row.status !== 'confirmed') {
    return { ...local, quotable: false, customerText: null, copyText: null, whatsappUrl: null };
  }
  return {
    quotable: true,
    customerText: row.share.customerText || local.customerText,
    copyText: row.share.copyText || local.copyText,
    whatsappUrl: row.share.whatsappUrl || local.whatsappUrl,
    pendingNotice: null,
  };
}
