const User = require('../models/User');
const Note = require('../models/Note');
const { stats } = require('../events/eventEmitter');

// GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  const [totalUsers, totalNotes] = await Promise.all([User.countDocuments(), Note.countDocuments()]);
  res.json({
    message: 'Welcome to the admin area',
    admin: req.user.username,
    totalUsers,
    totalNotes,
    events: stats, // counters maintained by the EventEmitter listeners
    serverTime: new Date().toISOString()
  });
};

// GET /api/admin/users
const listUsers = async (req, res) => {
  res.json(await User.find().sort({ createdAt: 1 }));
};

module.exports = { getDashboard, listUsers };
