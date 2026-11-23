const express = require('express');
const { getDashboard, listUsers } = require('../controllers/adminController');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin')); // RBAC: admins only

router.get('/dashboard', getDashboard);
router.get('/users', listUsers);

module.exports = router;
