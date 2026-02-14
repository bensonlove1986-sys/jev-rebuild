/**
 * Media Manifest Manager
 * v3.1 极限稳定版
 * 
 * Core principles:
 * - UI does not generate R2 keys, only sends source + meta
 * - Worker generates keys + ensures idempotency + stores + returns media_path
 * - R2 is the single source of truth
 * - All callers use the same ingestMedia()
 */

/**
 * Media manifest structure
 */
export interface MediaManifest {
  /** R2 media key */
  key: string;
  /** SHA256 hash of content */
  sha256: string;
  /** File size in bytes */
  bytes: number;
  /** Content type */
  contentType: string;
  /** Creation timestamp */
  createdAt: number;
  /** Source information */
  source?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Manifest storage options
 */
export interface ManifestOptions {
  /** Use R2 for storage */
  useR2?: boolean;
  /** Use KV for storage */
  useKV?: boolean;
}

/**
 * Environment with manifest capabilities
 */
export interface ManifestEnvironment {
  /** R2 bucket for manifests */
  R2?: any;
  /** KV namespace for manifests */
  KV?: any;
}

/**
 * Manifest storage interface
 */
export interface ManifestStorage {
  /**
   * Write manifest
   * @param key Manifest key
   * @param manifest Manifest data
   */
  write(key: string, manifest: MediaManifest): Promise<void>;
  
  /**
   * Read manifest
   * @param key Manifest key
   * @returns Manifest data or null if not found
   */
  read(key: string): Promise<MediaManifest | null>;
  
  /**
   * Check if manifest exists
   * @param key Manifest key
   * @returns True if manifest exists
   */
  exists(key: string): Promise<boolean>;
}

/**
 * R2 based manifest storage
 */
export class R2ManifestStorage implements ManifestStorage {
  private env: ManifestEnvironment;
  
  constructor(env: ManifestEnvironment) {
    this.env = env;
  }
  
  async write(key: string, manifest: MediaManifest): Promise<void> {
    if (!this.env.R2) {
      throw new Error('R2 bucket not configured for manifests');
    }
    
    try {
      const manifestJson = JSON.stringify(manifest, null, 2);
      await this.env.R2.put(key, manifestJson, {
        contentType: 'application/json',
        metadata: {
          manifest: 'true',
          mediaKey: manifest.key
        }
      });
      
      console.log('[MEDIA_V31_MANIFEST_OK]', { manifestKey: key, mediaKey: manifest.key });
    } catch (error) {
      console.error('[MEDIA_MANIFEST_WRITE_ERROR]', error.message);
      throw error;
    }
  }
  
  async read(key: string): Promise<MediaManifest | null> {
    if (!this.env.R2) {
      throw new Error('R2 bucket not configured for manifests');
    }
    
    try {
      const object = await this.env.R2.get(key);
      if (!object) {
        return null;
      }
      
      const manifestJson = await object.text();
      return JSON.parse(manifestJson) as MediaManifest;
    } catch (error) {
      console.error('[MEDIA_MANIFEST_READ_ERROR]', error.message);
      return null;
    }
  }
  
  async exists(key: string): Promise<boolean> {
    if (!this.env.R2) {
      throw new Error('R2 bucket not configured for manifests');
    }
    
    try {
      const object = await this.env.R2.head(key);
      return !!object;
    } catch (error) {
      console.error('[MEDIA_MANIFEST_EXISTS_ERROR]', error.message);
      return false;
    }
  }
}

/**
 * KV based manifest storage
 */
export class KVManifestStorage implements ManifestStorage {
  private env: ManifestEnvironment;
  
  constructor(env: ManifestEnvironment) {
    this.env = env;
  }
  
  async write(key: string, manifest: MediaManifest): Promise<void> {
    if (!this.env.KV) {
      throw new Error('KV namespace not configured for manifests');
    }
    
    try {
      await this.env.KV.put(key, JSON.stringify(manifest), {
        expirationTtl: 86400 * 30 // 30 days
      });
      
      console.log('[MEDIA_V31_MANIFEST_OK]', { manifestKey: key, mediaKey: manifest.key });
    } catch (error) {
      console.error('[MEDIA_MANIFEST_WRITE_ERROR]', error.message);
      throw error;
    }
  }
  
  async read(key: string): Promise<MediaManifest | null> {
    if (!this.env.KV) {
      throw new Error('KV namespace not configured for manifests');
    }
    
    try {
      const value = await this.env.KV.get(key);
      if (!value) {
        return null;
      }
      
      return JSON.parse(value) as MediaManifest;
    } catch (error) {
      console.error('[MEDIA_MANIFEST_READ_ERROR]', error.message);
      return null;
    }
  }
  
  async exists(key: string): Promise<boolean> {
    if (!this.env.KV) {
      throw new Error('KV namespace not configured for manifests');
    }
    
    try {
      const value = await this.env.KV.get(key);
      return !!value;
    } catch (error) {
      console.error('[MEDIA_MANIFEST_EXISTS_ERROR]', error.message);
      return false;
    }
  }
}

/**
 * Media manifest manager
 */
export class MediaManifestManager {
  private storage: ManifestStorage;
  
  constructor(storage: ManifestStorage) {
    this.storage = storage;
  }
  
  /**
   * Create and write manifest
   * @param mediaKey R2 media key
   * @param manifestData Manifest data
   * @returns Created manifest
   */
  async create(mediaKey: string, manifestData: Partial<MediaManifest>): Promise<MediaManifest> {
    const manifest: MediaManifest = {
      key: mediaKey,
      sha256: manifestData.sha256 || '',
      bytes: manifestData.bytes || 0,
      contentType: manifestData.contentType || 'application/octet-stream',
      createdAt: Date.now(),
      source: manifestData.source,
      metadata: manifestData.metadata
    };
    
    const manifestKey = this.generateManifestKey(mediaKey);
    await this.storage.write(manifestKey, manifest);
    
    return manifest;
  }
  
  /**
   * Get manifest for media key
   * @param mediaKey R2 media key
   * @returns Manifest or null if not found
   */
  async get(mediaKey: string): Promise<MediaManifest | null> {
    const manifestKey = this.generateManifestKey(mediaKey);
    return await this.storage.read(manifestKey);
  }
  
  /**
   * Check if manifest exists
   * @param mediaKey R2 media key
   * @returns True if manifest exists
   */
  async exists(mediaKey: string): Promise<boolean> {
    const manifestKey = this.generateManifestKey(mediaKey);
    return await this.storage.exists(manifestKey);
  }
  
  /**
   * Validate manifest
   * @param manifest Manifest to validate
   * @returns True if valid
   */
  validate(manifest: MediaManifest): boolean {
    return !!(manifest.key && manifest.sha256 && manifest.bytes >= 0 && manifest.contentType);
  }
  
  /**
   * Generate manifest key from media key
   * @param mediaKey R2 media key
   * @returns Manifest key
   */
  private generateManifestKey(mediaKey: string): string {
    const safeKey = mediaKey.replace(/\//g, '_');
    return `whatsapp/manifest/${safeKey}.json`;
  }
}

/**
 * Create manifest manager
 * @param env Environment with storage capabilities
 * @param options Storage options
 * @returns Media manifest manager
 */
export function createManifestManager(
  env: ManifestEnvironment,
  options: ManifestOptions = {}
): MediaManifestManager {
  let storage: ManifestStorage;
  
  if (options.useR2 && env.R2) {
    console.log('[MANIFEST_STRATEGY] Using R2 storage for manifests');
    storage = new R2ManifestStorage(env);
  } else if (options.useKV && env.KV) {
    console.log('[MANIFEST_STRATEGY] Using KV storage for manifests');
    storage = new KVManifestStorage(env);
  } else if (env.R2) {
    console.log('[MANIFEST_STRATEGY] Using R2 storage for manifests (default)');
    storage = new R2ManifestStorage(env);
  } else if (env.KV) {
    console.log('[MANIFEST_STRATEGY] Using KV storage for manifests (fallback)');
    storage = new KVManifestStorage(env);
  } else {
    throw new Error('No storage mechanism configured for manifests');
  }
  
  return new MediaManifestManager(storage);
}

/**
 * Generate SHA256 hash from data
 * @param data Data to hash
 * @returns SHA256 hash
 */
export async function generateSHA256(data: ArrayBuffer | string): Promise<string> {
  let buffer: ArrayBuffer;
  
  if (typeof data === 'string') {
    // Convert string to ArrayBuffer
    const encoder = new TextEncoder();
    buffer = encoder.encode(data).buffer;
  } else if (data instanceof ArrayBuffer) {
    buffer = data;
  } else {
    // Handle other types if needed
    throw new Error('Invalid data type for SHA256 generation');
  }
  
  // Use Web Crypto API or Node.js crypto
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else if (typeof require !== 'undefined') {
    // Node.js fallback
    const { createHash } = require('node:crypto');
    return createHash('sha256').update(buffer).digest('hex');
  } else {
    throw new Error('No crypto implementation available');
  }
}

/**
 * Parse content type from buffer or URL
 * @param data Data or source
 * @returns Content type
 */
export function parseContentType(data: any, source?: string): string {
  // Check if data has content-type
  if (data.headers && data.headers['content-type']) {
    return data.headers['content-type'];
  }
  
  // Check source URL
  if (source) {
    const url = new URL(source);
    const path = url.pathname;
    
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      return 'image/jpeg';
    } else if (path.endsWith('.png')) {
      return 'image/png';
    } else if (path.endsWith('.gif')) {
      return 'image/gif';
    } else if (path.endsWith('.webp')) {
      return 'image/webp';
    } else if (path.endsWith('.mp4')) {
      return 'video/mp4';
    } else if (path.endsWith('.pdf')) {
      return 'application/pdf';
    }
  }
  
  // Default content type
  return 'application/octet-stream';
}
