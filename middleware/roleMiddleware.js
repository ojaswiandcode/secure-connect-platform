// Role-Based Access Control: authorizeRoles('admin') allows only admins.
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied: requires role [${allowedRoles.join(', ')}]`
    });
  }
  next();
};

module.exports = authorizeRoles;
