import assert from 'node:assert/strict';
import { encodeSessionToken } from './authz.js';
import { handleConfirmedPricesRequest } from './handler.js';
import { buildShare, shareContainsSensitive } from './share.js';

const sales = {
  userId: 'sales-1',
  username: '朱业务',
  role: 'sales',
  tenantId: 'jev-internal',
};
const writer = {
  userId: 'writer-1',
  username: '汇总',
  role: 'pricing_summary',
  tenantId: 'jev-internal',
};
const customer = {
  userId: 'cust-1',
  username: 'buyer',
  role: 'customer',
  accountType: 'customer',
  tenantId: 'acme',
};
const tenant = {
  userId: 'tenant-1',
  username: 'agent-co',
  role: 'agent',
  accountType: 'tenant',
  tenantId: 'acme',
};

function request(method, path, { user, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (user) headers.authorization = `Bearer ${encodeSessionToken(user)}`;
  return new Request(`https://worker.test${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const sampleRow = {
  model: 'E3Z-D61',
  status: 'confirmed',
  exTaxUnitPrice: 48.5,
  currency: 'CNY',
  channel: 'taobao',
  shopOrAgentName: '某某工控旗舰店',
  shopOrProductLink: 'https://example.invalid/taobao/sample-not-real',
  confirmedDate: '2026-10-12',
  inquiredBy: 'SAMPLE',
  orderRef: 'ZJX-2410',
  notes: '假数据不可当真',
};

const memoryKv = () => {
  const map = new Map();
  return {
    async get(key, type) {
      const raw = map.get(key);
      if (raw == null) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key, value) {
      map.set(key, value);
    },
  };
};

async function main() {
  const env = { KV: memoryKv() };

  const anon = await handleConfirmedPricesRequest(request('GET', '/api/confirmed-prices'), env);
  assert.equal(anon.status, 401);

  const cust = await handleConfirmedPricesRequest(request('GET', '/api/confirmed-prices', { user: customer }), env);
  assert.equal(cust.status, 403);

  const ten = await handleConfirmedPricesRequest(request('GET', '/api/confirmed-prices', { user: tenant }), env);
  assert.equal(ten.status, 403);

  const read = await handleConfirmedPricesRequest(request('GET', '/api/confirmed-prices', { user: sales }), env);
  assert.equal(read.status, 200);
  const readBody = await read.json();
  assert.equal(readBody.count, 0);
  assert.equal(readBody.rows.length, 0);
  assert.equal(readBody.sample, false);

  const denied = await handleConfirmedPricesRequest(request('POST', '/api/confirmed-prices', {
    user: sales,
    body: sampleRow,
  }), env);
  assert.equal(denied.status, 403);

  const created = await handleConfirmedPricesRequest(request('POST', '/api/confirmed-prices', {
    user: writer,
    body: sampleRow,
  }), env);
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  assert.equal(createdBody.row.updatedBy, '汇总');
  assert.ok(createdBody.row.updatedAt);
  assert.equal(createdBody.row.sample, false);
  assert.equal('costPrice' in createdBody.row, false);
  assert.equal(createdBody.row.share.quotable, true);
  assert.equal(
    createdBody.row.share.customerText,
    'Need E3Z-D61? Ex-tax from 48.50 CNY. Qty + nameplate → quote.',
  );
  assert.equal(shareContainsSensitive(createdBody.row.share.customerText, sampleRow), false);
  assert.equal(shareContainsSensitive(createdBody.row.share.copyText, sampleRow), false);
  assert.ok(!createdBody.row.share.whatsappUrl.includes('example.invalid'));

  const found = await handleConfirmedPricesRequest(
    request('GET', '/api/confirmed-prices?model=e3z', { user: sales }),
    env,
  );
  const foundBody = await found.json();
  assert.equal(foundBody.count, 1);

  const cost = await handleConfirmedPricesRequest(request('POST', '/api/confirmed-prices', {
    user: writer,
    body: { ...sampleRow, model: 'COST-1', costPrice: 10 },
  }), env);
  assert.equal(cost.status, 400);

  const pending = await handleConfirmedPricesRequest(request('POST', '/api/confirmed-prices', {
    user: writer,
    body: { ...sampleRow, model: 'PXM-100', status: 'pending_list', exTaxUnitPrice: 89 },
  }), env);
  const pendingBody = await pending.json();
  assert.equal(pendingBody.row.share.whatsappUrl, null);
  assert.equal(pendingBody.row.share.customerText, null);
  const pendingShare = buildShare(pendingBody.row);
  assert.equal(shareContainsSensitive(pendingShare.customerText, pendingBody.row), false);

  const admin = {
    userId: 'admin',
    username: 'lead',
    role: 'admin',
    platformRole: 'SUPER_ADMIN',
    tenantId: 'jev-internal',
  };
  const removed = await handleConfirmedPricesRequest(
    request('DELETE', `/api/confirmed-prices/${createdBody.row.id}`, { user: admin }),
    env,
  );
  assert.equal(removed.status, 200);

  const regional = await handleConfirmedPricesRequest(request('GET', '/api/confirmed-prices', {
    user: { userId: 'r1', username: 'vn', role: 'regional_agent', tenantId: 'jev-internal' },
  }), env);
  assert.equal(regional.status, 403);

  console.log('confirmed price library tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
