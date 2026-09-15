/* Petit serveur statique pour travailler en local : `node tools/dev-server.mjs`
   puis http://localhost:3021. Aucune dépendance. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3021;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url);

  // On ne sert rien en dehors du dossier du projet.
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file = path.join(ROOT, 'index.html');

  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
