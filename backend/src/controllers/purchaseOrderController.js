const { query, withTransaction } = require('../config/db');
const { emitNotification } = require('../services/notificationService');
const { v4: uuidv4 } = require('uuid');

const generatePONumber = () => `PO-${Date.now()}`;

const createPO = async (req, res) => {
  const { supplier_id, items, expected_delivery, notes } = req.body;
  try {
    const po = await withTransaction(async (client) => {
      const total = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
      const poNum = generatePONumber();
      const poId = uuidv4();
      await client.query(
        `INSERT INTO purchase_orders (id, po_number, warehouse_id, supplier_id, total_amount, created_by, expected_delivery, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [poId, poNum, req.user.facility_id, supplier_id, total, req.user.id, expected_delivery || null, notes || null]
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO purchase_order_items (id, po_id, medicine_id, quantity, unit_price, total_price) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5)`,
          [poId, item.medicine_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
        );
      }
      return { id: poId, po_number: poNum, total_amount: total };
    });

    await emitNotification({
      facility_id: supplier_id,
      type: 'NEW_PURCHASE_ORDER',
      title: '📦 New Purchase Order',
      message: `Purchase Order ${po.po_number} received. Total: ${po.total_amount} RWF`,
      reference_id: po.id,
      reference_type: 'purchase_order'
    });

    res.status(201).json({ data: po });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const updatePOStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  try {
    let sql = 'UPDATE purchase_orders SET status = $2, notes = COALESCE($3, notes)';
    const params = [status, notes || null];
    if (status === 'ACCEPTED') { sql += ', accepted_at = NOW()'; }
    if (status === 'DELIVERED') { sql += ', delivered_at = NOW()'; }
    sql += ' WHERE id = $1';
    await query(sql, [id, ...params]);

    const result = await query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    const po = result.rows[0];

    const notifType  = status === 'ACCEPTED' ? 'SUPPLIER_ACCEPTED' : status === 'REJECTED' ? 'SUPPLIER_REJECTED' : 'PO_UPDATE';
    const notifTitle = status === 'ACCEPTED' ? '✅ Supplier Accepted Order' : status === 'REJECTED' ? '❌ Supplier Rejected Order' : 'Order Update';

    await emitNotification({
      facility_id: po.warehouse_id,
      type: notifType,
      title: notifTitle,
      message: `Purchase Order ${po.po_number} status: ${status}`,
      reference_id: id,
      reference_type: 'purchase_order'
    });

    res.json({ data: po });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getPOs = async (req, res) => {
  const { status, supplier_id, warehouse_id } = req.query;
  try {
    let sql = `
      SELECT po.*, s.name as supplier_name, w.name as warehouse_name, u.name as created_by_name,
             COALESCE(
               json_agg(json_build_object(
                 'medicine_id', poi.medicine_id, 'medicine_name', m.name,
                 'quantity', poi.quantity, 'unit_price', poi.unit_price, 'total_price', poi.total_price
               )) FILTER (WHERE poi.id IS NOT NULL),
               '[]'::json
             ) as items
      FROM purchase_orders po
      JOIN facilities s ON po.supplier_id = s.id
      JOIN facilities w ON po.warehouse_id = w.id
      JOIN users u ON po.created_by = u.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
      LEFT JOIN medicines m ON poi.medicine_id = m.id
      WHERE 1=1`;
    const params = [];
    if (status)      { params.push(status);      sql += ` AND po.status = $${params.length}`; }
    if (supplier_id) { params.push(supplier_id); sql += ` AND po.supplier_id = $${params.length}`; }
    if (warehouse_id){ params.push(warehouse_id);sql += ` AND po.warehouse_id = $${params.length}`; }
    sql += ' GROUP BY po.id, s.name, w.name, u.name ORDER BY po.created_at DESC';
    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getSupplierPerformance = async (req, res) => {
  try {
    const result = await query(`
      SELECT f.id, f.name as supplier_name,
             COUNT(po.id) as total_orders,
             SUM(CASE WHEN po.status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered_orders,
             AVG(sp.quality_score) as avg_quality_score,
             AVG(CASE WHEN sp.on_time_delivery = true THEN 1 ELSE 0 END) * 100 as on_time_rate,
             AVG(sp.delivery_days) as avg_delivery_days
      FROM facilities f
      LEFT JOIN purchase_orders po ON f.id = po.supplier_id
      LEFT JOIN supplier_performance sp ON f.id = sp.supplier_id
      WHERE f.type = 'SUPPLIER'
      GROUP BY f.id, f.name
      ORDER BY on_time_rate DESC`);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { createPO, updatePOStatus, getPOs, getSupplierPerformance };
