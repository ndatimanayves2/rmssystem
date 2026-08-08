const { getClient } = require('../config/redis');

const cache = (ttlSeconds) => async (req, res, next) => {
  const client = getClient();
  if (!client) return next(); // Redis unavailable — skip cache

  const key = `cache:${req.originalUrl}:${req.user?.facility_id || 'global'}`;
  try {
    const cached = await client.get(key);
    if (cached) return res.json(JSON.parse(cached));

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      client.setEx(key, ttlSeconds, JSON.stringify(data)).catch(() => {});
      return originalJson(data);
    };
    next();
  } catch {
    next();
  }
};

const invalidateCache = (pattern) => async () => {
  const client = getClient();
  if (!client) return;
  try {
    const keys = await client.keys(`cache:*${pattern}*`);
    if (keys.length) await client.del(keys);
  } catch {}
};

module.exports = { cache, invalidateCache };
