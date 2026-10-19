import type { PriceRow } from './types';

const TOKEN_KEY = 'jev_session_token';

function headers(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  const next: Record<string, string> = { 'content-type': 'application/json' };
  if (token) next.authorization = `Bearer ${token}`;
  return next;
}

export async function loadLibrary(): Promise<{ canWrite: boolean; rows: PriceRow[]; connected: boolean }> {
  if (!localStorage.getItem(TOKEN_KEY)) {
    return { canWrite: false, rows: [], connected: false };
  }
  try {
    const meRes = await fetch('/api/confirmed-prices/me', { headers: headers() });
    if (!meRes.ok) return { canWrite: false, rows: [], connected: false };
    const me = await meRes.json() as { canWrite?: boolean };
    const listRes = await fetch('/api/confirmed-prices', { headers: headers() });
    if (!listRes.ok) return { canWrite: Boolean(me.canWrite), rows: [], connected: false };
    const list = await listRes.json() as { rows?: PriceRow[] };
    return { canWrite: Boolean(me.canWrite), rows: list.rows || [], connected: true };
  } catch {
    return { canWrite: false, rows: [], connected: false };
  }
}

export async function savePrice(row: Partial<PriceRow>, id?: string): Promise<{ ok: boolean; error?: string }> {
  const path = id ? `/api/confirmed-prices/${encodeURIComponent(id)}` : '/api/confirmed-prices';
  const res = await fetch(path, {
    method: id ? 'PATCH' : 'POST',
    headers: headers(),
    body: JSON.stringify(row),
  });
  const body = await res.json().catch(() => ({})) as { error?: string };
  return { ok: res.ok, error: body.error };
}

export async function deletePrice(id: string): Promise<boolean> {
  const res = await fetch(`/api/confirmed-prices/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return res.ok;
}
