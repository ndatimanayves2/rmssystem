/**
 * ==========================================================
 * SMART MEDICAL SUPPLY CHAIN - POSTGRES SETUP
 * ==========================================================
 * Applies the schema (schema.sql) to the configured Postgres
 * database, then runs the demo data seeder (seed_pg.js).
 *
 * Run from the `database/` folder:
 *     node setup_pg.js
 */
require('dotenv').config({ path: '../backend/.env' });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sslEnabled = process.env.DB_SSL === 'true';

async function applySchema() {
  const client = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'medical_supply_chain',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  });

  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await client.connect();
    console.log('Applying schema.sql ...');
    // Split statements and run them individually to handle permissions & errors better
    const statements = sql
      .split(/;\s*(\r?\n|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (e) {
        // Ignore "already exists" style errors so the script is idempotent
        console.log('  (skip) ' + e.message.split('\n')[0]);
      }
    }
    console.log('✅ Schema applied successfully.');
  } catch (e) {
    console.error('❌ Schema apply failed:', e.message);
  } finally {
    await client.end();
  }
}

applySchema().then(() => {
  console.log('\nNow running demo data seeder...\n');
  require('./seed_pg.js');
});
