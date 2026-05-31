const express = require('express');

const { dashboard } = require('../controllers/studentController');
const requireAuth = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/dashboard', requireAuth, asyncHandler(dashboard));

module.exports = router;
