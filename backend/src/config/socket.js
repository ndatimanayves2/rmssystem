const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`user_${id}`);
    if (socket.handshake.query.facility_id) socket.join(`facility_${socket.handshake.query.facility_id}`);
    if (role === 'MOH_ADMIN') socket.join('moh_admin');
    if (role === 'DRIVER') socket.join('drivers');

    socket.on('join_facility', (facilityId) => socket.join(`facility_${facilityId}`));
    socket.on('disconnect', () => {});
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
