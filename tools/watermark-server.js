#!/usr/bin/env node
// Jednokratna obrada postojecih slika: node tools/watermark-server.js, pa otvori
// http://localhost:8090/tools/watermark.html (znak) ili http://localhost:8090/tools/sketch.html (skice). Stranica obradjuje slike istim kodom kao admin (admin/admin-lib.js),
// a ovaj server samo posluzuje fajlove i upisuje rezultat u images/ i data/projects.json. Nema spoljnih biblioteka.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
// upis je dozvoljen samo u slike i podatke o projektima
const writable = (rel) => /^images\/[^/]+\.(webp|jpg)$/.test(rel) || /^images\/[^/]+-sketch\.json$/.test(rel) || rel === 'data/projects.json';

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (req.method === 'PUT') {
    if (!writable(rel)) { res.writeHead(403).end('nije dozvoljeno'); return; }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { fs.writeFileSync(file, Buffer.concat(chunks)); res.writeHead(204).end(); });
    return;
  }
  fs.readFile(fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file, (err, buf) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(buf);
  });
}).listen(8090, () => console.log('http://localhost:8090/tools/watermark.html'));
