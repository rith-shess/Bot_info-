const productService = require('../services/productService');
const telegramBot = require('../telegram/bot');

const dashboardController = {
  getStats(req, res) {
    try {
      const stats = productService.getDashboardStats();
      const botStatus = telegramBot.getStatus();

      return res.json({
        success: true,
        data: {
          ...stats,
          botStatus
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard statistics.'
      });
    }
  }
};

module.exports = dashboardController;
