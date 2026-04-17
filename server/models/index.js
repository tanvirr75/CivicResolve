const mongoose = require('mongoose');

/**
 * Central export of all Mongoose models.
 * Import from here anywhere in the server: const { User, Report } = require('./models');
 */
const User         = require('./User');
const Report       = require('./Report');
const WardBoundary = require('./WardBoundary');
const WorkOrder    = require('./WorkOrder');
const Notification = require('./Notification');
const OfflineDraft = require('./OfflineDraft');

module.exports = {
  User,
  Report,
  WardBoundary,
  WorkOrder,
  Notification,
  OfflineDraft,
};
