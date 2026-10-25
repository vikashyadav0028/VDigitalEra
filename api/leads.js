import pg from 'pg';

const { Pool } = pg;
let pool;
let schemaReady;

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  });
  return pool;
}

async function ensureSchema(database) {
  schemaReady ??= database.query(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name VARCHAR(120) NOT NULL,
      email VARCHAR(200) NOT NULL,
      phone VARCHAR(40),
      business VARCHAR(160),
      service VARCHAR(120) NOT NULL,
      budget VARCHAR(80),
      message VARCHAR(3000) NOT NULL,
      consent BOOLEAN NOT NULL CHECK (consent = TRUE)
    )
  `).catch((error) => {
    schemaReady = undefined;
    throw error;
  });
  await schemaReady;
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return res.status(403).json({ error: 'Request origin is not allowed.' });
    } catch {
      return res.status(403).json({ error: 'Request origin is not allowed.' });
    }
  }

  const data = req.body && typeof req.body === 'object' ? req.body : {};
  if (typeof data.website_url === 'string' && data.website_url.trim()) {
    return res.status(200).json({ ok: true });
  }

  const lead = {
    name: clean(data.name),
    email: clean(data.email),
    phone: clean(data.phone),
    business: clean(data.business),
    service: clean(data.service),
    budget: clean(data.budget),
    message: clean(data.message),
  };
  const valid = lead.name && lead.name.length <= 120
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) && lead.email.length <= 200
    && lead.phone.length <= 40 && lead.business.length <= 160
    && lead.service && lead.service.length <= 120
    && lead.budget.length <= 80 && lead.message && lead.message.length <= 3000
    && data.consent === 'on';
  if (!valid) return res.status(400).json({ error: 'Please check the required fields and try again.' });

  try {
    const database = getPool();
    await ensureSchema(database);
    await database.query(
      `INSERT INTO enquiries (name, email, phone, business, service, budget, message, consent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
      [lead.name, lead.email, lead.phone || null, lead.business || null, lead.service, lead.budget || null, lead.message],
    );
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Could not save enquiry:', error.message);
    return res.status(503).json({ error: 'We could not save that enquiry right now. Please contact us on WhatsApp.' });
  }
}

