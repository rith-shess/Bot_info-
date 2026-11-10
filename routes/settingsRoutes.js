const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, settingsController.get);
router.post('/', requireAuth, settingsController.update);

module.exports = router;
