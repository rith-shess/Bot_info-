const productService = require('../services/productService');
const upload = require('../middleware/upload');

// Files uploaded by multer.fields(): { images: [...], videos: [...] }
function splitFiles(req) {
  const files = req.files || {};
  return { images: files.images || [], videos: files.videos || [] };
}

// Accepts an array, a JSON array string or a single id
function parseIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(x => parseInt(x, 10)).filter(Number.isInteger);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return (Array.isArray(parsed) ? parsed : [parsed]).map(x => parseInt(x, 10)).filter(Number.isInteger);
    } catch (e) {
      const n = parseInt(value, 10);
      return Number.isInteger(n) ? [n] : [];
    }
  }
  return [];
}

const productController = {
  getAll(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;

      const filters = {
        search: req.query.search || '',
        categoryId: req.query.category_id || '',
        stockStatus: req.query.stock_status || '',
        isActive: req.query.is_active,
        limit,
        offset
      };

      const products = productService.getAllProducts(filters);
      const total = productService.getTotalCount(filters);

      return res.json({
        success: true,
        data: products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve products.'
      });
    }
  },

  getOne(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const product = productService.getProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found.'
        });
      }

      return res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve product.'
      });
    }
  },

  create(req, res) {
    try {
      const {
        sku,
        name_en,
        name_km,
        description_en,
        description_km,
        details_en,
        details_km,
        price,
        currency,
        category_id,
        stock_status,
        is_active
      } = req.body;

      if (!sku || !sku.trim()) {
        upload.removeUploadedFiles(req.files);
        return res.status(400).json({ success: false, message: 'SKU / Product code is required.' });
      }
      if (!name_en || !name_en.trim()) {
        upload.removeUploadedFiles(req.files);
        return res.status(400).json({ success: false, message: 'Product name in English is required.' });
      }

      // Check duplicate SKU
      const existing = productService.getProductBySku(sku);
      if (existing) {
        upload.removeUploadedFiles(req.files);
        return res.status(400).json({ success: false, message: `A product with SKU "${sku}" already exists.` });
      }

      const product = productService.createProduct(
        {
          sku,
          name_en,
          name_km: name_km || name_en,
          description_en,
          description_km,
          details_en,
          details_km,
          price: parseFloat(price) || 0,
          currency: currency || 'USD',
          category_id: category_id ? parseInt(category_id, 10) : null,
          stock_status: stock_status || 'in_stock',
          is_active: is_active !== undefined ? parseInt(is_active, 10) : 1
        },
        splitFiles(req).images,
        splitFiles(req).videos
      );

      return res.status(201).json({
        success: true,
        message: 'Product created successfully.',
        data: product
      });
    } catch (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create product: ' + error.message
      });
    }
  },

  update(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = productService.getProductById(id);
      if (!existing) {
        upload.removeUploadedFiles(req.files);
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }

      const {
        sku,
        name_en,
        name_km,
        description_en,
        description_km,
        details_en,
        details_km,
        price,
        currency,
        category_id,
        stock_status,
        is_active,
        remove_images,
        remove_videos
      } = req.body;

      // Check duplicate SKU if changed
      if (sku && sku.trim().toLowerCase() !== existing.sku.toLowerCase()) {
        const skuCheck = productService.getProductBySku(sku);
        if (skuCheck && skuCheck.id !== id) {
          upload.removeUploadedFiles(req.files);
          return res.status(400).json({ success: false, message: `SKU "${sku}" is already in use by another product.` });
        }
      }

      const removeImageIds = parseIdList(remove_images);
      const removeVideoIds = parseIdList(remove_videos);

      const updated = productService.updateProduct(
        id,
        {
          sku,
          name_en,
          name_km,
          description_en,
          description_km,
          details_en,
          details_km,
          price,
          currency,
          category_id,
          stock_status,
          is_active
        },
        splitFiles(req).images,
        removeImageIds,
        splitFiles(req).videos,
        removeVideoIds
      );

      return res.json({
        success: true,
        message: 'Product updated successfully.',
        data: updated
      });
    } catch (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update product: ' + error.message
      });
    }
  },

  delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = productService.deleteProduct(id);

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }

      return res.json({
        success: true,
        message: 'Product and associated pictures and videos deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete product.'
      });
    }
  },

  toggleActive(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = productService.toggleProductActive(id);

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }

      return res.json({
        success: true,
        message: `Product ${updated.is_active ? 'activated' : 'deactivated'} successfully.`,
        data: updated
      });
    } catch (error) {
      console.error('Error toggling product status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to toggle product status.'
      });
    }
  }
};

module.exports = productController;
