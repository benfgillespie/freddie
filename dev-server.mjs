// Local preview server: `npm run dev`, then open http://localhost:3000
// Serves public/ with clean URLs (like vercel.json) and runs the /api functions.
// No dependencies beyond Node itself.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = process.env.PORT || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
};

// Minimal stand-in for the Vercel req/res helpers the api/ functions use
function wrapRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.send = (body) => { res.end(body); return res; };
  res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return res; };
  return res;
}

async function readBody(req) {
  let data = '';
  for await (const chunk of req) data += chunk;
  try { return data ? JSON.parse(data) : undefined; } catch { return data; }
}

async function handleApi(req, res, url) {
  const name = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  try {
    const mod = await import(path.join(ROOT, 'api', `${name}.js`));
    req.query = Object.fromEntries(url.searchParams);
    req.body = await readBody(req);
    await mod.default(req, wrapRes(res));
  } catch (err) {
    console.error(err);
    wrapRes(res).status(404).json({ error: `No API route /api/${name}` });
  }
}

async function serveFile(res, pathname) {
  const clean = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates = clean.endsWith('/')
    ? [path.join(PUBLIC, clean, 'index.html')]
    : [path.join(PUBLIC, clean), path.join(PUBLIC, clean + '.html')];
  for (const file of candidates) {
    if (!file.startsWith(PUBLIC)) break;
    try {
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      return res.end(body);
    } catch { /* try next */ }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return serveFile(res, url.pathname);
}).listen(PORT, () => {
  console.log(`Generic Foiling Podcast running at http://localhost:${PORT}`);
});
