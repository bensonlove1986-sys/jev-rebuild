export type PriceStatus = 'confirmed' | 'pending_list';
export type PriceChannel = 'taobao' | '1688' | 'official_agent' | 'other';

export interface PriceShare {
  quotable: boolean;
  customerText: string | null;
  copyText: string | null;
  whatsappUrl: string | null;
  pendingNotice: string | null;
}

export interface PriceRow {
  id: string;
  model: string;
  status: PriceStatus;
  exTaxUnitPrice: number;
  currency: string;
  channel: PriceChannel;
  shopOrAgentName: string;
  shopOrProductLink: string;
  confirmedDate: string;
  inquiredBy: string;
  orderRef?: string;
  leadTime?: string;
  qtyNote?: string;
  notes?: string;
  productImagePath?: string;
  updatedBy?: string;
  updatedAt?: string;
  sample?: boolean;
  share?: PriceShare;
}
