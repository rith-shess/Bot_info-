const fs = require('fs');
const backupService = require('../services/backupService');

const backupController = {
  download(req, res) {
    try {
      const { buffer } = backupService.createBackup();
      const stamp = new Date().toISOString().slice(0, 10);
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="catalog-backup-${stamp}.zip"`,
        'Content-Length': buffer.length
      });
      return res.send(buffer);
    } catch (error) {
      console.error('Backup error:', error);
      return res.status(500).json({ success: false, message: 'Could not create the backup: ' + error.message });
    }
  },

  restore(req, res) {
    const tmpFile = req.file && req.file.path;
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please choose a backup .zip file.' });
      }
      const summary = backupService.restoreBackup(fs.readFileSync(tmpFile));
      console.log('[Backup] Restored:', JSON.stringify(summary));
      return res.json({
        success: true,
        message: `Backup restored: ${summary.products} products, ${summary.categories} categories, ${summary.images} pictures.`,
        data: summary
      });
    } catch (error) {
      console.error('Restore error:', error.message);
      return res.status(error.status || 500).json({ success: false, message: 'Restore failed: ' + error.message });
    } finally {
      if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ } }
    }
  }
};

module.exports = backupController;
