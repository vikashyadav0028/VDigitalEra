import { clearSessionCookie, isSameSiteRequest, issueSessionCookie, matchesDashboardPassword, passwordIsConfigured } from '../_lib/auth.js';

const failedLogins = new Map();
const attemptWindowMs = 15 * 60 * 1000;
const maxAttempts = 8;

function requestKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : 'unknown';
}

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
    return res.status(503).json({ error: 'Owner dashboard is not configured yet. Add DASHBOARD_PASSWORD in Vercel Environment Variables (use at least 20 characters), then redeploy.' });
  }
  const key = requestKey(req);
  const now = Date.now();
  const recent = (failedLogins.get(key) || []).filter(time => now - time < attemptWindowMs);
  if (recent.length >= maxAttempts) return res.status(429).json({ error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' });
  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (!matchesDashboardPassword(password)) {
    recent.push(now);
    failedLogins.set(key, recent);
    return res.status(401).json({ error: 'That password did not match. Please try again.' });
  }
  failedLogins.delete(key);
  res.setHeader('Set-Cookie', issueSessionCookie(req));
  return res.status(200).json({ ok: true });
}
