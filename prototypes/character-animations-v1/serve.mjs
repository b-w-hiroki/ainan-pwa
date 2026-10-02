import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const port = Number(process.env.AINAN_ANIMATION_PORT || 43191);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
  fs.stat(file, (error, stat) => {
    const target = !error && stat.isDirectory() ? path.join(file, 'index.html') : file;
    fs.readFile(target, (readError, data) => {
      if (readError) { response.writeHead(404).end('not found'); return; }
      response.writeHead(200, { 'content-type': types[path.extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(data);
    });
  });
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/prototypes/character-animations-v1/preview.html`));
