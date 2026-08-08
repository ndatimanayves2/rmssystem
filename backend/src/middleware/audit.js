const { query } = require('../config/db');

const auditLog = (action, tableName) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode < 400 && req.user) {
      await query(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.user.id, action, tableName, data?.data?.id || null, JSON.stringify(req.body), req.ip]
      ).catch(() => {});
    }
    return originalJson(data);
  };
  next();
};

module.exports = { auditLog };
