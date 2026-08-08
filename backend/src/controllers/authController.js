const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { query } = require('../config/db');

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await query(
      'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1 AND u.is_active = true',
      [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid credentials' });

    if (user.two_fa_enabled) return res.json({ requires2FA: true, userId: user.id });

    const token = jwt.sign({ id: user.id, role: user.role_name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role_name, facilityId: user.facility_id } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const verify2FA = async (req, res) => {
  const { userId, token } = req.body;
  try {
    const result = await query('SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const verified = speakeasy.totp.verify({ secret: user.two_fa_secret, encoding: 'base32', token, window: 2 });
    if (!verified) return res.status(401).json({ error: 'Invalid 2FA token' });

    const jwtToken = jwt.sign({ id: user.id, role: user.role_name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ token: jwtToken, user: { id: user.id, name: user.name, email: user.email, role: user.role_name, facilityId: user.facility_id } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const setup2FA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `MedSupply:${req.user.email}` });
    await query('UPDATE users SET two_fa_secret = $1 WHERE id = $2', [secret.base32, req.user.id]);
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qrCode, secret: secret.base32 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const enable2FA = async (req, res) => {
  const { token } = req.body;
  try {
    const result = await query('SELECT two_fa_secret FROM users WHERE id = $1', [req.user.id]);
    const verified = speakeasy.totp.verify({ secret: result.rows[0].two_fa_secret, encoding: 'base32', token, window: 2 });
    if (!verified) return res.status(400).json({ error: 'Invalid token' });
    await query('UPDATE users SET two_fa_enabled = true WHERE id = $1', [req.user.id]);
    res.json({ message: '2FA enabled successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const disable2FA = async (req, res) => {
  try {
    await query('UPDATE users SET two_fa_enabled = false, two_fa_secret = NULL WHERE id = $1', [req.user.id]);
    res.json({ message: '2FA disabled successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const register = async (req, res) => {
  const { name, email, phone, password, role_id, facility_id } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const id = require('uuid').v4();
    await query(
      'INSERT INTO users (id, name, email, phone, password_hash, role_id, facility_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, name, email, phone, hash, role_id, facility_id || null]
    );
    res.status(201).json({ data: { id, name, email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getProfile = async (req, res) => {
  const { password_hash, two_fa_secret, ...user } = req.user;
  res.json({ data: user });
};

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  try {
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { login, verify2FA, setup2FA, enable2FA, disable2FA, register, getProfile, changePassword };
