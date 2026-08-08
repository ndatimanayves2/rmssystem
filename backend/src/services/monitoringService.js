const { query } = require('../config/db');
const { emitNotification } = require('./notificationService');

const checkExpiryAlerts = async () => {
  try {
    const thresholds = [
      { days: 180, type: 'EXPIRY_180_DAYS', title: '⚠️ Expiry Alert: 6 Months' },
      { days: 90,  type: 'EXPIRY_90_DAYS',  title: '⚠️ Expiry Alert: 3 Months' },
      { days: 60,  type: 'EXPIRY_60_DAYS',  title: '🔶 Expiry Alert: 2 Months' },
      { days: 30,  type: 'EXPIRY_30_DAYS',  title: '🔴 Expiry Alert: 1 Month' },
    ];

    for (const threshold of thresholds) {
const result = await query(`
        SELECT sb.id, sb.batch_number, sb.expiry_date, sb.remaining_quantity, sb.facility_id,
               m.name as medicine_name, (CURRENT_DATE - sb.expiry_date::date) as days_remaining
        FROM stock_batches sb JOIN medicines m ON sb.medicine_id = m.id
        WHERE sb.status = 'ACTIVE'
          AND sb.expiry_date = CURRENT_DATE + ($1 || ' days')::interval`, [threshold.days]);

      for (const batch of result.rows) {
        await emitNotification({
          facility_id: batch.facility_id,
          type: threshold.type,
          title: threshold.title,
          message: `${batch.medicine_name} - Batch ${batch.batch_number}: ${batch.days_remaining} days remaining. Qty: ${batch.remaining_quantity}`,
          priority: threshold.days <= 30 ? 'HIGH' : 'NORMAL',
          reference_id: batch.id,
          reference_type: 'stock_batch'
        });
      }
    }

await query(`UPDATE stock_batches SET status = 'EXPIRED' WHERE expiry_date < CURRENT_DATE AND status = 'ACTIVE'`);
    console.log(`[${new Date().toISOString()}] Expiry check completed`);
  } catch (e) {
    console.error('Expiry check error:', e.message);
  }
};

const checkLowStockAlerts = async () => {
  try {
    const result = await query(`
      SELECT i.facility_id, i.medicine_id, i.quantity, m.name as medicine_name,
             m.reorder_level, m.safety_stock, f.name as facility_name
      FROM inventory i JOIN medicines m ON i.medicine_id = m.id JOIN facilities f ON i.facility_id = f.id
      WHERE i.quantity <= m.reorder_level`);

    for (const item of result.rows) {
      const type  = item.quantity <= 0 ? 'OUT_OF_STOCK' : item.quantity <= item.safety_stock ? 'CRITICAL_STOCK' : 'LOW_STOCK';
      const title = item.quantity <= 0 ? '🚨 Out of Stock' : item.quantity <= item.safety_stock ? '🔴 Critical Stock' : '🟡 Low Stock';
      await emitNotification({
        facility_id: item.facility_id,
        type, title,
        message: `${item.medicine_name} at ${item.facility_name}: ${item.quantity} remaining (Reorder level: ${item.reorder_level})`,
        priority: item.quantity <= 0 ? 'HIGH' : 'NORMAL',
        reference_type: 'inventory'
      });
    }
    console.log(`[${new Date().toISOString()}] Low stock check completed`);
  } catch (e) {
    console.error('Low stock check error:', e.message);
  }
};

const startMonitoring = () => {
  const DAILY = 24 * 60 * 60 * 1000;
  checkExpiryAlerts();
  checkLowStockAlerts();
  setInterval(checkExpiryAlerts, DAILY);
  setInterval(checkLowStockAlerts, DAILY);
  console.log('Monitoring service started');
};

module.exports = { startMonitoring, checkExpiryAlerts, checkLowStockAlerts };
