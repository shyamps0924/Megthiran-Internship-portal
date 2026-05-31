const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { authenticateStudent } = require('../services/studentService');
const logger = require('../utils/logger');

async function login(req, res) {
  const internId = String(req.body.internId || '').trim().toUpperCase();
  const password = String(req.body.password || '').trim();
  const packageSelected = String(req.body.packageSelected || req.body.package || '').trim();
  const studentName = String(req.body.studentName || req.body.name || '').trim();

  if (!internId || !password) {
    return res.status(400).json({
      success: false,
      message: 'Intern ID and password are required.',
    });
  }

  const student = await authenticateStudent(internId, password, {
    packageSelected,
    studentName,
  });
  logger.info('Student login succeeded.', { internId });

  const token = jwt.sign(
    {
      internId: student.internId,
      name: student.name,
      rowNumber: student.rowNumber,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );

  return res.json({
    success: true,
    message: 'Login successful',
    token,
    student,
  });
}

module.exports = {
  login,
};
