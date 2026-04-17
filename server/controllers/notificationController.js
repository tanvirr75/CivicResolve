const Notification = require('../models/Notification');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get user's notification history
// @route   GET /api/notifications
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved systematically.',
      data: { notifications }
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Mark a notification as read
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

    return res.status(200).json({ success: true, message: 'Notification read state updated.', data: { notification } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead };
