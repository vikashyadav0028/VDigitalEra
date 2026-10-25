import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const DATA_DIR = resolve(ROOT, 'data');
await mkdir(DATA_DIR, { recursive: true });
const db = new DatabaseSync(resolve(DATA_DIR, 'leads.sqlite'));
db.exec(`PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business TEXT,
  service TEXT NOT NULL,
  budget TEXT,
  message TEXT NOT NULL,
  consent INTEGER NOT NULL CHECK(consent = 1)
);`);
const insertLead = db.prepare(`INSERT INTO enquiries (name,email,phone,business,service,budget,message,consent)
  VALUES ($name,$email,$phone,$business,$service,$budget,$message,1)`);
const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon' };
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), old = hits.get(ip) || [];
  const recent = old.filter(t => now - t < 60_000);
  if (recent.length >= 8) return true;
  recent.push(now); hits.set(ip, recent); return false;
}
function send(res, status, body, type='application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type':type, 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin', 'Content-Security-Policy':"default-src 'self' https: data:; img-src 'self' https://images.unsplash.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
  res.end(body);
}
const server = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || 'unknown';
  if (req.method === 'POST' && req.url === '/api/leads') {
    if (rateLimited(ip)) return send(res, 429, JSON.stringify({error:'Too many requests. Please try again shortly.'}));
    let raw='';
    try {
      for await (const chunk of req) { raw += chunk; if (raw.length > 20_000) throw new Error('Request too large'); }
      const data = JSON.parse(raw);
      if (typeof data.website_url === 'string' && data.website_url.trim()) return send(res, 200, JSON.stringify({ok:true}));
      const clean = value => typeof value === 'string' ? value.trim() : '';
      const lead = { name:clean(data.name), email:clean(data.email), phone:clean(data.phone), business:clean(data.business), service:clean(data.service), budget:clean(data.budget), message:clean(data.message) };
      if (!lead.name || lead.name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) || lead.email.length > 200 || !lead.service || lead.service.length > 120 || !lead.message || lead.message.length > 3000 || lead.phone.length > 40 || lead.business.length > 160 || lead.budget.length > 80 || data.consent !== 'on') return send(res, 400, JSON.stringify({error:'Please check the required fields and try again.'}));
      insertLead.run({ $name:lead.name,$email:lead.email,$phone:lead.phone,$business:lead.business,$service:lead.service,$budget:lead.budget,$message:lead.message });
      return send(res, 201, JSON.stringify({ok:true}));
    } catch (error) {
      return send(res, error.message === 'Request too large' ? 413 : 400, JSON.stringify({error:error.message === 'Request too large' ? 'Your request is too large.' : 'We could not save that enquiry. Please try again.'}));
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, JSON.stringify({error:'Method not allowed.'}));
  const pathname = new URL(req.url, 'http://localhost').pathname;
  let relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  if (relative.includes('..') || relative.includes('\\')) return send(res, 400, 'Bad path', 'text/plain; charset=utf-8');
  const file = resolve(ROOT, `.${relative}`);
  if (!file.startsWith(ROOT + sep)) return send(res, 400, 'Bad path', 'text/plain; charset=utf-8');
  try {
    const contents = await readFile(file);
    res.writeHead(200, { 'Content-Type':mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin', 'Content-Security-Policy':"default-src 'self' https: data:; img-src 'self' https://images.unsplash.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
    res.end(req.method === 'HEAD' ? undefined : contents);
  } catch { send(res, 404, 'Not found', 'text/plain; charset=utf-8'); }
});
const port = Number(process.env.PORT || 4173);
server.listen(port, '127.0.0.1', () => console.log(`VdigitalEra is running at http://localhost:${port}`));
function close() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGINT', close); process.on('SIGTERM', close);

