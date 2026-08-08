/**
 * ==========================================================
 * SMART MEDICAL SUPPLY CHAIN - POSTGRES DEMO DATA SEEDER
 * ==========================================================
 * Seeds all data needed for the dashboards to display with
 * realistic demo data. Uses the Postgres schema (schema.sql).
 *
 * Run from the `database/` folder:
 *     node seed_pg.js
 *
 * It is idempotent — safe to re-run.
 * It seeds:
 *   - facilities, users
 *   - medicines, inventory, stock_batches
 *   - medicine_requests (+ items)
 *   - purchase_orders (+ items)
 *   - vehicles, deliveries (+ items)
 *   - consumption_history
 *   - ai_forecasts
 *   - notifications
 */
// Load Postgres connection settings from backend/.env
require('dotenv').config({ path: '../backend/.env' });
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const sslEnabled = process.env.DB_SSL === 'true';

const client = new Client({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'medical_supply_chain',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
});

const now = new Date();

// ---------------- Reference seed data ----------------
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
  { name: 'Admin MOH',        email: 'admin@moh.gov.rw',       phone: '+250788000001', password: 'Admin@1234',     role: 'MOH_ADMIN',         facilityName: 'Ministry of Health - Central Warehouse' },
  { name: 'Jean Warehouse',   email: 'warehouse@moh.gov.rw',   phone: '+250788000002', password: 'Warehouse@1234', role: 'WAREHOUSE_MANAGER', facilityName: 'Ministry of Health - Central Warehouse' },
  { name: 'Dr. Alice Hospital',email: 'hospital@kigali.gov.rw', phone: '+250788000003', password: 'Hospital@1234',  role: 'DISTRICT_HOSPITAL', facilityName: 'Kigali University Teaching Hospital' },
  { name: 'Nurse Bob Center', email: 'healthcenter@gasabo.gov.rw', phone: '+250788000004', password: 'Center@1234',    role: 'HEALTH_CENTER',     facilityName: 'Gasabo Health Center' },
  { name: 'Supplier Corp',    email: 'supplier@pharma.rw',     phone: '+250788000005', password: 'Supplier@1234',  role: 'SUPPLIER',          facilityName: 'Rwanda Pharma Supplier Ltd' },
  { name: 'Driver Eric',      email: 'driver@moh.gov.rw',      phone: '+250788000006', password: 'Driver@1234',    role: 'DRIVER',            facilityName: 'Ministry of Health - Central Warehouse' },
];

// Medicines: name, generic_name, category_id, unit, unit_price, reorder_level, safety_stock
const medicines = [
  ['Paracetamol 500mg', 'Paracetamol', 2, 'tablets', 15, 5000, 2000],
  ['Amoxicillin 500mg', 'Amoxicillin', 1, 'capsules', 45, 3000, 1000],
  ['ORS Sachets', 'Oral Rehydration Salts', 4, 'sachets', 120, 1000, 500],
  ['IV Normal Saline 1L', 'Sodium Chloride 0.9%', 5, 'bags', 800, 200, 100],
  ['Artemether-Lumefantrine', 'Coartem', 3, 'tablets', 350, 2000, 800],
  ['Metronidazole 400mg', 'Metronidazole', 1, 'tablets', 25, 2000, 800],
  ['Cotrimoxazole 480mg', 'Cotrimoxazole', 1, 'tablets', 20, 3000, 1000],
  ['Vitamin A 200000IU', 'Retinol', 6, 'capsules', 50, 1000, 400],
  ['Zinc Sulfate 20mg', 'Zinc', 6, 'tablets', 30, 1000, 400],
  ['Oxytocin 10IU', 'Oxytocin', 10, 'vials', 500, 500, 200],
];

// Helper: generate a repeatable pseudo-random number from a seed string
function seededRandom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // normalize to 0..1
  return (h >>> 0) / 4294967295;
}

async function seed() {
  await client.connect();
  try {
    await client.query('BEGIN');

    // ============ FACILITIES ============
    console.log('Seeding facilities...');
    const facilityIds = {};
    for (const f of facilities) {
      const res = await client.query('SELECT id FROM facilities WHERE name = $1', [f.name]);
      if (res.rows[0]) {
        facilityIds[f.name] = res.rows[0].id;
        console.log(`  ✓ Exists: ${f.name}`);
      } else {
        const ins = await client.query(
          `INSERT INTO facilities (name, type, district_id, latitude, longitude)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [f.name, f.type, f.district_id, f.latitude, f.longitude]
        );
        facilityIds[f.name] = ins.rows[0].id;
        console.log(`  + Created: ${f.name}`);
      }
    }
    const warehouse = facilityIds['Ministry of Health - Central Warehouse'];
    const hospital = facilityIds['Kigali University Teaching Hospital'];
    const healthCenter = facilityIds['Gasabo Health Center'];
    const supplier = facilityIds['Rwanda Pharma Supplier Ltd'];
    const musanze = facilityIds['Musanze District Hospital'];

    // ============ USERS ============
    console.log('\nSeeding users...');
    const userIds = {};
    for (const u of users) {
      const res = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (res.rows[0]) { userIds[u.email] = res.rows[0].id; console.log(`  ✓ Exists: ${u.email}`); continue; }
      const role = await client.query('SELECT id FROM roles WHERE name = $1', [u.role]);
      if (!role.rows[0]) { console.log(`  ✗ Role not found: ${u.role}`); continue; }
      const hash = await bcrypt.hash(u.password, 12);
      const ins = await client.query(
        `INSERT INTO users (name, email, phone, password_hash, role_id, facility_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [u.name, u.email, u.phone, hash, role.rows[0].id, facilityIds[u.facilityName]]
      );
      userIds[u.email] = ins.rows[0].id;
      console.log(`  + Created: ${u.email}`);
    }
    const adminUser = userIds['admin@moh.gov.rw'];
    const warehouseUser = userIds['warehouse@moh.gov.rw'];
    const hospitalUser = userIds['hospital@kigali.gov.rw'];
    const driverUser = userIds['driver@moh.gov.rw'];

    // ============ MEDICINES ============
    console.log('\nSeeding medicines...');
    const medicineIds = {};
    for (const [name, generic, cat, unit, price, reorder, safety] of medicines) {
      const res = await client.query('SELECT id FROM medicines WHERE name = $1', [name]);
      if (res.rows[0]) { medicineIds[name] = res.rows[0].id; console.log(`  ✓ Exists: ${name}`); continue; }
      const ins = await client.query(
        `INSERT INTO medicines (name, generic_name, category_id, unit, unit_price, reorder_level, safety_stock)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [name, generic, cat, unit, price, reorder, safety]
      );
      medicineIds[name] = ins.rows[0].id;
      console.log(`  + Created: ${name}`);
    }
    const medNames = medicines.map(m => m[0]);

    // ============ INVENTORY ============
    console.log('\nSeeding inventory...');
    // Facility-level stock. Some facilities have low/out-of-stock to show status badges.
    const invPlan = {
      [warehouse]: { 'Paracetamol 500mg': 12000, 'Amoxicillin 500mg': 8000, 'ORS Sachets': 4000, 'IV Normal Saline 1L': 500, 'Artemether-Lumefantrine': 3000, 'Metronidazole 400mg': 5000 },
      [hospital]:   { 'Paracetamol 500mg': 2500, 'Amoxicillin 500mg': 1200, 'ORS Sachets': 600, 'IV Normal Saline 1L': 80, 'Artemether-Lumefantrine': 900, 'Zinc Sulfate 20mg': 300 },
      [healthCenter]: { 'Paracetamol 500mg': 300, 'Amoxicillin 500mg': 150, 'ORS Sachets': 80, 'Artemether-Lumefantrine': 120, 'Vitamin A 200000IU': 50 },
      [musanze]:    { 'Paracetamol 500mg': 1800, 'Amoxicillin 500mg': 900, 'ORS Sachets': 400, 'IV Normal Saline 1L': 60, 'Oxytocin 10IU': 40 },
    };
    let invCount = 0;
    for (const [fid, items] of Object.entries(invPlan)) {
      for (const [medName, qty] of Object.entries(items)) {
        const mid = medicineIds[medName];
        const res = await client.query(
          'SELECT id FROM inventory WHERE facility_id = $1 AND medicine_id = $2', [fid, mid]
        );
        if (res.rows[0]) continue;
        await client.query(
          'INSERT INTO inventory (facility_id, medicine_id, quantity) VALUES ($1,$2,$3)',
          [fid, mid, qty]
        );
        invCount++;
      }
    }
    console.log(`  + Created ${invCount} inventory rows`);

    // ============ STOCK BATCHES ============
    console.log('\nSeeding stock batches...');
    // batches with a mix of expiry dates (some within 90 days)
    const batchPlans = [
      // [medicine, facility, batch_no, qty, mfg offset days, expiry offset days, supplier]
      ['Paracetamol 500mg', warehouse, 'PAR-2025-001', 6000, 200, 540],
      ['Paracetamol 500mg', warehouse, 'PAR-2025-002', 6000, 60, 60],   // expiring soon
      ['Amoxicillin 500mg', warehouse, 'AMX-2025-001', 4000, 180, 300],
      ['Amoxicillin 500mg', warehouse, 'AMX-2025-002', 4000, 30, 45],   // expiring soon
      ['ORS Sachets', warehouse, 'ORS-2025-001', 2000, 150, 200],
      ['IV Normal Saline 1L', warehouse, 'IVN-2025-001', 250, 90, 30],  // expiring soon
      ['Artemether-Lumefantrine', warehouse, 'AL-2025-001', 1500, 120, 180],
      ['Metronidazole 400mg', warehouse, 'MTZ-2025-001', 2500, 100, 365],
      ['Artemether-Lumefantrine', hospital, 'AL-HOSP-2025-001', 500, 90, 70],
      ['Paracetamol 500mg', hospital, 'PAR-HOSP-2025-001', 1200, 80, 50], // expiring soon
    ];
    let batchCount = 0;
    for (const [medName, fid, batchNo, qty, mfgOff, expOff] of batchPlans) {
      const mid = medicineIds[medName];
      const res = await client.query('SELECT id FROM stock_batches WHERE batch_number = $1', [batchNo]);
      if (res.rows[0]) continue;
      const mfg = new Date(now); mfg.setDate(mfg.getDate() - mfgOff);
      const exp = new Date(now); exp.setDate(exp.getDate() + expOff);
      await client.query(
        `INSERT INTO stock_batches
           (medicine_id, facility_id, batch_number, lot_number, quantity, remaining_quantity,
            manufacturing_date, expiry_date, supplier_id, status)
         VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,'ACTIVE')`,
        [mid, fid, batchNo, `LOT-${batchNo}`, qty, mfg.toISOString(), exp.toISOString(), supplier]
      );
      batchCount++;
    }
    console.log(`  + Created ${batchCount} stock batches`);

    // ============ MEDICINE REQUESTS ============
    console.log('\nSeeding medicine requests...');
const reqStatuses = [
      { fac: hospital,     status: 'PENDING',   priority: 'HIGH',   med: 'Paracetamol 500mg', qty: 2000 },
      { fac: healthCenter, status: 'PENDING',   priority: 'EMERGENCY', med: 'IV Normal Saline 1L', qty: 50 },
      { fac: musanze,      status: 'APPROVED',  priority: 'NORMAL', med: 'Amoxicillin 500mg', qty: 800 },
      { fac: hospital,     status: 'FULFILLED', priority: 'NORMAL', med: 'ORS Sachets', qty: 500 },
      { fac: healthCenter, status: 'REJECTED',  priority: 'NORMAL', med: 'Vitamin A 200000IU', qty: 200 },
    ];
    let reqCount = 0;
    for (const r of reqStatuses) {
      const medName = r.med;
      const mid = medicineIds[medName];
      const reqNum = `REQ-2025-${String(1000 + reqCount)}`;
      const res = await client.query('SELECT id FROM medicine_requests WHERE request_number = $1', [reqNum]);
      if (res.rows[0]) continue;
      const reqId = res.rows[0]?.id || (await client.query(
        `INSERT INTO medicine_requests
           (request_number, requesting_facility_id, approving_facility_id, status, priority, requested_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [reqNum, r.fac, warehouse, r.status, r.priority, hospitalUser]
      )).rows[0].id;
      await client.query(
        `INSERT INTO medicine_request_items (request_id, medicine_id, requested_quantity, unit_price)
         VALUES ($1,$2,$3,$4)`,
        [reqId, mid, r.qty, 15]
      );
      reqCount++;
    }
    console.log(`  + Created ${reqCount} medicine requests`);

    // ============ PURCHASE ORDERS ============
    console.log('\nSeeding purchase orders...');
    const poStatuses = [
      { status: 'SENT',     med: 'Paracetamol 500mg', qty: 10000 },
      { status: 'ACCEPTED', med: 'Amoxicillin 500mg', qty: 6000 },
      { status: 'DELIVERED',med: 'ORS Sachets',       qty: 3000 },
      { status: 'SENT',     med: 'IV Normal Saline 1L', qty: 400 },
    ];
    let poCount = 0;
    for (const p of poStatuses) {
      const poNum = `PO-2025-${String(1000 + poCount)}`;
      const res = await client.query('SELECT id FROM purchase_orders WHERE po_number = $1', [poNum]);
      if (res.rows[0]) continue;
      const mid = medicineIds[p.med];
      const unitPrice = medicines.find(m => m[0] === p.med)[4];
      const total = p.qty * unitPrice;
      const poId = (await client.query(
        `INSERT INTO purchase_orders
           (po_number, warehouse_id, supplier_id, status, total_amount, created_by, expected_delivery)
         VALUES ($1,$2,$3,$4,$5,$6,NOW() + INTERVAL '10 days') RETURNING id`,
        [poNum, warehouse, supplier, p.status, total, warehouseUser]
      )).rows[0].id;
      await client.query(
        `INSERT INTO purchase_order_items (po_id, medicine_id, quantity, unit_price, total_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [poId, mid, p.qty, unitPrice, total]
      );
      poCount++;
    }
    console.log(`  + Created ${poCount} purchase orders`);

    // ============ VEHICLES ============
    console.log('\nSeeding vehicles...');
    const vehicles = [
      { plate: 'RAD 123 A', type: 'TRUCK', capacity: 3000, driver: driverUser, status: 'ON_TRIP' },
      { plate: 'RAD 456 B', type: 'VAN',   capacity: 1200, driver: null,       status: 'AVAILABLE' },
      { plate: 'RAD 789 C', type: 'MOTORCYCLE', capacity: 200, driver: null,   status: 'AVAILABLE' },
    ];
    const vehicleIds = {};
    for (const v of vehicles) {
      const res = await client.query('SELECT id FROM vehicles WHERE plate_number = $1', [v.plate]);
      if (res.rows[0]) { vehicleIds[v.plate] = res.rows[0].id; continue; }
      const ins = await client.query(
        `INSERT INTO vehicles (plate_number, type, capacity_kg, driver_id, status)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [v.plate, v.type, v.capacity, v.driver, v.status]
      );
      vehicleIds[v.plate] = ins.rows[0].id;
    }
    console.log(`  ✓ Vehicles ready`);

    // ============ DELIVERIES ============
    console.log('\nSeeding deliveries...');
    const deliveries = [
      { num: 'DEL-2025-0001', veh: 'RAD 123 A', driver: driverUser, from: warehouse, to: hospital, status: 'IN_TRANSIT', med: 'Paracetamol 500mg', qty: 2000 },
      { num: 'DEL-2025-0002', veh: 'RAD 456 B', driver: null,       from: warehouse, to: healthCenter, status: 'ASSIGNED', med: 'ORS Sachets', qty: 500 },
      { num: 'DEL-2025-0003', veh: 'RAD 789 C', driver: null,       from: warehouse, to: musanze, status: 'DELIVERED', med: 'Amoxicillin 500mg', qty: 800 },
    ];
let delCount = 0;
    for (const d of deliveries) {
      const res = await client.query('SELECT id FROM deliveries WHERE delivery_number = $1', [d.num]);
      if (res.rows[0]) continue;
      // Compute timestamps in JS based on status to avoid parameter type inference issues
      const startedAt = (d.status === 'IN_TRANSIT' || d.status === 'DELIVERED') ? now : null;
      const completedAt = (d.status === 'DELIVERED') ? now : null;
      const eta = new Date(now); eta.setHours(eta.getHours() + 2);
      const delId = (await client.query(
        `INSERT INTO deliveries
           (delivery_number, vehicle_id, driver_id, origin_facility_id, destination_facility_id,
            status, estimated_arrival, started_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [d.num, vehicleIds[d.veh], d.driver, d.from, d.to, d.status, eta, startedAt, completedAt]
      )).rows[0].id;
      await client.query(
        `INSERT INTO delivery_items (delivery_id, medicine_id, quantity)
         VALUES ($1,$2,$3)`,
        [delId, medicineIds[d.med], d.qty]
      );
      delCount++;
    }
    console.log(`  + Created ${delCount} deliveries`);

    // ============ CONSUMPTION HISTORY ============
    console.log('\nSeeding consumption history (12 months)...');
    let consCount = 0;
    const consumptionFacilities = [warehouse, hospital, healthCenter, musanze];
    for (const fid of consumptionFacilities) {
      for (const medName of ['Paracetamol 500mg', 'Amoxicillin 500mg', 'ORS Sachets', 'Artemether-Lumefantrine']) {
        const mid = medicineIds[medName];
        const base = 60 + Math.floor(seededRandom(fid + medName) * 80); // 60..140
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now); d.setMonth(d.getMonth() - i);
          const year = d.getFullYear();
          const month = d.getMonth() + 1;
          const season = (month >= 1 && month <= 3 || month >= 11) ? 1.2 : 0.9;
          const noise = 0.85 + seededRandom(fid + medName + month) * 0.3;
          const qty = Math.max(1, Math.round(base * season * noise));
          await client.query(
            `INSERT INTO consumption_history (facility_id, medicine_id, quantity_consumed, period_month, period_year)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (facility_id, medicine_id, period_month, period_year)
             DO UPDATE SET quantity_consumed = EXCLUDED.quantity_consumed`,
            [fid, mid, qty, month, year]
          );
          consCount++;
        }
      }
    }
    console.log(`  + Upserted ${consCount} consumption_history rows`);

    // ============ AI FORECASTS ============
    console.log('\nSeeding AI forecasts (next 3 months)...');
    let fcCount = 0;
    for (const fid of consumptionFacilities) {
      for (const medName of ['Paracetamol 500mg', 'Amoxicillin 500mg', 'ORS Sachets', 'Artemether-Lumefantrine']) {
        const mid = medicineIds[medName];
        const base = 60 + Math.floor(seededRandom(fid + medName) * 80);
        for (let i = 1; i <= 3; i++) {
          const d = new Date(now); d.setMonth(d.getMonth() + i);
          const year = d.getFullYear();
          const month = d.getMonth() + 1;
          const predicted = Math.max(1, Math.round(base * 1.1));
          const confidence = Math.round((70 + seededRandom(fid + medName + 'c' + i) * 25) * 100) / 100;
          await client.query(
            `INSERT INTO ai_forecasts (facility_id, medicine_id, forecast_month, forecast_year, predicted_quantity, confidence_score, model_version)
             VALUES ($1,$2,$3,$4,$5,$6,'demo-linear')
             ON CONFLICT DO NOTHING`,
            [fid, mid, month, year, predicted, confidence]
          );
          fcCount++;
        }
      }
    }
    console.log(`  + Created ${fcCount} ai_forecasts rows`);

    // ============ NOTIFICATIONS ============
    console.log('\nSeeding notifications...');
    const notifications = [
      { user: adminUser, fac: warehouse, type: 'LOW_STOCK', title: 'Low stock alert', message: 'IV Normal Saline 1L is low in Central Warehouse', priority: 'HIGH' },
      { user: adminUser, fac: warehouse, type: 'EXPIRY_ALERT', title: 'Expiry alert', message: 'Paracetamol 500mg batch PAR-2025-002 expires within 90 days', priority: 'HIGH' },
      { user: warehouseUser, fac: warehouse, type: 'NEW_REQUEST', title: 'New request', message: 'Kigali University Teaching Hospital submitted a request', priority: 'NORMAL' },
      { user: hospitalUser, fac: hospital, type: 'DELIVERY_STARTED', title: 'Delivery started', message: 'Your medicines are on the way', priority: 'NORMAL' },
    ];
    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (user_id, facility_id, type, title, message, priority)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [n.user, n.fac, n.type, n.title, n.message, n.priority]
      );
    }
    console.log(`  + Created ${notifications.length} notifications`);

    await client.query('COMMIT');
    console.log('\n✅ Postgres seed completed successfully!\n');
    printCredentials();
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', e.message);
  } finally {
    await client.end();
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
