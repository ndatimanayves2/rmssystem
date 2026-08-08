const { query } = require('../config/db');
let io;

const setIO = (socketIO) => { io = socketIO; };
const getIO = () => io;

const emitNotification = async ({ user_id, facility_id, type, title, message, priority = 'NORMAL', reference_id, reference_type }) => {
  try {
    // Save to DB
    const result = await query(
      `INSERT INTO notifications (user_id, facility_id, type, title, message, priority, reference_id, reference_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [user_id || null, facility_id || null, type, title, message, priority, reference_id || null, reference_type || null]
    );

    // Emit via WebSocket
    if (io) {
      const notification = result.rows[0];
      if (facility_id) io.to(`facility_${facility_id}`).emit('notification', notification);
      if (user_id) io.to(`user_${user_id}`).emit('notification', notification);
      io.to('moh_admin').emit('notification', notification); // MOH always gets all
    }

    return result.rows[0];
  } catch (e) {
    console.error('Notification error:', e.message);
  }
};

const getNotifications = async (req, res) => {
  const { unread_only } = req.query;
  try {
    let sql = 'SELECT * FROM notifications WHERE (user_id = $1 OR facility_id = $2)';
    const params = [req.user.id, req.user.facility_id];
    if (unread_only === 'true') sql += ' AND is_read = false';
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const markRead = async (req, res) => {
  const { id } = req.params;
  try {
    await query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    res.json({ message: 'Marked as read' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1 OR facility_id = $2', [req.user.id, req.user.facility_id]);
    res.json({ message: 'All marked as read' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { emitNotification, setIO, getIO, getNotifications, markRead, markAllRead };
