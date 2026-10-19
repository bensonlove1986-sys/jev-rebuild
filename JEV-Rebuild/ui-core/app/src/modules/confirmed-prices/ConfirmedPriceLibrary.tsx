import React, { useEffect, useMemo, useState } from 'react';
import { useModuleStore } from '../../store/moduleStore';
import type { ModuleType } from '../../store/moduleStore';
import { deletePrice, loadLibrary, savePrice } from './api';
import { SAMPLE_ROWS } from './sample';
import { shareFor } from './share';
import type { PriceChannel, PriceRow, PriceStatus } from './types';
import './ConfirmedPriceLibrary.css';

const CHANNEL_LABEL: Record<PriceChannel, string> = {
  taobao: '淘宝',
  '1688': '1688',
  official_agent: '官网代理',
  other: '其他',
};

const EMPTY_CN = '还没有该型号的确认价。请走询价流程，确认后由汇总入库。';
const EMPTY_EN = 'No confirmed price for this model yet. Send it through inquiry; pricing team will add it after confirmation.';

type NavItem = { id: string; label: string; module?: ModuleType };

const SIDE_NAV: NavItem[] = [
  { id: 'todo', label: '销售作战中心' },
  { id: 'prices', label: '确认价价库', module: 'confirmed-prices' },
  { id: 'chat', label: '聊天 WhatsApp', module: 'chat' },
  { id: 'web', label: '官网聊天' },
  { id: 'wecom', label: '企微询价' },
  { id: 'products', label: '产品中心', module: 'products' },
  { id: 'orders', label: '订单 / PI', module: 'orders' },
  { id: 'pay', label: '收款说明' },
  { id: 'settings', label: '设置', module: 'system' },
];

const MOBILE_TABS: NavItem[] = [
  { id: 'todo', label: '作战' },
  { id: 'prices', label: '价库', module: 'confirmed-prices' },
  { id: 'products', label: '产品', module: 'products' },
  { id: 'orders', label: '订单', module: 'orders' },
];

const BLANK_FORM = {
  model: '',
  status: 'confirmed' as PriceStatus,
  exTaxUnitPrice: '',
  currency: 'CNY',
  channel: 'taobao' as PriceChannel,
  shopOrAgentName: '',
  shopOrProductLink: '',
  confirmedDate: '',
  inquiredBy: '',
  orderRef: '',
  leadTime: '',
  qtyNote: '',
  notes: '',
};

function priceLabel(row: PriceRow) {
  const amount = Number(row.exTaxUnitPrice).toFixed(2);
  return (row.currency || 'CNY').toUpperCase() === 'CNY' ? `¥ ${amount}` : `${row.currency} ${amount}`;
}

function linkLabel(link: string) {
  const value = link.toLowerCase();
  if (value.includes('taobao')) return 'taobao…';
  if (value.includes('1688')) return '1688…';
  if (value.startsWith('tel:') || value.startsWith('mailto:') || value.includes('@')) return 'tel…';
  return link.length > 12 ? `${link.slice(0, 8)}…` : link;
}

function matches(row: PriceRow, query: string) {
  if (!query) return true;
  return row.model.toLowerCase().includes(query.toLowerCase().trim());
}

const ConfirmedPriceLibrary: React.FC = () => {
  const setModule = useModuleStore((state) => state.setModule);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [liveRows, setLiveRows] = useState<PriceRow[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(BLANK_FORM);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    meta.setAttribute('data-confirmed-prices', '1');
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLibrary().then((result) => {
      if (cancelled) return;
      setLiveRows(result.rows);
      setCanWrite(result.canWrite);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const usingSample = liveRows.length === 0;
  const source = usingSample ? SAMPLE_ROWS : liveRows;
  const rows = useMemo(() => source.filter((row) => matches(row, query)), [source, query]);
  const showEmpty = query.trim().length > 0 && rows.length === 0;

  const go = (item: NavItem) => {
    if (item.module && item.module !== 'confirmed-prices') setModule(item.module);
  };

  const openShare = async (row: PriceRow, mode: 'whatsapp' | 'copy') => {
    const share = shareFor(row);
    if (!share.quotable || !share.customerText || !share.copyText) {
      setNotice(share.pendingNotice || '挂牌待确认，勿直接报给客户。');
      return;
    }
    if (mode === 'copy') {
      try {
        await navigator.clipboard.writeText(share.copyText);
      } catch {
        const area = document.createElement('textarea');
        area.value = share.copyText;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      setNotice(`已复制：${share.copyText}`);
      return;
    }
    window.open(share.whatsappUrl || '', '_blank', 'noopener,noreferrer');
    setNotice('');
  };

  const submitForm = async () => {
    setFormError('');
    const payload = {
      ...form,
      exTaxUnitPrice: Number(form.exTaxUnitPrice),
    };
    const result = await savePrice(payload, editingId || undefined);
    if (!result.ok) {
      setFormError(result.error || '保存失败');
      return;
    }
    const refreshed = await loadLibrary();
    setLiveRows(refreshed.rows);
    setCanWrite(refreshed.canWrite);
    setForm(BLANK_FORM);
    setEditingId('');
    setFormOpen(false);
  };

  const removeRow = async (row: PriceRow) => {
    if (row.sample) return;
    const ok = await deletePrice(row.id);
    if (!ok) return;
    const refreshed = await loadLibrary();
    setLiveRows(refreshed.rows);
  };

  return (
    <div className="cpl-app">
      <aside className="cpl-side">
        <div className="cpl-brand">
          <div className="cpl-logo">JV</div>
          <div>
            <strong>JVTOOLS</strong>
            <span>J&V Workbench</span>
          </div>
        </div>
        <nav className="cpl-nav">
          {SIDE_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === 'prices' ? 'active' : ''}
              onClick={() => go(item)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="cpl-side-foot">内部工具 · Internal</div>
      </aside>

      <section className="cpl-main">
        <header className="cpl-top">
          <div>
            <div className="cpl-title">
              确认价价库
              <em>Confirmed Price Library</em>
            </div>
          </div>
          <div className="cpl-badge">
            <i />
            {canWrite ? '汇总 · 可写 · Pricing writer' : '业务员 · 只读 · Sales · View only'}
          </div>
        </header>

        <header className="cpl-mobile-top">
          <div className="cpl-mobile-brand">
            <div className="cpl-logo">JV</div>
            <div>
              <strong>JVTOOLS</strong>
              <span>确认价价库 · Price Library</span>
            </div>
          </div>
          <div className="cpl-badge">{canWrite ? '可写 Writer' : '只读 View only'}</div>
        </header>

        <div className="cpl-tabs">
          {MOBILE_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === 'prices' ? 'active' : ''}
              onClick={() => go(item)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="cpl-body">
          <p className="cpl-sub">按型号查看未税确认价与待确认挂牌 · 业务只读</p>
          <p className="cpl-sub-en">Search models for confirmed ex-tax prices and pending list prices (sales: view only)</p>
          {!canWrite && (
            <p className="cpl-perm">你只有查看权限；改价请联系报价资料汇总。 View only. Ask pricing team to edit.</p>
          )}

          <form
            className="cpl-search"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(draft);
              setNotice('');
            }}
          >
            <label htmlFor="cpl-model-search">按型号查询 Search by model</label>
            <div className="cpl-search-row">
              <div className="cpl-input-wrap">
                <span aria-hidden="true">⌕</span>
                <input
                  id="cpl-model-search"
                  value={draft}
                  placeholder="输入型号，如 E3Z-D61"
                  onChange={(event) => setDraft(event.target.value)}
                />
              </div>
              <button type="submit">查询 Search</button>
            </div>
          </form>

          <section className="cpl-results">
            <div className="cpl-results-head">
              <strong>查询结果</strong>
              <em>Results</em>
              {usingSample && !showEmpty && <span className="cpl-sample-pill">SAMPLE 假数据</span>}
              <span className="cpl-count">
                {showEmpty ? '0 条' : `${rows.length} 条 · 内部可见`}
                <span className="cpl-mini-logo">JV</span>
              </span>
            </div>
            <div className="cpl-safety long">WhatsApp 一键：只带 型号 + 可报未税价 · 不带店铺进货链 / 成本</div>
            <div className="cpl-safety short">WA 只带型号+可报未税价 · 不带店链</div>

            {!showEmpty && (
              <div className="cpl-table-wrap">
                <table className="cpl-table">
                  <thead>
                    <tr>
                      <th>型号</th>
                      <th>状态</th>
                      <th>未税单价</th>
                      <th>渠道</th>
                      <th>店名/代理</th>
                      <th>链接</th>
                      <th>确认日期</th>
                      <th>询价人</th>
                      <th>订单号</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="cpl-model">{row.model}</td>
                        <td>
                          <span className={row.status === 'confirmed' ? 'cpl-status ok' : 'cpl-status pending'}>
                            <i />
                            {row.status === 'confirmed' ? '已确认' : '挂牌待确认'}
                          </span>
                        </td>
                        <td className="cpl-price">{priceLabel(row)}</td>
                        <td>{CHANNEL_LABEL[row.channel]}</td>
                        <td>{row.shopOrAgentName}</td>
                        <td>
                          <a className="cpl-link" href={row.shopOrProductLink} target="_blank" rel="noreferrer">
                            {linkLabel(row.shopOrProductLink)}
                          </a>
                        </td>
                        <td>{row.confirmedDate}</td>
                        <td>{row.inquiredBy}</td>
                        <td>{row.orderRef || '—'}</td>
                        <td>
                          <div className="cpl-actions">
                            <button type="button" className="cpl-wa" onClick={() => openShare(row, 'whatsapp')}>→ WhatsApp</button>
                            <button type="button" className="cpl-copy" onClick={() => openShare(row, 'copy')}>复制型号+价</button>
                            {canWrite && !row.sample && (
                              <>
                                <button type="button" className="cpl-copy" onClick={() => {
                                  setEditingId(row.id);
                                  setFormOpen(true);
                                  setForm({
                                    model: row.model,
                                    status: row.status,
                                    exTaxUnitPrice: String(row.exTaxUnitPrice),
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
                                  });
                                }}>编辑</button>
                                <button type="button" className="cpl-copy" onClick={() => removeRow(row)}>删除</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!showEmpty && (
              <div className="cpl-cards">
                {rows.map((row) => (
                  <article key={row.id} className="cpl-card">
                    <div className="cpl-card-top">
                      <div>
                        <div className="cpl-model">{row.model}</div>
                        <span className={row.status === 'confirmed' ? 'cpl-status ok' : 'cpl-status pending'}>
                          <i />
                          {row.status === 'confirmed' ? '已确认' : '挂牌待确认'}
                        </span>
                      </div>
                      <div className="cpl-price">{priceLabel(row)}</div>
                    </div>
                    <div className="cpl-card-meta">
                      {CHANNEL_LABEL[row.channel]} · {row.shopOrAgentName}
                      <br />
                      {row.confirmedDate} · {row.inquiredBy} · {row.orderRef || '—'}
                    </div>
                    <div className="cpl-card-actions">
                      <button type="button" className="cpl-wa" onClick={() => openShare(row, 'whatsapp')}>→ WhatsApp</button>
                      <button type="button" className="cpl-copy" onClick={() => openShare(row, 'copy')}>复制型号+价</button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {(showEmpty || (usingSample && !query.trim())) && (
              <div className="cpl-empty">
                {showEmpty ? (
                  <>
                    <p>{EMPTY_CN}</p>
                    <p className="en">{EMPTY_EN}</p>
                  </>
                ) : (
                  <>
                    <strong>空状态示意 · 无结果时</strong>
                    <p>{EMPTY_CN}</p>
                  </>
                )}
              </div>
            )}
            {notice && <div className="cpl-notice">{notice}</div>}
          </section>

          {canWrite && (
            <section className="cpl-writer">
              <h3>汇总入库</h3>
              {!formOpen ? (
                <button type="button" onClick={() => { setFormOpen(true); setEditingId(''); setForm(BLANK_FORM); }}>新增确认价</button>
              ) : (
                <div className="cpl-form">
                  <label>型号<input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
                  <label>状态
                    <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as PriceStatus })}>
                      <option value="confirmed">已确认</option>
                      <option value="pending_list">挂牌待确认</option>
                    </select>
                  </label>
                  <label>未税单价<input value={form.exTaxUnitPrice} onChange={(event) => setForm({ ...form, exTaxUnitPrice: event.target.value })} /></label>
                  <label>币种<input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} /></label>
                  <label>渠道
                    <select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value as PriceChannel })}>
                      <option value="taobao">淘宝</option>
                      <option value="1688">1688</option>
                      <option value="official_agent">官网代理</option>
                      <option value="other">其他</option>
                    </select>
                  </label>
                  <label>店名/代理<input value={form.shopOrAgentName} onChange={(event) => setForm({ ...form, shopOrAgentName: event.target.value })} /></label>
                  <label>链接或电话/邮箱<input value={form.shopOrProductLink} onChange={(event) => setForm({ ...form, shopOrProductLink: event.target.value })} /></label>
                  <label>确认日期<input placeholder="YYYY-MM-DD" value={form.confirmedDate} onChange={(event) => setForm({ ...form, confirmedDate: event.target.value })} /></label>
                  <label>询价人<input value={form.inquiredBy} onChange={(event) => setForm({ ...form, inquiredBy: event.target.value })} /></label>
                  <label>订单号<input value={form.orderRef} onChange={(event) => setForm({ ...form, orderRef: event.target.value })} /></label>
                  <label>货期<input value={form.leadTime} onChange={(event) => setForm({ ...form, leadTime: event.target.value })} /></label>
                  <label>数量说明<input value={form.qtyNote} onChange={(event) => setForm({ ...form, qtyNote: event.target.value })} /></label>
                  <label>备注<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
                </div>
              )}
              {formOpen && (
                <div className="cpl-writer-actions">
                  <button type="button" onClick={submitForm}>保存</button>
                  <button type="button" className="ghost" onClick={() => setFormOpen(false)}>取消</button>
                </div>
              )}
              {formError && <div className="cpl-error">{formError}</div>}
            </section>
          )}

          <footer className="cpl-foot">
            <span>底注：成本价不在此页显示；写入仅「报价资料汇总」可改 · 业务只读</span>
            <span>{usingSample ? 'UI v2 · SAMPLE · NOT LIVE' : 'UI v2 · 内部'}</span>
          </footer>
        </div>
      </section>
    </div>
  );
};

export default ConfirmedPriceLibrary;
