 const { query, withTransaction } = require('../config/db');
const { emitNotification } = require('../services/notificationService');
const { getIO } = require('../config/socket');
const { v4: uuidv4 } = require('uuid');

const generateDeliveryNumber = () => `DEL-${Date.now()}`;

const createDelivery = async (req, res) => {
  const { request_id, po_id, vehicle_id, driver_id, origin_facility_id, destination_facility_id, items, estimated_arrival } = req.body;
  try {
    const delivery = await withTransaction(async (client) => {
      const delNum = generateDeliveryNumber();
      const delId = uuidv4();
      await client.query(
        `INSERT INTO deliveries (id, delivery_number, request_id, po_id, vehicle_id, driver_id, origin_facility_id, destination_facility_id, estimated_arrival)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [delId, delNum, request_id || null, po_id || null, vehicle_id, driver_id, origin_facility_id, destination_facility_id, estimated_arrival || null]
      );
      for (const item of items) {
        const batchId = item.batch_id || null;
        await client.query(
          `INSERT INTO delivery_items (id, delivery_id, batch_id, medicine_id, quantity) VALUES (gen_random_uuid(),$1,$2,$3,$4)`,
          [delId, batchId, item.medicine_id, item.quantity]
        );
      }
await client.query('UPDATE vehicles SET status = $1, driver_id = $2 WHERE id = $3', ['ON_TRIP', driver_id, vehicle_id]);
      return { id: delId, delivery_number: delNum };
    });

    await emitNotification({
      facility_id: destination_facility_id,
      type: 'DELIVERY_ASSIGNED',
      title: '🚚 Delivery Assigned',
      message: `Delivery ${delivery.delivery_number} has been assigned and will depart soon`,
      reference_id: delivery.id,
      reference_type: 'delivery'
    });

    res.status(201).json({ data: delivery });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const startDelivery = async (req, res) => {
  const { id } = req.params;
  try {
await query('UPDATE deliveries SET status = $1, started_at = NOW(), gps_tracking_active = true WHERE id = $2', ['IN_TRANSIT', id]);
    const result = await query('SELECT * FROM deliveries WHERE id = $1', [id]);
    const delivery = result.rows[0];

    await emitNotification({
      facility_id: delivery.destination_facility_id,
      type: 'DELIVERY_STARTED',
      title: '🚚 Delivery Started',
      message: `Your medicines are on the way! Estimated arrival: ${delivery.estimated_arrival}`,
      reference_id: id,
      reference_type: 'delivery'
    });

    res.json({ data: delivery });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const updateGPS = async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, speed } = req.body;
  try {
    const delivery = await query('SELECT * FROM deliveries WHERE id = $1', [id]);
    if (!delivery.rows[0]) return res.status(404).json({ error: 'Delivery not found' });

    await query('INSERT INTO gps_logs (vehicle_id, delivery_id, latitude, longitude, speed) VALUES ($1,$2,$3,$4,$5)',
      [delivery.rows[0].vehicle_id, id, latitude, longitude, speed || null]);

    await query('UPDATE vehicles SET current_latitude = $2, current_longitude = $3, last_location_update = NOW() WHERE id = $1',
      [delivery.rows[0].vehicle_id, latitude, longitude]);

    const io = getIO();
    io.emit('gps_update', { delivery_id: id, vehicle_id: delivery.rows[0].vehicle_id, latitude, longitude, speed, timestamp: new Date() });

    res.json({ message: 'GPS updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const confirmDelivery = async (req, res) => {
  const { id } = req.params;
  const { confirmed_items } = req.body;
  try {
    await withTransaction(async (client) => {
await client.query(
        'UPDATE deliveries SET status = $1, actual_arrival = NOW(), completed_at = NOW(), gps_tracking_active = false WHERE id = $2',
        ['DELIVERED', id]
      );
      const delivery = await client.query('SELECT * FROM deliveries WHERE id = $1', [id]);
      const { vehicle_id, destination_facility_id } = delivery.rows[0];

      for (const item of (confirmed_items || [])) {
        await client.query(
          'UPDATE delivery_items SET confirmed_quantity = $2, qr_scanned = true, scanned_at = NOW() WHERE delivery_id = $1 AND medicine_id = $3',
          [id, item.confirmed_quantity, item.medicine_id]
        );
        await client.query(
          `INSERT INTO inventory (facility_id, medicine_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (facility_id, medicine_id)
           DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, last_updated = NOW()`,
          [destination_facility_id, item.medicine_id, item.confirmed_quantity]
        );
        if (item.batch_id) {
          await client.query('UPDATE stock_batches SET facility_id = $2 WHERE id = $1', [item.batch_id, destination_facility_id]);
        }
      }
await client.query('UPDATE vehicles SET status = $1 WHERE id = $2', [vehicle_id, 'AVAILABLE']);
    });

    const del = await query('SELECT destination_facility_id FROM deliveries WHERE id = $1', [id]);
    await emitNotification({
      facility_id: del.rows[0].destination_facility_id,
      type: 'DELIVERY_COMPLETED',
      title: '✅ Delivery Completed',
      message: 'Medicines received and stock updated automatically',
      reference_id: id,
      reference_type: 'delivery'
    });

    // Trigger AI recompute (non-blocking)
    (async () => {
      try {
        const axios = require('axios');
        await axios.post(`${process.env.AI_MODULE_URL}/forecast/save?months_ahead=3`);
      } catch (e) { console.error('AI trigger (confirmDelivery) failed:', e.message); }
    })();

    res.json({ message: 'Delivery confirmed and stock updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getDeliveries = async (req, res) => {
  const { status, facility_id } = req.query;
  try {
    let sql = `
      SELECT d.*, v.plate_number, v.type as vehicle_type, v.current_latitude, v.current_longitude,
             u.name as driver_name, u.phone as driver_phone,
             orig.name as origin_name, dest.name as destination_name
      FROM deliveries d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      LEFT JOIN users u ON d.driver_id = u.id
      JOIN facilities orig ON d.origin_facility_id = orig.id
      JOIN facilities dest ON d.destination_facility_id = dest.id
      WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); sql += ` AND d.status = $${params.length}`; }
    if (facility_id) {
      params.push(facility_id, facility_id);
      sql += ` AND (d.origin_facility_id = $${params.length-1} OR d.destination_facility_id = $${params.length})`;
    }
    sql += ' ORDER BY d.created_at DESC';
    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getActiveVehicles = async (req, res) => {
  try {
    const result = await query(`
      SELECT v.*, u.name as driver_name, u.phone as driver_phone,
             d.id as delivery_id, d.delivery_number, d.estimated_arrival, d.started_at,
             df.name as destination_name, df.latitude as dest_lat, df.longitude as dest_lng,
             of.name as origin_name, of.latitude as origin_lat, of.longitude as origin_lng
      FROM vehicles v
      LEFT JOIN users u ON v.driver_id = u.id
      LEFT JOIN deliveries d ON d.vehicle_id = v.id AND d.status = 'IN_TRANSIT'
      LEFT JOIN facilities df ON d.destination_facility_id = df.id
      LEFT JOIN facilities of ON d.origin_facility_id = of.id
      WHERE v.status = 'ON_TRIP'`);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { createDelivery, startDelivery, updateGPS, confirmDelivery, getDeliveries, getActiveVehicles };
