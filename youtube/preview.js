'use strict';
// Local UI simulator. It cannot control the vehicle or start the native player.
const http = require('http'), fs = require('fs'), path = require('path');
const routes = { '/': ['preview.html', 'text/html'], '/view.js': ['src/view.js', 'application/javascript'] };
const server = http.createServer((req, res) => {
    const route = routes[req.url];
    if (!route || req.method !== 'GET') { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', route[1] + '; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'");
    res.end(fs.readFileSync(path.join(__dirname, route[0])));
});
server.listen(8788, '127.0.0.1', () => console.log('UI simulator: http://127.0.0.1:8788 (Ctrl+C to stop; no car connection)'));
