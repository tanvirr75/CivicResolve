const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Core Engine connected to Client: ${socket.id}`);

    // Join a private room unique to their user ID (for RBAC target emits later)
    socket.on('joinRoom', (userId) => {
      socket.join(userId);
      console.log(`[Socket.io] Client ${socket.id} subscribed to Private Room: ${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
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
