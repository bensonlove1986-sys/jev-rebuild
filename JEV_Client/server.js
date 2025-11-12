const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // 去除URL查询参数
    const cleanUrl = req.url.split('?')[0];
    const filePath = path.join(__dirname, cleanUrl === '/' ? 'index.html' : cleanUrl);
    
    console.log('Request:', cleanUrl, '->', filePath);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error('Error:', err.message);
            res.writeHead(404);
            res.end('Not Found');
        } else {
            // 设置适当的Content-Type
            let contentType = 'text/html';
            if (cleanUrl.endsWith('.js')) contentType = 'application/javascript';
            else if (cleanUrl.endsWith('.css')) contentType = 'text/css';
            else if (cleanUrl.endsWith('.json')) contentType = 'application/json';
            else if (cleanUrl.endsWith('.png')) contentType = 'image/png';
            else if (cleanUrl.endsWith('.jpg')) contentType = 'image/jpeg';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

server.listen(8080, () => {
    console.log('Server running at http://localhost:8080/');
    console.log('Serving files from:', __dirname);
});