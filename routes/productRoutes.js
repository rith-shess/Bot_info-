const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', requireAuth, productController.getAll);
router.get('/:id', requireAuth, productController.getOne);
router.post('/', requireAuth, upload.productMedia, productController.create);
router.put('/:id', requireAuth, upload.productMedia, productController.update);
router.delete('/:id', requireAuth, productController.delete);
router.patch('/:id/toggle-status', requireAuth, productController.toggleActive);

module.exports = router;
