const { query } = require('../config/db');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const getDashboardStats = async (req, res) => {
  try {
    const [facilities, lowStock, expiring, activeDeliveries, pendingRequests, totalMedicines] = await Promise.all([
      query('SELECT type, COUNT(*) as count FROM facilities WHERE is_active = true GROUP BY type'),
      query('SELECT COUNT(*) as count FROM inventory i JOIN medicines m ON i.medicine_id = m.id WHERE i.quantity <= m.reorder_level'),
      query("SELECT COUNT(*) as count FROM stock_batches WHERE status = 'ACTIVE' AND expiry_date <= CURRENT_DATE + INTERVAL '90 days'"),
      query("SELECT COUNT(*) as count FROM deliveries WHERE status = 'IN_TRANSIT'"),
      query("SELECT COUNT(*) as count FROM medicine_requests WHERE status = 'PENDING'"),
      query('SELECT COUNT(*) as count FROM medicines WHERE is_active = true')
    ]);

    res.json({
      data: {
        facilities: facilities.rows,
        low_stock_count: parseInt(lowStock.rows[0].count),
        expiring_soon_count: parseInt(expiring.rows[0].count),
        active_deliveries: parseInt(activeDeliveries.rows[0].count),
        pending_requests: parseInt(pendingRequests.rows[0].count),
        total_medicines: parseInt(totalMedicines.rows[0].count)
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getConsumptionReport = async (req, res) => {
  const { facility_id, year, month } = req.query;
  try {
    let sql = `
      SELECT ch.*, m.name as medicine_name, m.unit, f.name as facility_name
      FROM consumption_history ch
      JOIN medicines m ON ch.medicine_id = m.id
      JOIN facilities f ON ch.facility_id = f.id
      WHERE 1=1`;
    const params = [];
    if (facility_id) { params.push(facility_id); sql += ` AND ch.facility_id = $${params.length}`; }
    if (year)        { params.push(year);         sql += ` AND ch.period_year = $${params.length}`; }
    if (month)       { params.push(month);        sql += ` AND ch.period_month = $${params.length}`; }
    sql += ' ORDER BY ch.period_year DESC, ch.period_month DESC, m.name';
    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getFacilitiesMap = async (req, res) => {
  try {
    const result = await query(`
      SELECT f.*, d.name as district_name, p.name as province_name,
             COALESCE(
               json_agg(json_build_object(
                 'medicine_id', i.medicine_id, 'medicine_name', m.name,
                 'quantity', i.quantity, 'reorder_level', m.reorder_level,
                 'status', CASE WHEN i.quantity <= 0 THEN 'OUT_OF_STOCK'
                                WHEN i.quantity <= m.safety_stock THEN 'CRITICAL'
                                WHEN i.quantity <= m.reorder_level THEN 'LOW' ELSE 'ADEQUATE' END
               )) FILTER (WHERE i.medicine_id IS NOT NULL),
               '[]'::json
             ) as inventory_summary
      FROM facilities f
      LEFT JOIN districts d ON f.district_id = d.id
      LEFT JOIN provinces p ON d.province_id = p.id
      LEFT JOIN inventory i ON f.id = i.facility_id
      LEFT JOIN medicines m ON i.medicine_id = m.id
      WHERE f.is_active = true AND f.latitude IS NOT NULL
      GROUP BY f.id, d.name, p.name
      ORDER BY f.type, f.name`);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const exportPDF = async (req, res) => {
  const { type } = req.params;
  try {
    let data, title;
    if (type === 'inventory') {
      const result = await query(`
        SELECT f.name as facility, m.name as medicine, m.unit, i.quantity, m.reorder_level,
               CASE WHEN i.quantity <= 0 THEN 'OUT OF STOCK' WHEN i.quantity <= m.reorder_level THEN 'LOW' ELSE 'ADEQUATE' END as status
        FROM inventory i JOIN medicines m ON i.medicine_id = m.id JOIN facilities f ON i.facility_id = f.id
        ORDER BY f.name, m.name`);
      data = result.rows; title = 'National Inventory Report';
    } else if (type === 'expiry') {
      const result = await query(`
        SELECT m.name as medicine, sb.batch_number, sb.expiry_date, sb.remaining_quantity, m.unit, f.name as facility,
               (CURRENT_DATE - sb.expiry_date::date) as days_remaining
        FROM stock_batches sb JOIN medicines m ON sb.medicine_id = m.id JOIN facilities f ON sb.facility_id = f.id
        WHERE sb.status = 'ACTIVE' AND sb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
        ORDER BY sb.expiry_date ASC`);
      data = result.rows; title = 'Expiry Alert Report';
    }

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${Date.now()}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).text(title, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]);
      let y = doc.y;
      headers.forEach((h, i) => doc.fontSize(9).text(h.toUpperCase(), 40 + i * 80, y, { width: 75 }));
      doc.moveDown(0.5);
      data.slice(0, 100).forEach(row => {
        y = doc.y;
        if (y > 700) { doc.addPage(); y = 40; }
        headers.forEach((h, i) => doc.fontSize(8).text(String(row[h] || ''), 40 + i * 80, y, { width: 75 }));
        doc.moveDown(0.3);
      });
    }
    doc.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const exportExcel = async (req, res) => {
  const { type } = req.params;
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');
    if (type === 'inventory') {
      const result = await query(`
        SELECT f.name as "Facility", m.name as "Medicine", m.unit as "Unit", i.quantity as "Quantity",
               m.reorder_level as "Reorder Level", m.safety_stock as "Safety Stock",
               CASE WHEN i.quantity <= 0 THEN 'OUT OF STOCK' WHEN i.quantity <= m.reorder_level THEN 'LOW' ELSE 'ADEQUATE' END as "Status"
        FROM inventory i JOIN medicines m ON i.medicine_id = m.id JOIN facilities f ON i.facility_id = f.id
        ORDER BY f.name, m.name`);
      if (result.rows.length > 0) {
        sheet.columns = Object.keys(result.rows[0]).map(k => ({ header: k, key: k, width: 20 }));
        sheet.addRows(result.rows);
      }
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const recordConsumption = async (req, res) => {
  const { facility_id, medicine_id, quantity_consumed, period_month, period_year } = req.body;
  try {
    await query(
      `INSERT INTO consumption_history (facility_id, medicine_id, quantity_consumed, period_month, period_year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (facility_id, medicine_id, period_month, period_year)
       DO UPDATE SET quantity_consumed = consumption_history.quantity_consumed + EXCLUDED.quantity_consumed`,
      [facility_id || req.user.facility_id, medicine_id, quantity_consumed, period_month, period_year]
    );
    res.json({ message: 'Consumption recorded' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { getDashboardStats, getConsumptionReport, getFacilitiesMap, exportPDF, exportExcel, recordConsumption };
