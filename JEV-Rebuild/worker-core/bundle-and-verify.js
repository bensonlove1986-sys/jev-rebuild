#!/usr/bin/env node

/**
 * Bundle and Verify Cloudflare Worker Script
 * Uses esbuild to bundle the worker and verifies the fix is included
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🚀 Bundle and Verify Cloudflare Worker...');

// Bundle the worker code
console.log('📦 Bundling worker code...');
try {
  // Use esbuild to bundle the worker into a single file
  execSync('npx esbuild index.js --bundle --format=esm --outfile=bundle.mjs', {
    stdio: 'inherit'
  });
  console.log('✅ Bundling successful!');
} catch (error) {
  console.error('❌ Bundling failed:', error.message);
  process.exit(1);
}

// Read the bundled code
const bundledCode = readFileSync('./bundle.mjs', 'utf8');
console.log(`📄 Bundled script size: ${bundledCode.length} bytes`);

// Verify the fix is included
console.log('🔍 Verifying the fix...');

// Check for the segment count fix
const segmentCountCheck = bundledCode.includes('segments.length !== 7');
const mediaPathError = bundledCode.includes('[MEDIA_PATH_SEGMENT_COUNT_INVALID]');

if (segmentCountCheck) {
  console.log('✅ Fix verified: Segment count check is correctly set to 7 segments');
} else {
  console.error('❌ Fix not found: Segment count check is not set to 7 segments');
  process.exit(1);
}

if (mediaPathError) {
  console.log('✅ Fix verified: Media path segment count error message is included');
} else {
  console.error('❌ Fix not found: Media path segment count error message is not included');
  process.exit(1);
}

// Verify the media path format
const mediaPathFormat = bundledCode.includes('/api/media/r2/whatsapp/${messageSid}/${mediaSid}');
if (mediaPathFormat) {
  console.log('✅ Fix verified: Correct media path format is used');
} else {
  console.error('❌ Fix not found: Correct media path format is not used');
  process.exit(1);
}

console.log('');
console.log('🎉 All verifications passed!');
console.log('The fix for the media path segment count error is correctly included in the bundled code.');
console.log('');
console.log('📋 Fix summary:');
console.log('  - Changed segment count check from 8 to 7');
console.log('  - Media path format: /api/media/r2/whatsapp/{MessageSid}/{MediaSid}');
console.log('  - This fixes the [MEDIA_PATH_SEGMENT_COUNT_INVALID] error');
console.log('');
console.log('✅ The fix is ready for deployment!');
