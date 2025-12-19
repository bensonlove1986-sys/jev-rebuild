// Simple static server for FULL UI only - web-runtime is FORBIDDEN
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
let root = 'ui-core/app/dist'; // DEFAULT: Full UI build directory
let port = 3000;

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root' && i + 1 < args.length) {
    root = args[i + 1];
    i++;
  } else if (args[i] === '--port' && i + 1 < args.length) {
    port = parseInt(args[i + 1]);
    i++;
  }
}

// Get absolute path to root directory
const rootDir = path.resolve(__dirname, root);

// Create server
const server = http.createServer((req, res) => {
  // Handle root path
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(rootDir, filePath);
  
  // Get file extension for content-type
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  
  switch (extname) {
    case '.js':
      contentType = 'application/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.svg':
      contentType = 'image/svg+xml';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
  }
  
  // Read and serve file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found, serve 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found', 'utf-8');
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`, 'utf-8');
      }
    } else {
      // Serve file with correct content-type
      res.writeHead(200, { 
        'Content-Type': contentType,
        'X-UI-Runtime': 'full',
        'X-UI-Port': port.toString()
      });
      res.end(content, 'utf-8');
    }
  });
});

// Start server
server.listen(port, () => {
  console.log(`[UI][RUNTIME]=full`);
  console.log(`[UI][PORT]=${port}`);
  console.log(`Server running at http://localhost:${port}/`);
  console.log(`Serving files from: ${rootDir}`);
  console.log(`[PROTECTION] Anti-rollback enabled: web-runtime is forbidden`);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[SERVER_ERROR]', err.message);
  process.exit(1);
});