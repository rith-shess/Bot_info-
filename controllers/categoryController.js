const categoryService = require('../services/categoryService');

const categoryController = {
  getAll(req, res) {
    try {
      const categories = categoryService.getAllCategories();
      return res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve categories.'
      });
    }
  },

  getOne(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const category = categoryService.getCategoryById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found.'
        });
      }

      return res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error fetching category:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve category.'
      });
    }
  },

  create(req, res) {
    try {
      const { name_en, name_km, description_en, description_km } = req.body;

      if (!name_en || !name_en.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category English name is required.'
        });
      }

      const category = categoryService.createCategory({
        name_en,
        name_km: name_km || name_en,
        description_en,
        description_km
      });

      return res.status(201).json({
        success: true,
        message: 'Category created successfully.',
        data: category
      });
    } catch (error) {
      console.error('Error creating category:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create category: ' + error.message
      });
    }
  },

  update(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = categoryService.getCategoryById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Category not found.'
        });
      }

      const { name_en, name_km, description_en, description_km } = req.body;

      if (!name_en || !name_en.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category English name is required.'
        });
      }

      const updated = categoryService.updateCategory(id, {
        name_en,
        name_km: name_km || name_en,
        description_en,
        description_km
      });

      return res.json({
        success: true,
        message: 'Category updated successfully.',
        data: updated
      });
    } catch (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update category: ' + error.message
      });
    }
  },

  delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = categoryService.deleteCategory(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Category not found.'
        });
      }

      return res.json({
        success: true,
        message: 'Category deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete category.'
      });
    }
  },

  getProducts(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const products = categoryService.getProductsByCategory(id, false);
      return res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error fetching category products:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve products for category.'
      });
    }
  }
};

module.exports = categoryController;
