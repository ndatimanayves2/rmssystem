const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { auditLog } = require('../middleware/audit');
const { cache } = require('../middleware/cache');
const authCtrl = require('../controllers/authController');
const invCtrl = require('../controllers/inventoryController');
const reqCtrl = require('../controllers/requestController');
const delCtrl = require('../controllers/deliveryController');
const poCtrl = require('../controllers/purchaseOrderController');
const repCtrl = require('../controllers/reportController');
const notifService = require('../services/notificationService');
const assistantService = require('../services/assistantService');
const { query } = require('../config/db');

// AUTH
router.post('/auth/login', validate(schemas.login), authCtrl.login);
router.post('/auth/verify-2fa', authCtrl.verify2FA);
router.post('/auth/register', authenticate, authorize('MOH_ADMIN'), validate(schemas.register), auditLog('REGISTER_USER', 'users'), authCtrl.register);
router.get('/auth/profile', authenticate, authCtrl.getProfile);
router.put('/auth/change-password', authenticate, validate(schemas.changePassword), authCtrl.changePassword);
router.post('/auth/setup-2fa', authenticate, authCtrl.setup2FA);
router.post('/auth/enable-2fa', authenticate, authCtrl.enable2FA);
router.post('/auth/disable-2fa', authenticate, authCtrl.disable2FA);

// INVENTORY
router.get('/inventory', authenticate, cache(60), invCtrl.getInventory);
router.get('/inventory/low-stock', authenticate, cache(120), invCtrl.getLowStock);
router.get('/inventory/expiring', authenticate, cache(300), invCtrl.getExpiringBatches);
router.get('/inventory/batches', authenticate, cache(60), invCtrl.getBatches);
router.post('/inventory/batches', authenticate, authorize('MOH_ADMIN', 'WAREHOUSE_MANAGER', 'SUPPLIER'), validate(schemas.addBatch), auditLog('ADD_BATCH', 'stock_batches'), invCtrl.addBatch);
router.post('/inventory/scan-qr', authenticate, invCtrl.scanQR);
router.post('/inventory/dispense', authenticate, validate(schemas.dispense), auditLog('DISPENSE_MEDICINE', 'inventory'), invCtrl.dispense);

// MEDICINE REQUESTS
router.get('/requests', authenticate, reqCtrl.getRequests);
router.post('/requests', authenticate, validate(schemas.createRequest), auditLog('CREATE_REQUEST', 'medicine_requests'), reqCtrl.createRequest);
router.put('/requests/:id/approve', authenticate, authorize('MOH_ADMIN', 'WAREHOUSE_MANAGER', 'DISTRICT_HOSPITAL'), auditLog('APPROVE_REQUEST', 'medicine_requests'), reqCtrl.approveRequest);
router.put('/requests/:id/reject', authenticate, authorize('MOH_ADMIN', 'WAREHOUSE_MANAGER', 'DISTRICT_HOSPITAL'), auditLog('REJECT_REQUEST', 'medicine_requests'), reqCtrl.rejectRequest);
router.post('/requests/:id/create-po', authenticate, authorize('MOH_ADMIN', 'WAREHOUSE_MANAGER'), validate(schemas.createPOFromRequest), auditLog('CREATE_PO_FROM_REQUEST', 'purchase_orders'), reqCtrl.createPOFromRequest);

// PURCHASE ORDERS
router.get('/purchase-orders', authenticate, poCtrl.getPOs);
router.post('/purchase-orders', authenticate, authorize('MOH_ADMIN', 'WAREHOUSE_MANAGER'), validate(schemas.createPO), auditLog('CREATE_PO', 'purchase_orders'), poCtrl.createPO);
router.put('/purchase-orders/:id/status', authenticate, auditLog('UPDATE_PO_STATUS', 'purchase_orders'), poCtrl.updatePOStatus);
router.get('/purchase-orders/supplier-performance', authenticate, authorize('MOH_ADMIN', 'WAREHOUSE_MANAGER'), poCtrl.getSupplierPerformance);

// DELIVERIES
router.get('/deliveries', authenticate, delCtrl.getDeliveries);
router.post('/deliveries', authenticate, authorize('MOH_ADMIN', 'WAREHOUSE_MANAGER'), validate(schemas.createDelivery), auditLog('CREATE_DELIVERY', 'deliveries'), delCtrl.createDelivery);
router.put('/deliveries/:id/start', authenticate, authorize('DRIVER', 'WAREHOUSE_MANAGER', 'MOH_ADMIN'), delCtrl.startDelivery);
router.post('/deliveries/:id/gps', authenticate, authorize('DRIVER'), validate(schemas.updateGPS), delCtrl.updateGPS);
router.put('/deliveries/:id/confirm', authenticate, auditLog('CONFIRM_DELIVERY', 'deliveries'), delCtrl.confirmDelivery);
router.get('/deliveries/active-vehicles', authenticate, delCtrl.getActiveVehicles);

// VEHICLES
router.get('/vehicles', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT v.*, u.name as driver_name FROM vehicles v LEFT JOIN users u ON v.driver_id = u.id ORDER BY v.plate_number');
    res.json({ data: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/vehicles', authenticate, authorize('MOH_ADMIN', 'WAREHOUSE_MANAGER'), async (req, res) => {
  const { plate_number, type, capacity_kg, driver_id } = req.body;
  try {
    const result = await query('INSERT INTO vehicles (plate_number, type, capacity_kg, driver_id) VALUES ($1,$2,$3,$4) RETURNING *', [plate_number, type, capacity_kg, driver_id]);
    res.status(201).json({ data: result.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// MEDICINES
router.get('/medicines', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT m.*, mc.name as category FROM medicines m JOIN medicine_categories mc ON m.category_id = mc.id WHERE m.is_active = true ORDER BY m.name');
    res.json({ data: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/medicines', authenticate, authorize('MOH_ADMIN'), async (req, res) => {
  const { name, generic_name, category_id, unit, unit_price, reorder_level, safety_stock, description } = req.body;
  try {
    const result = await query('INSERT INTO medicines (name, generic_name, category_id, unit, unit_price, reorder_level, safety_stock, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, generic_name, category_id, unit, unit_price, reorder_level, safety_stock, description]);
    res.status(201).json({ data: result.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FACILITIES
router.get('/facilities', authenticate, async (req, res) => {
  const { type } = req.query;
  try {
    let sql = 'SELECT f.*, d.name as district_name FROM facilities f LEFT JOIN districts d ON f.district_id = d.id WHERE f.is_active = true';
    const params = [];
    if (type) { params.push(type); sql += ` AND f.type = $${params.length}`; }
    sql += ' ORDER BY f.name';
    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/facilities', authenticate, authorize('MOH_ADMIN'), async (req, res) => {
  const { name, type, district_id, latitude, longitude, contact_phone, contact_email } = req.body;
  try {
    const result = await query('INSERT INTO facilities (name, type, district_id, latitude, longitude, contact_phone, contact_email) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, type, district_id, latitude, longitude, contact_phone, contact_email]);
    res.status(201).json({ data: result.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// REPORTS & DASHBOARD
router.get('/dashboard/stats', authenticate, cache(120), repCtrl.getDashboardStats);
router.get('/reports/consumption', authenticate, cache(300), repCtrl.getConsumptionReport);
router.get('/reports/facilities-map', authenticate, cache(300), repCtrl.getFacilitiesMap);
router.post('/reports/consumption', authenticate, validate(schemas.recordConsumption), repCtrl.recordConsumption);
router.get('/reports/export/pdf/:type', authenticate, repCtrl.exportPDF);
router.get('/reports/export/excel/:type', authenticate, repCtrl.exportExcel);

// NOTIFICATIONS
router.get('/notifications', authenticate, notifService.getNotifications);
router.put('/notifications/:id/read', authenticate, notifService.markRead);
router.put('/notifications/read-all', authenticate, notifService.markAllRead);

// AI FORECASTING (proxy to Python module)
router.get('/ai/forecast', authenticate, async (req, res) => {
  try {
    const axios = require('axios');
    const response = await axios.get(`${process.env.AI_MODULE_URL}/forecast`, { params: req.query });
    res.json(response.data);
  } catch (e) {
    res.status(503).json({ error: 'AI module unavailable', message: e.message });
  }
});

router.get('/ai/recommendations', authenticate, async (req, res) => {
  try {
    const axios = require('axios');
    const response = await axios.get(`${process.env.AI_MODULE_URL}/recommendations`, { params: req.query });
    res.json(response.data);
  } catch (e) {
    res.status(503).json({ error: 'AI module unavailable', message: e.message });
  }
});

// AI ASSISTANT CHATBOT
router.post('/ai/chat', authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const result = await assistantService.processQuestion(message, req.user);
    res.json({ data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/ai/forecasts', authenticate, async (req, res) => {
  const { facility_id } = req.query;
  try {
    const result = await query(
      `SELECT af.*, m.name as medicine_name, m.unit FROM ai_forecasts af JOIN medicines m ON af.medicine_id = m.id
       WHERE af.facility_id = $1 ORDER BY af.forecast_year DESC, af.forecast_month DESC`,
      [facility_id || req.user.facility_id]
    );
    res.json({ data: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DISTRICTS & PROVINCES
router.get('/districts', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT d.*, p.name as province_name FROM districts d JOIN provinces p ON d.province_id = p.id ORDER BY p.name, d.name');
    res.json({ data: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// USERS
router.get('/users', authenticate, authorize('MOH_ADMIN'), async (req, res) => {
  try {
    const result = await query('SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at, r.name as role, f.name as facility FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN facilities f ON u.facility_id = f.id ORDER BY u.name');
    res.json({ data: result.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/toggle-active', authenticate, authorize('MOH_ADMIN'), async (req, res) => {
  try {
    const result = await query('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, name, is_active', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ data: result.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// SUPPLIER PERFORMANCE
router.post('/supplier-performance', authenticate, authorize('MOH_ADMIN', 'WAREHOUSE_MANAGER'), async (req, res) => {
  const { supplier_id, po_id, on_time_delivery, quality_score, delivery_days, notes } = req.body;
  try {
    const result = await query(
      'INSERT INTO supplier_performance (supplier_id, po_id, on_time_delivery, quality_score, delivery_days, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [supplier_id, po_id, on_time_delivery, quality_score, delivery_days, notes]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
