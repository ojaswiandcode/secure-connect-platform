const User = require('../models/User');
const { verifyToken, tokenFromHeaders } = require('../utils/token');

// Protects a route: requires a valid JWT of a user that still exists.
const authenticateToken = async (req, res, next) => {
  const token = tokenFromHeaders(req.headers);
  if (!token) return res.status(403).json({ message: 'No token provided' });

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const user = await User.findById(payload.id).select('-password');
  if (!user) return res.status(401).json({ message: 'User no longer exists' });

  req.user = user;
  next();
};

module.exports = authenticateToken;
