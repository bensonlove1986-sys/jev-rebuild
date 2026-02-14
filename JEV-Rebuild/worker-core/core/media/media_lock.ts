/**
 * Media Lock Manager
 * v3.1 极限稳定版
 * 
 * Provides distributed locking for media ingestion
 * to prevent concurrent uploads and duplicate processing
 */

/**
 * Media lock options
 */
export interface MediaLockOptions {
  /** Lock TTL in seconds (default: 60s) */
  ttl?: number;
  /** Maximum wait time in seconds (default: 30s) */
  maxWait?: number;
  /** Poll interval in milliseconds (default: 500ms) */
  pollInterval?: number;
}

/**
 * Media lock manager interface
 */
export interface MediaLockManager {
  /**
   * Acquire lock for media key
   * @param mediaKey R2 media key
   * @param options Lock options
   * @returns Lock release function
   */
  acquire(mediaKey: string, options?: MediaLockOptions): Promise<() => Promise<void>>;
  
  /**
   * Check if lock exists
   * @param mediaKey R2 media key
   * @returns True if lock exists
   */
  exists(mediaKey: string): Promise<boolean>;
  
  /**
   * Release lock for media key
   * @param mediaKey R2 media key
   */
  release(mediaKey: string): Promise<void>;
}

/**
 * Environment with lock capabilities
 */
export interface LockEnvironment {
  /** Durable Object for locks */
  MEDIA_LOCK?: any;
  /** KV namespace for locks */
  KV?: any;
}

/**
 * Generate lock key from media key
 * @param mediaKey R2 media key
 * @returns Lock key
 */
export function generateLockKey(mediaKey: string): string {
  const safeKey = mediaKey.replace(/\//g, '_');
  return `media_lock:${safeKey}`;
}

/**
 * Durable Object based lock manager
 */
export class DurableObjectLockManager implements MediaLockManager {
  private env: LockEnvironment;
  
  constructor(env: LockEnvironment) {
    this.env = env;
  }
  
  async acquire(mediaKey: string, options: MediaLockOptions = {}): Promise<() => Promise<void>> {
    const lockKey = generateLockKey(mediaKey);
    const ttl = options.ttl || 60;
    const maxWait = options.maxWait || 30;
    const pollInterval = options.pollInterval || 500;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait * 1000) {
      try {
        // Try to acquire lock
        const exists = await this.exists(mediaKey);
        if (!exists) {
          // Lock doesn't exist, acquire it
          if (this.env.MEDIA_LOCK) {
            const doId = this.env.MEDIA_LOCK.idFromName(lockKey);
            const stub = this.env.MEDIA_LOCK.get(doId);
            
            await stub.fetch(new Request('http://localhost/lock/acquire', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                lockKey,
                ttl
              })
            }));
            
            console.log('[MEDIA_V31_LOCK_ACQUIRED]', { mediaKey, lockKey });
            
            // Return release function
            return async () => {
              await this.release(mediaKey);
            };
          } else {
            throw new Error('MEDIA_LOCK Durable Object not configured');
          }
        }
        
        // Lock exists, wait and retry
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('[MEDIA_LOCK_ERROR]', error.message);
        throw error;
      }
    }
    
    throw new Error('Failed to acquire media lock within timeout');
  }
  
  async exists(mediaKey: string): Promise<boolean> {
    const lockKey = generateLockKey(mediaKey);
    
    if (this.env.MEDIA_LOCK) {
      try {
        const doId = this.env.MEDIA_LOCK.idFromName(lockKey);
        const stub = this.env.MEDIA_LOCK.get(doId);
        
        const response = await stub.fetch(new Request('http://localhost/lock/exists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ lockKey })
        }));
        
        const result = await response.json();
        return result.exists;
      } catch (error) {
        console.error('[MEDIA_LOCK_EXISTS_ERROR]', error.message);
        return false;
      }
    }
    
    return false;
  }
  
  async release(mediaKey: string): Promise<void> {
    const lockKey = generateLockKey(mediaKey);
    
    if (this.env.MEDIA_LOCK) {
      try {
        const doId = this.env.MEDIA_LOCK.idFromName(lockKey);
        const stub = this.env.MEDIA_LOCK.get(doId);
        
        await stub.fetch(new Request('http://localhost/lock/release', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ lockKey })
        }));
        
        console.log('[MEDIA_LOCK_RELEASED]', { mediaKey, lockKey });
      } catch (error) {
        console.error('[MEDIA_LOCK_RELEASE_ERROR]', error.message);
      }
    }
  }
}

/**
 * KV based lock manager (fallback)
 */
export class KVLockManager implements MediaLockManager {
  private env: LockEnvironment;
  
  constructor(env: LockEnvironment) {
    this.env = env;
  }
  
  async acquire(mediaKey: string, options: MediaLockOptions = {}): Promise<() => Promise<void>> {
    const lockKey = generateLockKey(mediaKey);
    const ttl = options.ttl || 60;
    const maxWait = options.maxWait || 30;
    const pollInterval = options.pollInterval || 500;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait * 1000) {
      try {
        // Try to acquire lock
        const exists = await this.exists(mediaKey);
        if (!exists) {
          // Lock doesn't exist, acquire it
          if (this.env.KV) {
            await this.env.KV.put(lockKey, '1', {
              expirationTtl: ttl
            });
            
            console.log('[MEDIA_V31_LOCK_ACQUIRED]', { mediaKey, lockKey });
            
            // Return release function
            return async () => {
              await this.release(mediaKey);
            };
          } else {
            throw new Error('KV namespace not configured for locks');
          }
        }
        
        // Lock exists, wait and retry
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('[MEDIA_LOCK_ERROR]', error.message);
        throw error;
      }
    }
    
    throw new Error('Failed to acquire media lock within timeout');
  }
  
  async exists(mediaKey: string): Promise<boolean> {
    const lockKey = generateLockKey(mediaKey);
    
    if (this.env.KV) {
      try {
        const value = await this.env.KV.get(lockKey);
        return !!value;
      } catch (error) {
        console.error('[MEDIA_LOCK_EXISTS_ERROR]', error.message);
        return false;
      }
    }
    
    return false;
  }
  
  async release(mediaKey: string): Promise<void> {
    const lockKey = generateLockKey(mediaKey);
    
    if (this.env.KV) {
      try {
        await this.env.KV.delete(lockKey);
        console.log('[MEDIA_LOCK_RELEASED]', { mediaKey, lockKey });
      } catch (error) {
        console.error('[MEDIA_LOCK_RELEASE_ERROR]', error.message);
      }
    }
  }
}

/**
 * Create lock manager based on available environment
 * @param env Environment with lock capabilities
 * @returns Media lock manager
 */
export function createLockManager(env: LockEnvironment): MediaLockManager {
  if (env.MEDIA_LOCK) {
    console.log('[MEDIA_LOCK_STRATEGY] Using Durable Object lock manager');
    return new DurableObjectLockManager(env);
  } else if (env.KV) {
    console.log('[MEDIA_LOCK_STRATEGY] Using KV lock manager (fallback)');
    return new KVLockManager(env);
  } else {
    console.warn('[MEDIA_LOCK_WARNING] No lock mechanism configured, using no-op manager');
    return new NoopLockManager();
  }
}

/**
 * No-op lock manager (fallback when no lock mechanism available)
 */
class NoopLockManager implements MediaLockManager {
  async acquire(mediaKey: string): Promise<() => Promise<void>> {
    console.warn('[MEDIA_LOCK_NOOP] Acquiring no-op lock for', mediaKey);
    return async () => {
      console.warn('[MEDIA_LOCK_NOOP] Releasing no-op lock for', mediaKey);
    };
  }
  
  async exists(mediaKey: string): Promise<boolean> {
    return false;
  }
  
  async release(mediaKey: string): Promise<void> {
    // No-op
  }
}

/**
 * Run function with media lock
 * @param mediaKey R2 media key
 * @param fn Function to run with lock
 * @param env Environment with lock capabilities
 * @param options Lock options
 * @returns Function result
 */
export async function withMediaLock<T>(
  mediaKey: string,
  fn: () => Promise<T>,
  env: LockEnvironment,
  options?: MediaLockOptions
): Promise<T> {
  const lockManager = createLockManager(env);
  let release: (() => Promise<void>) | undefined;
  
  try {
    // Acquire lock
    release = await lockManager.acquire(mediaKey, options);
    
    // Run function
    return await fn();
  } finally {
    // Release lock
    if (release) {
      await release();
    }
  }
}
