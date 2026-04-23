// ─── Notification routes additions ─────────────────────────────────────────
// Add these two routes to the existing notificationRoutes.js
const express = require('express');
const { getNotifications, markAsRead, markAllRead, getUnreadCount } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

router.get('/',              authenticate, getNotifications);
router.get('/unread-count',  authenticate, getUnreadCount);
router.put('/:id/read',      authenticate, markAsRead);
router.put('/read-all',      authenticate, markAllRead);

module.exports = router;
