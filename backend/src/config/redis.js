const { createClient } = require('redis');

let client = null;
let isReady = false;

const connectRedis = async () => {
  try {
    client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        connectTimeout: 3000,
        reconnectStrategy: false, // disable auto-reconnect
      }
    });

    client.on('error', () => {}); // suppress repeated error logs
    client.on('connect', () => {
      isReady = true;
      console.log('Redis connected');
    });

    await client.connect();
    isReady = true;
  } catch {
    isReady = false;
    client = null;
    console.warn('Redis not available — caching disabled, continuing without it');
  }
};

const getClient = () => (isReady ? client : null);

module.exports = { connectRedis, getClient, get isReady() { return isReady; } };
