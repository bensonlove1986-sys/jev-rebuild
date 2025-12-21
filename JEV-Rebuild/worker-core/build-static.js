import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build directory paths
const uiBuildDir = path.join(__dirname, '../ui-core/build');
const workerSrcDir = path.join(__dirname, 'src');
const workerIndexPath = path.join(workerSrcDir, 'index.js');

// Main function
async function main() {
  try {
    // Read actual static files
    console.log('Reading static files...');

    // Read index.html
    const indexHtml = await fs.readFile(path.join(uiBuildDir, 'index.html'), 'utf8');

    // Read assets
    const assetsDir = path.join(uiBuildDir, 'assets');
    const assets = await fs.readdir(assetsDir);
    const jsFile = assets.find(f => f.endsWith('.js'));
    const cssFile = assets.find(f => f.endsWith('.css'));

    if (!jsFile || !cssFile) {
      console.error('Could not find JS or CSS files in assets directory');
      process.exit(1);
    }

    const jsContent = await fs.readFile(path.join(assetsDir, jsFile), 'utf8');
    const cssContent = await fs.readFile(path.join(assetsDir, cssFile), 'utf8');

    // Read the original worker index file
    const originalWorkerCode = await fs.readFile(workerIndexPath, 'utf8');

    // Replace the mock assets with actual content
    console.log('Replacing mock assets with actual content...');

    // Generate the static asset map
    const staticAssetMapCode = `// Static assets content - embedded during build process
const staticAssetMap = {
  '/': {
    type: 'text/html; charset=utf-8',
    content: ${JSON.stringify(indexHtml)}
  },
  '/index.html': {
    type: 'text/html; charset=utf-8',
    content: ${JSON.stringify(indexHtml)}
  },
  '/assets/${jsFile}': {
    type: 'application/javascript; charset=utf-8',
    content: ${JSON.stringify(jsContent)}
  },
  '/assets/${cssFile}': {
    type: 'text/css; charset=utf-8',
    content: ${JSON.stringify(cssContent)}
  }
};`;

    // Replace the old static content with the new map
    const updatedWorkerCode = originalWorkerCode
      // Remove old static HTML and mock assets
      .replace(/\/\/ Get content type based on file extension[\s\S]*?const mockAssets = \{[\s\S]*?\};/, '')
      // Add the new static asset map
      .replace(/\/\/ Get content type based on file extension/, `// Get content type based on file extension\n${staticAssetMapCode}`)
      // Update the static asset serving logic
      .replace(/\/\/ ===== ROUTE PRIORITY =====[\s\S]*?\/\/ ===== API STATUS =====/, (match) => {
        return match.replace(/\/\/ 2. All other routes serve UI static files[\s\S]*?\/\/ ===== API STATUS =====/, `// 2. All other routes serve UI static files
      else {
        // Serve static assets from the embedded map
        const asset = staticAssetMap[path];
        if (asset) {
          return new Response(asset.content, {
            headers: {
              'Content-Type': asset.type,
              'Cache-Control': path.endsWith('.html') ? 'public, max-age=3600' : 'public, max-age=31536000, immutable'
            }
          });
        }
        return new Response('Not Found', {
          status: 404,
          headers: {
            'Content-Type': 'text/plain'
          }
        });
      }

      // ===== API STATUS =====`);
      });

    // Write the updated worker code
    await fs.writeFile(workerIndexPath, updatedWorkerCode, 'utf8');

    console.log('Static assets embedded into worker code successfully!');
    console.log(`Files processed: index.html, ${jsFile}, ${cssFile}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
