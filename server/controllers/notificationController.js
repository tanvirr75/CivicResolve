const Notification = require('../models/Notification');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get user's notification history (paginated)
// @route   GET /api/notifications?page=1&limit=20
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10));
    const limit = Math.min(50, parseInt(req.query.limit ?? '20', 10));
    const skip  = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ recipient: req.user._id }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved.',
      data: {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead:    false,
    });
    return res.status(200).json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.', data: null });
    }
    return res.status(200).json({ success: true, message: 'Marked as read.', data: { notification } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Mark ALL notifications as read for this user
// @route   PUT /api/notifications/read-all
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read.`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllRead, getUnreadCount };
