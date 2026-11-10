const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, categoryController.getAll);
router.get('/:id', requireAuth, categoryController.getOne);
router.get('/:id/products', requireAuth, categoryController.getProducts);
router.post('/', requireAuth, categoryController.create);
router.put('/:id', requireAuth, categoryController.update);
router.delete('/:id', requireAuth, categoryController.delete);

module.exports = router;
