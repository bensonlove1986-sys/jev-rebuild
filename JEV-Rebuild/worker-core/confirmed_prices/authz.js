/**
 * Confirmed Price Library authorization.
 * Mirrors the live workbench split: JEV internal staff may read;
 * tenant/customer accounts are denied; only pricing-summary writers mutate.
 * There is no AuthStore in this repo, so callers pass a jev1 session token
 * whose payload is the same user shape the workbench already uses
 * (userId, username, role, platformRole, tenantId).
 */

const INTERNAL_TENANT = 'jev-internal';
const TOKEN_PREFIX = 'jev1.';

const READ_ROLES = new Set([
  'admin',
  'agent',
  'sales',
  'business',
  'internal_sales',
  'business_sales',
]);

const WRITER_ROLES = new Set([
  'pricing_summary',
  'pricing-summary',
  'price_writer',
  'quotation_summary',
]);

function bytesToBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeSessionToken(user) {
  const json = JSON.stringify(user);
  return TOKEN_PREFIX + bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeSessionToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith(TOKEN_PREFIX)) return null;
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(token.slice(TOKEN_PREFIX.length)));
    const user = JSON.parse(json);
    if (!user || typeof user !== 'object' || Array.isArray(user)) return null;
    if (!user.userId && !user.username) return null;
    return user;
  } catch {
    return null;
  }
}

export function readSessionUser(request) {
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return decodeSessionToken(match[1].trim());
}

export function isCustomerOrTenant(user) {
  if (!user) return true;
  const accountType = String(user.accountType || '').toLowerCase();
  if (accountType === 'customer' || accountType === 'tenant') return true;
  const role = String(user.role || '').toLowerCase();
  if (role === 'customer' || role === 'tenant') return true;
  if (role === 'regional_agent') return true;
  const tenantId = user.tenantId ? String(user.tenantId) : '';
  if (tenantId && tenantId !== INTERNAL_TENANT && tenantId !== 'internal') return true;
  return false;
}

export function isJevInternal(user) {
  if (!user || isCustomerOrTenant(user)) return false;
  if (user.platformRole === 'SUPER_ADMIN') return true;
  const tenantId = user.tenantId ? String(user.tenantId) : '';
  return !tenantId || tenantId === INTERNAL_TENANT || tenantId === 'internal';
}

export function isPricingWriter(user) {
  if (!isJevInternal(user)) return false;
  if (user.platformRole === 'SUPER_ADMIN') return true;
  if (String(user.userId || '') === 'admin') return true;
  if (String(user.username || '').trim().toLowerCase() === 'benson') return true;
  return WRITER_ROLES.has(String(user.role || '').toLowerCase());
}

export function canReadConfirmedPrices(user) {
  if (!isJevInternal(user)) return false;
  if (isPricingWriter(user)) return true;
  return READ_ROLES.has(String(user.role || '').toLowerCase());
}

export function actorName(user) {
  return String(user.username || user.userId || 'unknown').trim().slice(0, 80);
}

export function authorize(user) {
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };
  if (!isJevInternal(user) || !canReadConfirmedPrices(user)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true, canWrite: isPricingWriter(user), user };
}
