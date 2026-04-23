const socketIo = require('socket.io');
const logger   = require('../utils/logger');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`[Socket.io] Client connected: ${socket.id}`);

    // Join a private room unique to their user ID (for RBAC target emits later)
    socket.on('joinRoom', (userId) => {
      socket.join(userId);
      logger.info(`[Socket.io] Client ${socket.id} joined room: ${userId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io Core Engine has not been initialized!');
  }
  return io;
};

module.exports = { initSocket, getIo };
