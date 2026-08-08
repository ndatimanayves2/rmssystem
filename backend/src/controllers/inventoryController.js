const { query, withTransaction } = require('../config/db');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const getPredictedDepletion = async (facility_id, medicine_id, current_quantity) => {
  try {
    const now = new Date();
    const currentIndex = now.getFullYear() * 12 + (now.getMonth() + 1);
    const maxIndex = currentIndex + 3;
    const forecastResult = await query(
      `SELECT SUM(predicted_quantity) as predicted_total
       FROM ai_forecasts
       WHERE facility_id = $1 AND medicine_id = $2
         AND (forecast_year * 12 + forecast_month) > $3
         AND (forecast_year * 12 + forecast_month) <= $4`,
      [facility_id, medicine_id, currentIndex, maxIndex]
    );
    const predictedTotal = Number(forecastResult.rows[0]?.predicted_total || 0);
    if (predictedTotal <= 0) return null;

    const medResult = await query('SELECT name, safety_stock FROM medicines WHERE id = $1', [medicine_id]);
    const medicine = medResult.rows[0] || { name: 'Medicine', safety_stock: 0 };
    const safetyStock = Number(medicine.safety_stock || 0);

    if (predictedTotal > current_quantity + safetyStock) {
      return {
        medicine_name: medicine.name,
        predicted_total: predictedTotal,
        safety_stock: safetyStock,
      };
    }
    return null;
  } catch (e) {
    console.error('Predicted depletion check failed:', e.message);
    return null;
  }
};

const getInventory = async (req, res) => {
  const { facility_id } = req.query;
  const fid = facility_id || req.user.facility_id;
  try {
    const result = await query(`
      SELECT i.*, m.name, m.generic_name, m.unit, m.reorder_level, m.safety_stock,
             mc.name as category,
             CASE WHEN i.quantity <= 0 THEN 'OUT_OF_STOCK'
                  WHEN i.quantity <= m.safety_stock THEN 'CRITICAL'
                  WHEN i.quantity <= m.reorder_level THEN 'LOW'
                  ELSE 'ADEQUATE' END as stock_status
      FROM inventory i
      JOIN medicines m ON i.medicine_id = m.id
      JOIN medicine_categories mc ON m.category_id = mc.id
      WHERE i.facility_id = $1
      ORDER BY m.name`, [fid]);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getLowStock = async (req, res) => {
  try {
    const result = await query(`
      SELECT i.*, m.name, m.unit, m.reorder_level, m.safety_stock, f.name as facility_name, f.type as facility_type
      FROM inventory i
      JOIN medicines m ON i.medicine_id = m.id
      JOIN facilities f ON i.facility_id = f.id
      WHERE i.quantity <= m.reorder_level
      ORDER BY CAST(i.quantity AS DECIMAL) / NULLIF(m.reorder_level, 0) ASC`);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getExpiringBatches = async (req, res) => {
  const { days = 90 } = req.query;
  try {
    const result = await query(`
      SELECT sb.*, m.name as medicine_name, m.unit, f.name as facility_name,
             (CURRENT_DATE - sb.expiry_date::date) as days_remaining
      FROM stock_batches sb
      JOIN medicines m ON sb.medicine_id = m.id
      JOIN facilities f ON sb.facility_id = f.id
      WHERE sb.status = 'ACTIVE' AND sb.expiry_date <= CURRENT_DATE + ($1 || ' days')::interval
      ORDER BY sb.expiry_date ASC`, [parseInt(days)]);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const addBatch = async (req, res) => {
  const { medicine_id, facility_id, batch_number, lot_number, quantity, manufacturing_date, expiry_date, supplier_id } = req.body;
  try {
    const batchId = uuidv4();
    const qrData = JSON.stringify({ id: batchId, medicine_id, batch_number, lot_number, expiry_date, facility_id });
    const qrCode = await QRCode.toDataURL(qrData);

    await query(
      `INSERT INTO stock_batches (id, medicine_id, facility_id, batch_number, lot_number, quantity, remaining_quantity, manufacturing_date, expiry_date, qr_code, supplier_id)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10)`,
      [batchId, medicine_id, facility_id, batch_number, lot_number || null, quantity, manufacturing_date || null, expiry_date, qrCode, supplier_id || null]
    );

    await query(
      `INSERT INTO inventory (facility_id, medicine_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (facility_id, medicine_id)
       DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, last_updated = NOW()`,
      [facility_id, medicine_id, quantity]
    );

    const batch = await query('SELECT * FROM stock_batches WHERE id = $1', [batchId]);

    // Trigger AI recompute (non-blocking)
    (() => {
      try {
        const axios = require('axios');
        axios.post(`${process.env.AI_MODULE_URL}/forecast/save?months_ahead=3`).catch(() => {});
      } catch (e) { console.error('AI trigger (addBatch) failed:', e.message); }
    })();

    // Notify facility of new batch
    const notifService = require('../services/notificationService');
    await notifService.emitNotification({ facility_id: facility_id, type: 'BATCH_ADDED', title: 'New Batch Received', message: `Batch ${batch.rows[0].batch_number} added to inventory`, reference_id: batchId, reference_type: 'stock_batch' });

    res.status(201).json({ data: batch.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const scanQR = async (req, res) => {
  const { qr_data } = req.body;
  try {
    const parsed = typeof qr_data === 'string' ? JSON.parse(qr_data) : qr_data;
    const result = await query(
      `SELECT sb.*, m.name as medicine_name, m.unit, f.name as facility_name
       FROM stock_batches sb
       JOIN medicines m ON sb.medicine_id = m.id
       JOIN facilities f ON sb.facility_id = f.id
       WHERE sb.id = $1`, [parsed.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Batch not found' });
    res.json({ data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getBatches = async (req, res) => {
  const { facility_id, medicine_id } = req.query;
  try {
    let sql = `SELECT sb.*, m.name as medicine_name, m.unit,
               (CURRENT_DATE - sb.expiry_date::date) as days_remaining
               FROM stock_batches sb JOIN medicines m ON sb.medicine_id = m.id WHERE sb.status = 'ACTIVE'`;
    const params = [];
    if (facility_id) { params.push(facility_id); sql += ` AND sb.facility_id = $${params.length}`; }
    if (medicine_id) { params.push(medicine_id); sql += ` AND sb.medicine_id = $${params.length}`; }
    sql += ' ORDER BY sb.expiry_date ASC';
    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const dispense = async (req, res) => {
  const { medicine_id, quantity, batch_id, notes } = req.body;
  const facility_id = req.user.facility_id;
  const notifService = require('../services/notificationService');
  const axios = require('axios');

  try {
    const result = await withTransaction(async (client) => {
      // Check inventory
      const inv = await client.query('SELECT * FROM inventory WHERE facility_id = $1 AND medicine_id = $2 FOR UPDATE', [facility_id, medicine_id]);
      const currentQty = inv.rows[0] ? Number(inv.rows[0].quantity) : 0;
      if (currentQty < quantity) throw new Error('Insufficient stock to dispense');

      // Decrement inventory
      await client.query('UPDATE inventory SET quantity = quantity - $3, last_updated = NOW() WHERE facility_id = $1 AND medicine_id = $2', [facility_id, medicine_id, quantity]);

      // Deduct from batch if provided (FEFO not enforced here; prefer providing batch_id)
      if (batch_id) {
        const b = await client.query('SELECT * FROM stock_batches WHERE id = $1 FOR UPDATE', [batch_id]);
        if (!b.rows[0]) throw new Error('Batch not found');
        if (Number(b.rows[0].remaining_quantity) < quantity) throw new Error('Batch does not have enough quantity');
        await client.query('UPDATE stock_batches SET remaining_quantity = remaining_quantity - $2 WHERE id = $1', [batch_id, quantity]);
        // mark batch consumed if remaining 0
        await client.query("UPDATE stock_batches SET status = 'CONSUMED' WHERE id = $1 AND remaining_quantity <= 0", [batch_id]);
      }

      // Record consumption into consumption_history (aggregate by month)
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      await client.query(`INSERT INTO consumption_history (facility_id, medicine_id, quantity_consumed, period_month, period_year, recorded_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (facility_id, medicine_id, period_month, period_year)
        DO UPDATE SET quantity_consumed = consumption_history.quantity_consumed + EXCLUDED.quantity_consumed`,
        [facility_id, medicine_id, quantity, month, year]);

      // Insert into deliveries/dispense log table (optional)
      const deliveryNumber = `DISPENSE-${Date.now()}`;
      await client.query(`INSERT INTO deliveries (delivery_number, origin_facility_id, destination_facility_id, status, created_at)
        VALUES ($1, $2, $2, 'COMPLETED', NOW())`, [deliveryNumber, facility_id, facility_id]);

      return { dispensed: quantity, currentQty: currentQty - quantity };
    });

    // Trigger AI module to recompute/persist forecasts (async, don't block)
    (async () => {
      try {
        await axios.post(`${process.env.AI_MODULE_URL}/forecast/save?months_ahead=3`);
      } catch (e) {
        console.error('AI trigger error:', e.message);
      }
    })();

    // Send notification if low stock
    try {
      const low = await query('SELECT i.quantity, m.reorder_level, m.safety_stock, m.name FROM inventory i JOIN medicines m ON i.medicine_id = m.id WHERE i.facility_id = $1 AND i.medicine_id = $2', [req.user.facility_id, medicine_id]);
      const row = low.rows[0];
      if (row && Number(row.quantity) <= Number(row.safety_stock)) {
        await notifService.emitNotification({ facility_id: req.user.facility_id, type: 'CRITICAL_STOCK', title: 'Critical stock alert', message: `${row.name} is below safety stock (${row.quantity})` });
      } else if (row && Number(row.quantity) <= Number(row.reorder_level)) {
        await notifService.emitNotification({ facility_id: req.user.facility_id, type: 'LOW_STOCK', title: 'Low stock alert', message: `${row.name} is low (${row.quantity})` });
      }

      if (row) {
        const depletion = await getPredictedDepletion(req.user.facility_id, medicine_id, Number(row.quantity));
        if (depletion) {
          await notifService.emitNotification({
            facility_id: req.user.facility_id,
            type: 'PREDICTED_DEPLETION',
            title: '🧠 Predicted depletion alert',
            message: `${depletion.medicine_name} is forecasted to require ${depletion.predicted_total} units over the next 3 months, exceeding current stock plus safety buffer.`,
            priority: 'HIGH'
          });
        }
      }
    } catch (e) { console.error('Notification error', e.message); }

    res.json({ message: 'Dispensed', result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

module.exports = { getInventory, getLowStock, getExpiringBatches, addBatch, scanQR, getBatches, dispense };
