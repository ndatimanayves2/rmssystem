const { Pool } = require('pg');

const sslEnabled = process.env.DB_SSL === 'true';

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'medical_supply_chain',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
});

// Main query helper — returns { rows }
const query = async (text, params = []) => {
  const res = await pool.query(text, params);
  return { rows: res.rows };
};

// Transaction helper
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, withTransaction };
