import { clearSessionCookie, isSameSiteRequest, issueSessionCookie, matchesDashboardPassword, passwordIsConfigured } from '../_lib/auth.js';
import { database, ensureDashboardSchema } from '../_lib/database.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (!['POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!isSameSiteRequest(req)) return res.status(403).json({ error: 'Request origin is not allowed.' });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearSessionCookie(req));
    return res.status(200).json({ ok: true });
  }
  if (!passwordIsConfigured()) {
    return res.status(503).json({ error: 'Owner dashboard is not configured yet. Add a six-character DASHBOARD_PASSWORD in Vercel Environment Variables, then redeploy.' });
  }
  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  try {
    const db = await ensureDashboardSchema(database());
    if (matchesDashboardPassword(password)) {
      await db.query('UPDATE admin_login_guard SET failures = 0, window_started = NOW() WHERE id = 1');
      res.setHeader('Set-Cookie', issueSessionCookie(req));
      return res.status(200).json({ ok: true });
    }
    const result = await db.query(`UPDATE admin_login_guard SET
      failures = CASE WHEN window_started < NOW() - INTERVAL '15 minutes' THEN 1 ELSE LEAST(failures + 1, 3) END,
      window_started = CASE WHEN window_started < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE window_started END
      WHERE id = 1 RETURNING failures`);
    if (Number(result.rows[0]?.failures) >= 3) return res.status(429).json({ error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' });
    return res.status(401).json({ error: 'That password did not match. Please try again.' });
  } catch (error) {
    console.error('Owner dashboard sign-in could not complete:', error.message);
    return res.status(503).json({ error: 'Sign-in is temporarily unavailable. Please try again soon.' });
  }
}
