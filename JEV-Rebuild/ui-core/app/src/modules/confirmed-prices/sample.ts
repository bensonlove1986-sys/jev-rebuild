import type { PriceRow } from './types';

/**
 * Design-preview rows only. Amounts and shops are fake placeholders so the
 * empty library still matches UI v2. They are never written to KV.
 */
export const SAMPLE_ROWS: PriceRow[] = [
  {
    id: 'sample-e3z-d61',
    model: 'E3Z-D61',
    status: 'confirmed',
    exTaxUnitPrice: 48.5,
    currency: 'CNY',
    channel: 'taobao',
    shopOrAgentName: '某某工控旗舰店',
    shopOrProductLink: 'https://example.invalid/taobao/sample-not-real',
    confirmedDate: '2026-10-12',
    inquiredBy: '朱健雄',
    orderRef: 'ZJX-2410',
    sample: true,
  },
  {
    id: 'sample-e6b2',
    model: 'E6B2-CWZ6C',
    status: 'pending_list',
    exTaxUnitPrice: 126,
    currency: 'CNY',
    channel: '1688',
    shopOrAgentName: '编码器专营',
    shopOrProductLink: 'https://example.invalid/1688/sample-not-real',
    confirmedDate: '2026-10-15',
    inquiredBy: '陈旭乐',
    orderRef: 'CXL-1022',
    sample: true,
  },
  {
    id: 'sample-pxm',
    model: 'PXM-100',
    status: 'confirmed',
    exTaxUnitPrice: 89,
    currency: 'CNY',
    channel: 'official_agent',
    shopOrAgentName: '华南 · 张工',
    shopOrProductLink: 'tel:000-0000-0000',
    confirmedDate: '2026-10-08',
    inquiredBy: '汇总',
    orderRef: '',
    sample: true,
  },
];
