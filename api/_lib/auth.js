import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const cookieName = 'vd_owner_session';
const sessionLifetime = 3 * 24 * 60 * 60;

function expectedPassword() {
  const password = process.env.DASHBOARD_PASSWORD;
  return typeof password === 'string' && password.length >= 20 ? password : null;
}

export function passwordIsConfigured() {
  return Boolean(expectedPassword());
}

export function matchesDashboardPassword(candidate) {
  const expected = expectedPassword();
  if (!expected || typeof candidate !== 'string') return false;
  const expectedDigest = createHash('sha256').update(expected).digest();
  const candidateDigest = createHash('sha256').update(candidate).digest();
  return timingSafeEqual(expectedDigest, candidateDigest);
}

function sign(timestamp) {
  return createHmac('sha256', expectedPassword()).update(`vd-owner:${timestamp}`).digest('hex');
}

export function issueSessionCookie(req) {
  const timestamp = Math.floor(Date.now() / 1000);
  const token = `${timestamp}.${sign(timestamp)}`;
  const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionLifetime}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(req) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function hasOwnerSession(req) {
  if (!expectedPassword()) return false;
  const rawCookie = req.headers.cookie || '';
  const token = rawCookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token) return false;
  const [timestampText, signature, extra] = token.split('.');
  if (extra || !/^\d{10}$/.test(timestampText || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return false;
  const timestamp = Number(timestampText);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(timestamp) || timestamp > now + 60 || now - timestamp > sessionLifetime) return false;
  const actual = Buffer.from(signature, 'hex');
  const expected = Buffer.from(sign(timestamp), 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isSameSiteRequest(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
