const jwt = require('jsonwebtoken');
const { parseCookies } = require('./cookies');

const signToken = (user) =>
  jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

// Looks for "Authorization: Bearer <token>" first, then a "token" cookie.
// Works for both HTTP requests and Socket.IO handshakes.
const tokenFromHeaders = (headers) => {
  const auth = headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7).trim() || null;
  return parseCookies(headers.cookie).token || null;
};

module.exports = { signToken, verifyToken, tokenFromHeaders };
