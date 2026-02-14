/**
 * Media Pipeline Core
 * v3.1 极限稳定版
 * 
 * Core principles:
 * - UI does not generate R2 keys, only sends source + meta
 * - Worker generates keys + ensures idempotency + stores + returns media_path
 * - R2 is the single source of truth, media_path points to guaranteed-readable objects
 * - All callers (inbound/outbound/ocr/upload) use the same ingestMedia()
 */

import { generateMediaKey, MediaKeyOptions } from './media_key';
import { withMediaLock, LockEnvironment } from './media_lock';
import { createManifestManager, MediaManifest, generateSHA256, parseContentType } from './media_manifest';

/**
 * Media source types
 */
export interface MediaSource {
  /** Remote URL source */
  remoteUrl?: string;
  /** Data URL source */
  dataUrl?: string;
  /** Buffer source */
  buffer?: Buffer | ArrayBuffer;
}

/**
 * Media ingestion options
 */
export interface MediaIngestOptions {
  /** Media source */
  source: MediaSource;
  /** Media metadata */
  meta: {
    namespace: 'whatsapp' | 'ocr' | 'upload';
    direction: 'inbound' | 'outbound' | 'ocr' | 'manual';
    customerId: string;
    mediaId?: string;
    contentType?: string;
    [key: string]: any;
  };
}

/**
 * Media ingestion result
 */
export interface MediaIngestResult {
  /** R2 media key */
  r2Key: string;
  /** Media path (pointer to R2 object) */
  mediaPath: string;
  /** SHA256 hash of content */
  sha256: string;
  /** File size in bytes */
  bytes: number;
  /** Content type */
  contentType: string;
  /** Manifest data */
  manifest?: MediaManifest;
}

/**
 * Pipeline environment
 */
export interface PipelineEnvironment {
  /** R2 bucket */
  R2?: any;
  /** KV namespace */
  KV?: any;
  /** Durable Object for locks */
  MEDIA_LOCK?: any;
  /** Worker origin (for generating media paths) */
  WORKER_ORIGIN?: string;
}

/**
 * Media Pipeline Core
 */
export class MediaPipelineCore {
  private env: PipelineEnvironment;
  
  constructor(env: PipelineEnvironment) {
    this.env = env;
  }
  
  /**
   * Ingest media through the pipeline
   * @param options Ingestion options
   * @returns Ingestion result
   */
  async ingestMedia(options: MediaIngestOptions): Promise<MediaIngestResult> {
    const { source, meta } = options;
    
    console.log('[MEDIA_V3_INGEST_START] Starting media ingestion pipeline');
    console.log('[MEDIA_V3_INGEST_OPTIONS]', {
      namespace: meta.namespace,
      direction: meta.direction,
      customerId: meta.customerId,
      mediaId: meta.mediaId,
      hasRemoteUrl: !!source.remoteUrl,
      hasDataUrl: !!source.dataUrl,
      hasBuffer: !!source.buffer
    });
    
    // Resolve source to bytes
    const { bytes, contentType } = await this.resolveSourceToBytes(source);
    
    // Generate content hash if no media ID provided
    let contentHash: string | undefined;
    if (!meta.mediaId) {
      contentHash = await generateSHA256(bytes);
    }
    
    // Generate media key
    const mediaKeyOptions: MediaKeyOptions = {
      namespace: meta.namespace,
      direction: meta.direction,
      customerId: meta.customerId,
      mediaId: meta.mediaId,
      contentHash
    };
    
    const r2Key = generateMediaKey(mediaKeyOptions);
    
    // Process with media lock to prevent concurrent uploads
    return await withMediaLock(r2Key, async () => {
      // Check if object already exists in R2 (idempotent check)
      const exists = await this.objectExists(r2Key);
      if (exists) {
        console.log('[MEDIA_V31_DEDUP_HIT]', { r2Key });
        
        // Get existing manifest
        const manifestManager = createManifestManager(this.env);
        const manifest = await manifestManager.get(r2Key);
        
        if (manifest) {
          return {
            r2Key,
            mediaPath: this.generateMediaPath(r2Key),
            sha256: manifest.sha256,
            bytes: manifest.bytes,
            contentType: manifest.contentType,
            manifest
          };
        }
        
        // Fallback: generate basic result if manifest not found
        return {
          r2Key,
          mediaPath: this.generateMediaPath(r2Key),
          sha256: contentHash || '',
          bytes: bytes.byteLength || 0,
          contentType
        };
      }
      
      console.log('[MEDIA_V31_FETCH_OK]', { source: source.remoteUrl || 'buffer/dataUrl' });
      
      // Put object to R2
      await this.putObject(r2Key, bytes, contentType);
      console.log('[MEDIA_V31_R2_PUT_OK]', { r2Key, bytes: bytes.byteLength || 0, contentType });
      
      // Create manifest
      const manifestManager = createManifestManager(this.env);
      const manifest = await manifestManager.create(r2Key, {
        sha256: contentHash || '',
        bytes: bytes.byteLength || 0,
        contentType,
        source: source.remoteUrl,
        metadata: meta
      });
      
      return {
        r2Key,
        mediaPath: this.generateMediaPath(r2Key),
        sha256: manifest.sha256,
        bytes: manifest.bytes,
        contentType: manifest.contentType,
        manifest
      };
    }, this.env);
  }
  
  /**
   * Resolve media source to bytes
   * @param source Media source
   * @returns Bytes and content type
   */
  private async resolveSourceToBytes(source: MediaSource): Promise<{ bytes: Buffer | ArrayBuffer; contentType: string }> {
    if (source.buffer) {
      // Buffer source
      return {
        bytes: source.buffer,
        contentType: 'application/octet-stream'
      };
    }
    
    if (source.dataUrl) {
      // Data URL source
      const match = source.dataUrl.match(/^data:(.+?);base64,(.+)$/);
      if (!match) {
        throw new Error('Invalid data URL format');
      }
      
      const contentType = match[1];
      const base64Data = match[2];
      
      // Decode base64 (Cloudflare Workers compatible)
      const binaryString = atob(base64Data);
      const length = binaryString.length;
      const arrayBuffer = new ArrayBuffer(length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      
      return {
        bytes: arrayBuffer,
        contentType
      };
    }
    
    if (source.remoteUrl) {
      // Remote URL source
      const response = await fetch(source.remoteUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch remote URL: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      console.log('[MEDIA_V3_FETCH_OK]', { status: response.status, contentType, bytes: buffer.byteLength, url: source.remoteUrl });
      
      return {
        bytes: buffer,
        contentType
      };
    }
    
    throw new Error('No valid media source provided');
  }
  
  /**
   * Check if object exists in R2
   * @param key R2 key
   * @returns True if object exists
   */
  private async objectExists(key: string): Promise<boolean> {
    if (!this.env.R2) {
      throw new Error('R2 bucket not configured');
    }
    
    try {
      const object = await this.env.R2.head(key);
      return !!object;
    } catch (error) {
      console.error('[R2_HEAD_ERROR]', error.message);
      return false;
    }
  }
  
  /**
   * Put object to R2
   * @param key R2 key
   * @param data Data to put
   * @param contentType Content type
   */
  private async putObject(key: string, data: Buffer | ArrayBuffer, contentType: string): Promise<void> {
    if (!this.env.R2) {
      throw new Error('R2 bucket not configured');
    }
    
    try {
      await this.env.R2.put(key, data, {
        contentType,
        metadata: {
          uploadedAt: Date.now().toString(),
          source: 'media_pipeline_v3.1'
        }
      });
    } catch (error) {
      console.error('[R2_PUT_ERROR]', error.message);
      throw error;
    }
  }
  
  /**
   * Generate media path from R2 key
   * @param r2Key R2 key
   * @returns Media path
   */
  private generateMediaPath(r2Key: string): string {
    const workerOrigin = this.env.WORKER_ORIGIN || 'http://localhost:8787';
    return `${workerOrigin}/api/media/r2/${encodeURIComponent(r2Key)}`;
  }
  
  /**
   * Get media object from R2
   * @param r2Key R2 key
   * @returns R2 object or null
   */
  async getObject(r2Key: string): Promise<any> {
    if (!this.env.R2) {
      throw new Error('R2 bucket not configured');
    }
    
    try {
      return await this.env.R2.get(r2Key);
    } catch (error) {
      console.error('[R2_GET_ERROR]', error.message);
      return null;
    }
  }
  
  /**
   * Delete media object from R2
   * @param r2Key R2 key
   */
  async deleteObject(r2Key: string): Promise<void> {
    if (!this.env.R2) {
      throw new Error('R2 bucket not configured');
    }
    
    try {
      await this.env.R2.delete(r2Key);
    } catch (error) {
      console.error('[R2_DELETE_ERROR]', error.message);
      throw error;
    }
  }
}

/**
 * Create media pipeline core instance
 * @param env Pipeline environment
 * @returns Media pipeline core
 */
export function createMediaPipelineCore(env: PipelineEnvironment): MediaPipelineCore {
  return new MediaPipelineCore(env);
}

/**
 * Ingest media helper function
 * @param env Pipeline environment
 * @param source Media source
 * @param meta Media metadata
 * @returns Ingestion result
 */
export async function ingestMedia(
  env: PipelineEnvironment,
  source: MediaSource,
  meta: MediaIngestOptions['meta']
): Promise<MediaIngestResult> {
  const pipeline = createMediaPipelineCore(env);
  return await pipeline.ingestMedia({ source, meta });
}
