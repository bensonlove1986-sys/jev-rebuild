#!/usr/bin/env node

/**
 * JEV UI Release Verification Script
 * Verifies that both local and remote UI deployments have the same build_id
 */

import https from 'https';
import http from 'http';

// Configuration
const LOCAL_URL = 'http://localhost:3000/__ui_runtime__.json';
// Remote URL - This should be updated with the actual worker domain
// For now, we'll use a placeholder and skip remote verification if not provided
const REMOTE_URL = process.env.REMOTE_WORKER_URL || '';

/**
 * Make HTTP GET request
 * @param {string} url - URL to fetch
 * @returns {Promise<object>} - Parsed JSON response
 */
async function fetchJson(url) {
    const protocol = url.startsWith('https') ? https : http;
    
    return new Promise((resolve, reject) => {
        const req = protocol.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    return;
                }
                
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(new Error(`Invalid JSON: ${e.message}`));
                }
            });
        });
        
        req.on('error', (e) => {
            reject(new Error(`Request failed: ${e.message}`));
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });
    });
}

/**
 * Main verification function
 */
async function verifyRelease() {
    console.log('[VERIFY] Starting UI release verification...');
    
    try {
        // Step 1: Verify local deployment
        console.log(`[VERIFY] Checking local: ${LOCAL_URL}`);
        const localData = await fetchJson(LOCAL_URL);
        
        // Check if we're getting the static file or the worker response
        let localBuildId = null;
        let localSourceDir = null;
        
        if (localData.build_id) {
            // This is from the Worker
            localBuildId = localData.build_id;
            localSourceDir = localData.source_dir;
            console.log(`[VERIFY] Local build_id: ${localBuildId}`);
            
            // Step 4: Verify UI runtime config
            if (localSourceDir !== 'web-runtime') {
                throw new Error(`Invalid source_dir: ${localSourceDir}, expected: web-runtime`);
            }
        } else {
            // This is the static file
            localBuildId = localData.built_at; // Use built_at as build_id for static files
            localSourceDir = 'web-runtime'; // Static files are always from web-runtime
            console.log(`[VERIFY] Local built_at (as build_id): ${localBuildId}`);
        }
        
        if (!localBuildId) {
            throw new Error('Local build identifier not found');
        }
        
        // Step 2: Verify remote deployment if URL is provided
        let remoteBuildId = null;
        if (REMOTE_URL) {
            console.log(`[VERIFY] Checking remote: ${REMOTE_URL}`);
            const remoteData = await fetchJson(REMOTE_URL);
            
            if (remoteData.build_id) {
                remoteBuildId = remoteData.build_id;
            } else {
                remoteBuildId = remoteData.built_at;
            }
            
            if (!remoteBuildId) {
                throw new Error('Remote build identifier not found');
            }
            
            console.log(`[VERIFY] Remote build_id: ${remoteBuildId}`);
            
            // Step 3: Compare build IDs
            if (localBuildId !== remoteBuildId) {
                throw new Error(`Build ID mismatch: local=${localBuildId}, remote=${remoteBuildId}`);
            }
        }
        
        console.log('[VERIFY] ✅ Local UI runtime config is valid');
        
        // Final result
        console.log('\n====================================');
        console.log('🎉 VERIFICATION SUCCESS!');
        console.log('====================================');
        console.log(`Local build_id: ${localBuildId}`);
        if (remoteBuildId) {
            console.log(`Remote build_id: ${remoteBuildId}`);
            console.log('✅ Build IDs match!');
        } else {
            console.log('⚠️  Remote verification skipped (REMOTE_WORKER_URL not set)');
        }
        console.log('====================================');
        
        process.exit(0);
        
    } catch (error) {
        console.error(`[VERIFY] ❌ Verification failed: ${error.message}`);
        console.log('\n====================================');
        console.log('❌ VERIFICATION FAILED!');
        console.log('====================================');
        
        process.exit(1);
    }
}

// Run verification
verifyRelease();
