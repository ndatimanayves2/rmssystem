require('dotenv').config({ path: '../backend/.env' });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'medical_supply_chain',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
});

const facilities = [
  { name: 'Ministry of Health - Central Warehouse', type: 'CENTRAL_WAREHOUSE', district_id: 1, latitude: -1.9441, longitude: 30.0619 },
  { name: 'Kigali University Teaching Hospital',    type: 'DISTRICT_HOSPITAL',  district_id: 1, latitude: -1.9500, longitude: 30.0588 },
  { name: 'Gasabo Health Center',                   type: 'HEALTH_CENTER',      district_id: 1, latitude: -1.9200, longitude: 30.0800 },
  { name: 'Rwanda Pharma Supplier Ltd',             type: 'SUPPLIER',           district_id: 2, latitude: -1.9300, longitude: 30.0700 },
  { name: 'Musanze District Hospital',              type: 'DISTRICT_HOSPITAL',  district_id: 7, latitude: -1.4990, longitude: 29.6340 },
  { name: 'Huye District Hospital',                 type: 'DISTRICT_HOSPITAL',  district_id: 10, latitude: -2.5960, longitude: 29.7390 },
  { name: 'Rubavu Health Center',                   type: 'HEALTH_CENTER',      district_id: 28, latitude: -1.6800, longitude: 29.2600 },
];

const users = [
  { name: 'Admin MOH',        email: 'admin@moh.gov.rw',             phone: '+250788000001', password: 'Admin@1234',     role: 'MOH_ADMIN',         facilityName: 'Ministry of Health - Central Warehouse' },
  { name: 'Jean Warehouse',   email: 'warehouse@moh.gov.rw',         phone: '+250788000002', password: 'Warehouse@1234', role: 'WAREHOUSE_MANAGER', facilityName: 'Ministry of Health - Central Warehouse' },
  { name: 'Dr. Alice Hospital',email: 'hospital@kigali.gov.rw',      phone: '+250788000003', password: 'Hospital@1234',  role: 'DISTRICT_HOSPITAL', facilityName: 'Kigali University Teaching Hospital' },
  { name: 'Nurse Bob Center', email: 'healthcenter@gasabo.gov.rw',   phone: '+250788000004', password: 'Center@1234',    role: 'HEALTH_CENTER',     facilityName: 'Gasabo Health Center' },
  { name: 'Supplier Corp',    email: 'supplier@pharma.rw',           phone: '+250788000005', password: 'Supplier@1234',  role: 'SUPPLIER',          facilityName: 'Rwanda Pharma Supplier Ltd' },
  { name: 'Driver Eric',      email: 'driver@moh.gov.rw',            phone: '+250788000006', password: 'Driver@1234',    role: 'DRIVER',            facilityName: 'Ministry of Health - Central Warehouse' },
];

async function seed() {
  const conn = await pool.getConnection();
  try {
    // Seed facilities
    console.log('Seeding facilities...');
    const facilityMap = {};
    for (const f of facilities) {
      const [rows] = await conn.execute('SELECT id FROM facilities WHERE name = ?', [f.name]);
      if (rows[0]) {
        facilityMap[f.name] = rows[0].id;
        console.log(`  ✓ Exists: ${f.name}`);
      } else {
        const id = uuidv4();
        await conn.execute(
          'INSERT INTO facilities (id, name, type, district_id, latitude, longitude) VALUES (?,?,?,?,?,?)',
          [id, f.name, f.type, f.district_id, f.latitude, f.longitude]
        );
        facilityMap[f.name] = id;
        console.log(`  + Created: ${f.name}`);
      }
    }

    // Seed users
    console.log('\nSeeding users...');
    for (const u of users) {
      const [exists] = await conn.execute('SELECT id FROM users WHERE email = ?', [u.email]);
      if (exists[0]) { console.log(`  ✓ Exists: ${u.email}`); continue; }

      const [roleRows] = await conn.execute('SELECT id FROM roles WHERE name = ?', [u.role]);
      if (!roleRows[0]) { console.log(`  ✗ Role not found: ${u.role}`); continue; }

      const hash = await bcrypt.hash(u.password, 12);
      const id = uuidv4();
      await conn.execute(
        'INSERT INTO users (id, name, email, phone, password_hash, role_id, facility_id) VALUES (?,?,?,?,?,?,?)',
        [id, u.name, u.email, u.phone, hash, roleRows[0].id, facilityMap[u.facilityName]]
      );
      console.log(`  + Created: ${u.email}`);
    }

    console.log('\n✅ Seed completed!\n');
    printCredentials();
  } catch (e) {
    console.error('❌ Seed failed:', e.message);
  } finally {
    conn.release();
    await pool.end();
  }
}

function printCredentials() {
  console.log('='.repeat(65));
  console.log('  USER CREDENTIALS');
  console.log('='.repeat(65));
  console.log('Role'.padEnd(20) + 'Email'.padEnd(32) + 'Password');
  console.log('-'.repeat(65));
  for (const u of users) {
    console.log(u.role.padEnd(20) + u.email.padEnd(32) + u.password);
  }
  console.log('='.repeat(65));
}

seed();
