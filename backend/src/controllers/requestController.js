const { query, withTransaction } = require('../config/db');
const { emitNotification } = require('../services/notificationService');
const { v4: uuidv4 } = require('uuid');

const generateRequestNumber = () => `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const generatePONumber = () => `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const createRequest = async (req, res) => {
  const { items, priority = 'NORMAL', notes, approving_facility_id } = req.body;
  try {
    const request = await withTransaction(async (client) => {
      const reqNum = generateRequestNumber();
      const reqId = uuidv4();
      await client.query(
        `INSERT INTO medicine_requests (id, request_number, requesting_facility_id, approving_facility_id, priority, requested_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [reqId, reqNum, req.user.facility_id, approving_facility_id, priority, req.user.id, notes || null]
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO medicine_request_items (id, request_id, medicine_id, requested_quantity, unit_price) VALUES (gen_random_uuid(),$1,$2,$3,$4)`,
          [reqId, item.medicine_id, item.quantity, item.unit_price || 0]
        );
      }
      return { id: reqId, request_number: reqNum };
    });

    await emitNotification({
      facility_id: approving_facility_id,
      type: priority === 'EMERGENCY' ? 'EMERGENCY_REQUEST' : 'NEW_REQUEST',
      title: priority === 'EMERGENCY' ? '🚨 Emergency Medicine Request' : 'New Medicine Request',
      message: `Request ${request.request_number} from facility requires review`,
      priority,
      reference_id: request.id,
      reference_type: 'medicine_request'
    });

    res.status(201).json({ data: request });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getRequests = async (req, res) => {
  const { status, priority, facility_id } = req.query;
  try {
    let sql = `
      SELECT mr.*,
             rf.name as requesting_facility_name, rf.type as requesting_facility_type,
             af.name as approving_facility_name,
             u.name as requested_by_name,
             COALESCE(
               json_agg(json_build_object(
                 'medicine_id', mri.medicine_id, 'medicine_name', m.name, 'unit', m.unit,
                 'requested_quantity', mri.requested_quantity, 'approved_quantity', mri.approved_quantity
               )) FILTER (WHERE mri.id IS NOT NULL),
               '[]'::json
             ) as items
      FROM medicine_requests mr
      JOIN facilities rf ON mr.requesting_facility_id = rf.id
      LEFT JOIN facilities af ON mr.approving_facility_id = af.id
      JOIN users u ON mr.requested_by = u.id
      LEFT JOIN medicine_request_items mri ON mr.id = mri.request_id
      LEFT JOIN medicines m ON mri.medicine_id = m.id
      WHERE 1=1`;
    const params = [];
    if (status)   { params.push(status);   sql += ` AND mr.status = $${params.length}`; }
    if (priority) { params.push(priority); sql += ` AND mr.priority = $${params.length}`; }
    if (facility_id) {
      params.push(facility_id, facility_id);
      sql += ` AND (mr.requesting_facility_id = $${params.length-1} OR mr.approving_facility_id = $${params.length})`;
    }
    sql += ' GROUP BY mr.id, rf.name, rf.type, af.name, u.name ORDER BY mr.created_at DESC';
    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const approveRequest = async (req, res) => {
  const { id } = req.params;
  const { approved_items, notes } = req.body;
  try {
    await withTransaction(async (client) => {
      await client.query(
        'UPDATE medicine_requests SET status = $1, approved_by = $2, approved_at = NOW(), notes = $3 WHERE id = $4',
        ['APPROVED', req.user.id, notes || null, id]
      );
      for (const item of (approved_items || [])) {
        await client.query(
          'UPDATE medicine_request_items SET approved_quantity = $1 WHERE request_id = $2 AND medicine_id = $3',
          [item.approved_quantity, id, item.medicine_id]
        );
      }
    });

    const req_data = await query('SELECT * FROM medicine_requests WHERE id = $1', [id]);
    await emitNotification({
      facility_id: req_data.rows[0].requesting_facility_id,
      type: 'REQUEST_APPROVED',
      title: '✅ Request Approved',
      message: 'Your medicine request has been approved',
      reference_id: id,
      reference_type: 'medicine_request'
    });

    res.json({ message: 'Request approved' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const rejectRequest = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  try {
    await query('UPDATE medicine_requests SET status = $1, approved_by = $2, approved_at = NOW(), notes = $3 WHERE id = $4',
      ['REJECTED', req.user.id, notes || null, id]);

    const req_data = await query('SELECT * FROM medicine_requests WHERE id = $1', [id]);
    await emitNotification({
      facility_id: req_data.rows[0].requesting_facility_id,
      type: 'REQUEST_REJECTED',
      title: '❌ Request Rejected',
      message: `Your medicine request was rejected. Reason: ${notes}`,
      reference_id: id,
      reference_type: 'medicine_request'
    });

    res.json({ message: 'Request rejected' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const createPOFromRequest = async (req, res) => {
  const { id } = req.params;
  const { supplier_id, expected_delivery, notes } = req.body;
  try {
    const requestResult = await query('SELECT * FROM medicine_requests WHERE id = $1', [id]);
    const request = requestResult.rows[0];
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'APPROVED') return res.status(400).json({ error: 'Request must be approved before creating a purchase order' });

    const itemResult = await query(
      `SELECT mri.*, m.name as medicine_name
       FROM medicine_request_items mri
       JOIN medicines m ON mri.medicine_id = m.id
       WHERE mri.request_id = $1 AND mri.approved_quantity IS NOT NULL AND mri.approved_quantity > 0`,
      [id]
    );
    if (!itemResult.rows.length) return res.status(400).json({ error: 'No approved items available to create a purchase order' });

    const po = await withTransaction(async (client) => {
      const total = itemResult.rows.reduce((sum, item) => sum + (item.approved_quantity * item.unit_price), 0);
      const poId = uuidv4();
      const poNum = generatePONumber();
      await client.query(
        `INSERT INTO purchase_orders (id, po_number, warehouse_id, supplier_id, total_amount, created_by, expected_delivery, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [poId, poNum, req.user.facility_id, supplier_id, total, req.user.id, expected_delivery || null, notes || null]
      );
      for (const item of itemResult.rows) {
        await client.query(
          `INSERT INTO purchase_order_items (id, po_id, medicine_id, quantity, unit_price, total_price) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5)`,
          [poId, item.medicine_id, item.approved_quantity, item.unit_price, item.approved_quantity * item.unit_price]
        );
      }
      await client.query('UPDATE medicine_requests SET status = $1, fulfilled_at = NOW() WHERE id = $2', ['PO_CREATED', id]);
      return { id: poId, po_number: poNum, total_amount: total };
    });

    await emitNotification({
      facility_id: supplier_id,
      type: 'NEW_PURCHASE_ORDER',
      title: '📦 New Purchase Order',
      message: `Purchase order ${po.po_number} created from request ${request.request_number}`,
      reference_id: po.id,
      reference_type: 'purchase_order'
    });

    await emitNotification({
      facility_id: request.requesting_facility_id,
      type: 'REQUEST_PO_CREATED',
      title: '📄 Purchase Order Created',
      message: `A purchase order ${po.po_number} has been generated from your approved request.`,
      reference_id: po.id,
      reference_type: 'purchase_order'
    });

    res.status(201).json({ data: po });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { createRequest, getRequests, approveRequest, rejectRequest, createPOFromRequest };
