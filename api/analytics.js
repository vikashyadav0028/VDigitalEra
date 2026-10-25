import { database, ensureDashboardSchema } from './_lib/database.js';
import { isSameSiteRequest } from './_lib/auth.js';

const allowedLabels = new Set(['whatsapp', 'contact', 'services', 'demo']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!isSameSiteRequest(req)) return res.status(403).json({ error: 'Request origin is not allowed.' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (!['page_view', 'click'].includes(body.event)) return res.status(400).json({ error: 'Invalid event.' });
  const path = typeof body.path === 'string' ? body.path.split('?')[0].slice(0, 240) : '';
  if (!path.startsWith('/') || path.startsWith('//')) return res.status(400).json({ error: 'Invalid page.' });
  if (path === '/dashboard.html' || path.startsWith('/api/')) return res.status(204).end();
  const label = body.event === 'click' && allowedLabels.has(body.label) ? body.label : null;
  if (body.event === 'click' && !label) return res.status(400).json({ error: 'Invalid click category.' });

  try {
    const db = await ensureDashboardSchema(database());
    await db.query('INSERT INTO site_events (event_type, page_path, label) VALUES ($1, $2, $3)', [body.event, path, label]);
    return res.status(204).end();
  } catch (error) {
    console.error('Could not save site insight:', error.message);
    return res.status(503).json({ error: 'Insights are temporarily unavailable.' });
  }
}
