const notFound = (req, res) =>
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// Express 5 forwards errors from async handlers here automatically
const errorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Username or email already exists' });
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error('[Server Error]', err);
  res.status(500).json({ message: 'Internal server error' });
};

module.exports = { notFound, errorHandler };
