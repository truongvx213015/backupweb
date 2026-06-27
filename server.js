const http = require('http');
const fs = require('fs');
const path = require('path');

const host = '0.0.0.0';
const defaultPort = 8990;
const fallbackPort = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  let requestUrl = req.url.split('?')[0];
  if (requestUrl === '/') {
    requestUrl = '/heartcopy1.html';
  }

  const filePath = path.join(__dirname, requestUrl);
  const normalizedPath = path.normalize(filePath);

  if (!normalizedPath.startsWith(path.normalize(__dirname + path.sep))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  serveFile(normalizedPath, res);
});

server.on('error', (err) => {
  if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
    if (server.address() && server.address().port === defaultPort) {
      console.log(`Port ${defaultPort} không khả dụng, chuyển sang cổng ${fallbackPort}.`);
      server.listen(fallbackPort, host);
      return;
    }
  }
  console.error(err);
  process.exit(1);
});

server.listen(defaultPort, host, () => {
  const port = server.address().port;
  console.log(`Server đang chạy tại http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/`);
  console.log('Mở trình duyệt và truy cập heartcopy1.html nếu cần.');
});
