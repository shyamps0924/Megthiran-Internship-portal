const { getDashboardData } = require('../services/studentService');

async function dashboard(req, res) {
  const data = await getDashboardData({
    internId: req.user.internId,
    rowNumber: req.user.rowNumber,
  });
  res.json(data);
}

module.exports = {
  dashboard,
};
