require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('express-async-errors');

const express  = require('express');
const http     = require('http'); // Node Core HTTP Wrapper
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

// ── Initialize Socket.io ───────────────────────────────────────────────────
const { initSocket } = require('./services/socketService');
initSocket(server);

// ── Connect to MongoDB ─────────────────────────────────────────────────────
connectDB();

// ── Global Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CivicResolve API is running 🚀' });
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/authRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/work-orders', require('./routes/workOrderRoutes'));
app.use('/api/export',  require('./routes/exportRoutes'));
app.use('/api/drafts',  require('./routes/draftRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/share',   require('./routes/shareRoutes'));

// ── Global Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: null,
  });
});

// ── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
