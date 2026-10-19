import { actorName, authorize, readSessionUser } from './authz.js';
import { normalizePriceInput, publicRow } from './model.js';
import { assertNoCostFields, buildShare } from './share.js';
import { createPriceStore } from './store.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'Content-Type, Authorization',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function routeOf(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/api/confirmed-prices') return { kind: 'collection' };
  if (path === '/api/confirmed-prices/me') return { kind: 'me' };
  const match = path.match(/^\/api\/confirmed-prices\/([^/]+)$/);
  if (match) return { kind: 'item', id: decodeURIComponent(match[1]) };
  return null;
}

function withShare(row) {
  return { ...publicRow(row), share: buildShare(row) };
}

export async function handleConfirmedPricesRequest(request, env) {
  const url = new URL(request.url);
  const route = routeOf(url.pathname);
  if (!route) return json({ ok: false, error: 'Not Found' }, 404);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });

  const auth = authorize(readSessionUser(request));
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  if (route.kind === 'me' && request.method === 'GET') {
    return json({
      ok: true,
      canWrite: auth.canWrite,
      role: auth.user.role || '',
      platformRole: auth.user.platformRole || '',
      userId: auth.user.userId || '',
    });
  }

  const store = createPriceStore(env);
  const rows = await store.list();

  if (route.kind === 'collection' && request.method === 'GET') {
    const query = (url.searchParams.get('model') || url.searchParams.get('q') || '').trim().toLowerCase();
    const filtered = query
      ? rows.filter((row) => String(row.model || '').toLowerCase().includes(query))
      : rows;
    return json({
      ok: true,
      canWrite: auth.canWrite,
      count: filtered.length,
      rows: filtered.map(withShare),
      sample: false,
    });
  }

  if (route.kind === 'collection' && request.method === 'POST') {
    if (!auth.canWrite) return json({ ok: false, error: 'Forbidden' }, 403);
    const body = await request.json().catch(() => null);
    const blocked = assertNoCostFields(body);
    if (blocked) return json({ ok: false, error: blocked }, 400);
    const parsed = normalizePriceInput(body);
    if (parsed.errors.length) return json({ ok: false, error: parsed.errors.join('; ') }, 400);
    const now = new Date().toISOString();
    const actor = actorName(auth.user);
    const row = {
      id: `cp_${crypto.randomUUID()}`,
      ...parsed.value,
      createdBy: actor,
      createdAt: now,
      updatedBy: actor,
      updatedAt: now,
    };
    rows.unshift(row);
    await store.save(rows);
    return json({ ok: true, canWrite: true, row: withShare(row) }, 201);
  }

  if (route.kind === 'item' && request.method === 'GET') {
    const row = rows.find((item) => item.id === route.id);
    if (!row) return json({ ok: false, error: 'Not Found' }, 404);
    return json({ ok: true, canWrite: auth.canWrite, row: withShare(row) });
  }

  if (route.kind === 'item' && request.method === 'PATCH') {
    if (!auth.canWrite) return json({ ok: false, error: 'Forbidden' }, 403);
    const index = rows.findIndex((item) => item.id === route.id);
    if (index < 0) return json({ ok: false, error: 'Not Found' }, 404);
    const body = await request.json().catch(() => null);
    const blocked = assertNoCostFields(body);
    if (blocked) return json({ ok: false, error: blocked }, 400);
    const parsed = normalizePriceInput({ ...rows[index], ...body });
    if (parsed.errors.length) return json({ ok: false, error: parsed.errors.join('; ') }, 400);
    const row = {
      ...rows[index],
      ...parsed.value,
      updatedBy: actorName(auth.user),
      updatedAt: new Date().toISOString(),
    };
    rows[index] = row;
    await store.save(rows);
    return json({ ok: true, canWrite: true, row: withShare(row) });
  }

  if (route.kind === 'item' && request.method === 'DELETE') {
    if (!auth.canWrite) return json({ ok: false, error: 'Forbidden' }, 403);
    const index = rows.findIndex((item) => item.id === route.id);
    if (index < 0) return json({ ok: false, error: 'Not Found' }, 404);
    const [removed] = rows.splice(index, 1);
    await store.save(rows);
    return json({ ok: true, deletedId: removed.id });
  }

  return json({ ok: false, error: 'Method Not Allowed' }, 405);
}
