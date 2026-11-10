const settingsService = require('../services/settingsService');

const settingsController = {
  get(req, res) {
    try {
      const settings = settingsService.getSettings();
      return res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve settings.'
      });
    }
  },

  update(req, res) {
    try {
      const updated = settingsService.updateSettings(req.body);
      return res.json({
        success: true,
        message: 'Settings updated successfully.',
        data: updated
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save settings.'
      });
    }
  }
};

module.exports = settingsController;
