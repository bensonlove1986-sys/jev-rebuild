/**
 * Media Key Generator
 * v3.1 极限稳定版
 * 
 * Core principles:
 * - UI does not generate R2 keys, only sends source + meta
 * - Worker generates keys + ensures idempotency + stores + returns media_path
 * - R2 is the single source of truth
 * - All callers use the same ingestMedia()
 */

/**
 * Media namespace types
 */
export type MediaNamespace = 'whatsapp' | 'ocr' | 'upload';

/**
 * Media direction types
 */
export type MediaDirection = 'inbound' | 'outbound' | 'ocr' | 'manual';

/**
 * Media key generation options
 */
export interface MediaKeyOptions {
  namespace: MediaNamespace;
  direction: MediaDirection;
  customerId: string;
  mediaId?: string;
  contentHash?: string;
}

/**
 * Sanitize customer ID to prevent key conflicts and path issues
 * @param customerId Raw customer ID
 * @returns Sanitized customer ID
 */
export function sanitizeCustomerId(customerId: string): string {
  if (!customerId) {
    return 'unknown';
  }
  
  // Normalize WhatsApp format
  let sanitized = customerId.trim();
  
  // Remove whatsapp: prefix if present
  sanitized = sanitized.replace(/^whatsapp:/i, '');
  
  // Remove spaces and special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9+]/g, '_');
  
  // Limit length to prevent overly long keys
  const maxLength = 64;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized || 'unknown';
}

/**
 * Generate collision-proof media key
 * @param options Key generation options
 * @returns Generated R2 key
 */
export function generateMediaKey(options: MediaKeyOptions): string {
  const {
    namespace,
    direction,
    customerId,
    mediaId,
    contentHash
  } = options;
  
  // Validate required fields
  if (!namespace || !direction || !customerId) {
    throw new Error('Missing required media key options');
  }
  
  // Sanitize customer ID
  const sanitizedCustomerId = sanitizeCustomerId(customerId);
  
  // Determine media identifier
  let mediaIdentifier: string;
  if (mediaId) {
    // Use provided media ID (e.g., Twilio MediaSid)
    mediaIdentifier = mediaId.trim().replace(/[^a-zA-Z0-9]/g, '_');
  } else if (contentHash) {
    // Use content hash (for uploads without media ID)
    mediaIdentifier = contentHash.substring(0, 32); // Use first 32 chars for brevity
  } else {
    // Generate random ID as fallback
    mediaIdentifier = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Build key structure: <namespace>/<direction>/<customer_id>/<media_id_or_hash>
  const keyParts = [
    namespace,
    direction,
    sanitizedCustomerId,
    mediaIdentifier
  ];
  
  const r2Key = keyParts.join('/');
  
  console.log('[MEDIA_KEY_GENERATED]', {
    namespace,
    direction,
    customerId: sanitizedCustomerId,
    mediaId: mediaIdentifier,
    r2Key
  });
  
  return r2Key;
}

/**
 * Generate manifest key for media
 * @param mediaKey R2 media key
 * @returns Manifest key
 */
export function generateManifestKey(mediaKey: string): string {
  // Replace slashes with underscores for manifest key
  const safeKey = mediaKey.replace(/\//g, '_');
  return `whatsapp/manifest/${safeKey}.json`;
}

/**
 * Parse media key into components
 * @param mediaKey R2 media key
 * @returns Key components
 */
export function parseMediaKey(mediaKey: string): {
  namespace: MediaNamespace;
  direction: MediaDirection;
  customerId: string;
  mediaId: string;
} {
  const parts = mediaKey.split('/');
  
  if (parts.length < 4) {
    throw new Error('Invalid media key format');
  }
  
  return {
    namespace: parts[0] as MediaNamespace,
    direction: parts[1] as MediaDirection,
    customerId: parts[2],
    mediaId: parts.slice(3).join('/')
  };
}

/**
 * Validate media key format
 * @param mediaKey R2 media key
 * @returns True if valid
 */
export function validateMediaKey(mediaKey: string): boolean {
  try {
    parseMediaKey(mediaKey);
    return true;
  } catch {
    return false;
  }
}
