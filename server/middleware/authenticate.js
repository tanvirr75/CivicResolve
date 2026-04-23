const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * authenticate — verifies the JWT Bearer token on every protected route.
 * Attaches the full user document (minus passwordHash) to req.user.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided. Authorization denied.',
      data: null,
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-fetch user so we always have the latest role / isActive state
    const user = await User.findById(decoded.id).select('-passwordHash').lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
        data: null,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.',
        data: null,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token has expired. Please log in again.'
        : 'Invalid token. Authorization denied.';

    return res.status(401).json({ success: false, message, data: null });
  }
};

/**
 * authorize — role-based access control factory.
 * Usage: router.get('/admin', authenticate, authorize('system_admin'), handler)
 *        router.get('/ward',  authenticate, authorize('ward_official', 'system_admin'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}.`,
        data: null,
      });
    }
    next();
  };
};

/**
 * optionalAuthenticate — non-blocking JWT check.
 * Attaches req.user if a valid Bearer token is present.
 * Silently continues (does NOT reject) if no token or token is invalid.
 * Use on public routes that need role-aware behaviour when a user is logged in.
 *
 * Example: GET /api/reports (public heatmap) — but auto-scopes results
 * by wardId when called by a ward_official.
 */
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-passwordHash').lean();
    if (user && user.isActive) req.user = user;
  } catch {
    // Invalid / expired token — just continue as unauthenticated
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuthenticate };
