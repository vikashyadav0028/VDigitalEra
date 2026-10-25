import pg from 'pg';

const { Pool } = pg;
let pool;
let schemaPromise;

export function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 7000,
  });
  return pool;
}

export async function ensureDashboardSchema(db = database()) {
  schemaPromise ??= db.query(`
    CREATE TABLE IF NOT EXISTS site_events (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('page_view', 'click')),
      page_path VARCHAR(240) NOT NULL,
      label VARCHAR(24)
    );
    CREATE INDEX IF NOT EXISTS site_events_created_at_idx ON site_events (created_at DESC);
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
    );
    CREATE INDEX IF NOT EXISTS enquiries_created_at_idx ON enquiries (created_at DESC);
  `).catch(error => {
    schemaPromise = undefined;
    throw error;
  });
  await schemaPromise;
  return db;
}
