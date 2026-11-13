const express = require('express');
const os = require('os');
const multer = require('multer');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { requireAuth } = require('../middleware/auth');

// Backup files are uploaded to the temp folder (up to 300MB) and removed after the restore
const uploadBackup = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 300 * 1024 * 1024, files: 1 }
});

router.get('/download', requireAuth, backupController.download);
router.post('/restore', requireAuth, uploadBackup.single('backup'), backupController.restore);

module.exports = router;
