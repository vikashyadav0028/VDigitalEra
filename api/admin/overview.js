import { database, ensureDashboardSchema } from '../_lib/database.js';
import { hasOwnerSession } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!hasOwnerSession(req)) return res.status(401).json({ error: 'Please sign in to view your dashboard.' });

  try {
    const db = await ensureDashboardSchema(database());
    const [summary, daily, clicks, enquiries] = await Promise.all([
      db.query(`SELECT
        COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at >= NOW() - INTERVAL '30 days') AS visits_30d,
        COUNT(*) FILTER (WHERE event_type = 'click' AND created_at >= NOW() - INTERVAL '30 days') AS clicks_30d,
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS visits_all,
        (SELECT COUNT(*) FROM enquiries) AS enquiries_all,
        (SELECT COUNT(*) FROM enquiries WHERE created_at >= NOW() - INTERVAL '30 days') AS enquiries_30d
        FROM site_events`),
      db.query(`SELECT DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS day,
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS visits,
        COUNT(*) FILTER (WHERE event_type = 'click') AS clicks
        FROM site_events WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY day ORDER BY day`),
      db.query(`SELECT label, COUNT(*) AS total FROM site_events
        WHERE event_type = 'click' AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY label ORDER BY total DESC`),
      db.query(`SELECT id, created_at, name, email, phone, business, service, budget, message
        FROM enquiries ORDER BY created_at DESC LIMIT 100`),
    ]);
    return res.status(200).json({
      summary: summary.rows[0],
      daily: daily.rows,
      clicks: clicks.rows,
      enquiries: enquiries.rows,
    });
  } catch (error) {
    console.error('Could not load owner dashboard:', error.message);
    return res.status(503).json({ error: 'Dashboard data is temporarily unavailable.' });
  }
}
