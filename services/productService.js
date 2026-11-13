const fs = require('fs');
const path = require('path');
const db = require('../database');
const config = require('../config');

const productService = {
  getAllProducts({ search = '', categoryId = '', stockStatus = '', isActive = '', limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT p.*, c.name_en as category_name_en, c.name_km as category_name_km
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (
        p.name_en LIKE ? OR 
        p.name_km LIKE ? OR 
        p.sku LIKE ? OR 
        p.description_en LIKE ? OR 
        p.description_km LIKE ? OR 
        c.name_en LIKE ? OR 
        c.name_km LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term);
    }

    if (categoryId && categoryId !== '') {
      query += ' AND p.category_id = ?';
      params.push(parseInt(categoryId, 10));
    }

    if (stockStatus && stockStatus !== '') {
      query += ' AND p.stock_status = ?';
      params.push(stockStatus);
    }

    if (isActive !== '' && isActive !== undefined && isActive !== null) {
      query += ' AND p.is_active = ?';
      params.push(parseInt(isActive, 10));
    }

    query += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const products = db.prepare(query).all(...params);

    // Attach images to each product
    const imgStmt = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC, id ASC');
    return products.map(product => {
      product.images = imgStmt.all(product.id);
      return product;
    });
  },

  getTotalCount({ search = '', categoryId = '', stockStatus = '', isActive = '' } = {}) {
    let query = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (
        p.name_en LIKE ? OR 
        p.name_km LIKE ? OR 
        p.sku LIKE ? OR 
        p.description_en LIKE ? OR 
        p.description_km LIKE ? OR 
        c.name_en LIKE ? OR 
        c.name_km LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term);
    }

    if (categoryId && categoryId !== '') {
      query += ' AND p.category_id = ?';
      params.push(parseInt(categoryId, 10));
    }

    if (stockStatus && stockStatus !== '') {
      query += ' AND p.stock_status = ?';
      params.push(stockStatus);
    }

    if (isActive !== '' && isActive !== undefined && isActive !== null) {
      query += ' AND p.is_active = ?';
      params.push(parseInt(isActive, 10));
    }

    const row = db.prepare(query).get(...params);
    return row ? row.total : 0;
  },

  getProductById(id) {
    const product = db.prepare(`
      SELECT p.*, c.name_en as category_name_en, c.name_km as category_name_km
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);

    if (!product) return null;

    product.images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC, id ASC').all(id);
    return product;
  },

  getProductBySku(sku) {
    const product = db.prepare(`
      SELECT p.*, c.name_en as category_name_en, c.name_km as category_name_km
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE LOWER(p.sku) = LOWER(?)
    `).get(sku.trim());

    if (!product) return null;
    product.images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC, id ASC').all(product.id);
    return product;
  },

  createProduct(data, files = []) {
    const stmt = db.prepare(`
      INSERT INTO products (
        sku, name_en, name_km, description_en, description_km,
        details_en, details_km, price, currency, category_id,
        stock_status, is_active, video_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      data.sku.trim(),
      data.name_en.trim(),
      (data.name_km || data.name_en).trim(),
      data.description_en ? data.description_en.trim() : '',
      data.description_km ? data.description_km.trim() : '',
      data.details_en ? data.details_en.trim() : '',
      data.details_km ? data.details_km.trim() : '',
      parseFloat(data.price) || 0,
      data.currency || 'USD',
      data.category_id ? parseInt(data.category_id, 10) : null,
      data.stock_status || 'in_stock',
      data.is_active !== undefined ? parseInt(data.is_active, 10) : 1,
      data.video_url ? String(data.video_url).trim() : null
    );

    const productId = result.lastInsertRowid;

    // Save image records
    if (files && files.length > 0) {
      const imgInsert = db.prepare(`
        INSERT INTO product_images (product_id, file_path, original_name, file_size, mime_type, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      files.forEach((file, index) => {
        imgInsert.run(productId, file.filename, file.originalname, file.size, file.mimetype, index);
      });
    }


    return this.getProductById(productId);
  },

  updateProduct(id, data, newFiles = [], removeImageIds = []) {
    const existing = this.getProductById(id);
    if (!existing) return null;

    const stmt = db.prepare(`
      UPDATE products SET
        sku = ?,
        name_en = ?,
        name_km = ?,
        description_en = ?,
        description_km = ?,
        details_en = ?,
        details_km = ?,
        price = ?,
        currency = ?,
        category_id = ?,
        stock_status = ?,
        is_active = ?,
        video_url = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      data.sku ? data.sku.trim() : existing.sku,
      data.name_en ? data.name_en.trim() : existing.name_en,
      data.name_km ? data.name_km.trim() : existing.name_km,
      data.description_en !== undefined ? data.description_en.trim() : existing.description_en,
      data.description_km !== undefined ? data.description_km.trim() : existing.description_km,
      data.details_en !== undefined ? data.details_en.trim() : existing.details_en,
      data.details_km !== undefined ? data.details_km.trim() : existing.details_km,
      data.price !== undefined ? parseFloat(data.price) : existing.price,
      data.currency || existing.currency,
      data.category_id !== undefined ? (data.category_id ? parseInt(data.category_id, 10) : null) : existing.category_id,
      data.stock_status || existing.stock_status,
      data.is_active !== undefined ? parseInt(data.is_active, 10) : existing.is_active,
      data.video_url !== undefined ? (String(data.video_url).trim() || null) : existing.video_url,
      id
    );

    // Remove specified images
    if (Array.isArray(removeImageIds) && removeImageIds.length > 0) {
      removeImageIds.forEach(imgId => {
        const img = db.prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?').get(imgId, id);
        if (img) {
          const filePath = path.join(config.paths.uploads, img.file_path);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
          }
          db.prepare('DELETE FROM product_images WHERE id = ?').run(imgId);
        }
      });
    }

    // Append new uploaded images
    if (newFiles && newFiles.length > 0) {
      const maxOrderRow = db.prepare('SELECT MAX(display_order) as maxOrder FROM product_images WHERE product_id = ?').get(id);
      let nextOrder = (maxOrderRow && maxOrderRow.maxOrder !== null ? maxOrderRow.maxOrder : -1) + 1;

      const imgInsert = db.prepare(`
        INSERT INTO product_images (product_id, file_path, original_name, file_size, mime_type, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      newFiles.forEach(file => {
        imgInsert.run(id, file.filename, file.originalname, file.size, file.mimetype, nextOrder++);
      });
    }

    return this.getProductById(id);
  },

  deleteProduct(id) {
    const product = this.getProductById(id);
    if (!product) return false;

    // Delete image files from disk
    if (product.images && product.images.length > 0) {
      product.images.forEach(img => {
        const filePath = path.join(config.paths.uploads, img.file_path);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
        }
      });
    }

    // Cascade delete in DB
    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return result.changes > 0;
  },

  toggleProductActive(id) {
    const product = this.getProductById(id);
    if (!product) return null;
    const newStatus = product.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);
    return this.getProductById(id);
  },

  saveTelegramFileId(imageId, telegramFileId) {
    db.prepare('UPDATE product_images SET telegram_file_id = ? WHERE id = ?').run(telegramFileId, imageId);
  },

  getDashboardStats() {
    const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
    const activeProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1').get().c;
    const outOfStockProducts = db.prepare("SELECT COUNT(*) as c FROM products WHERE stock_status = 'out_of_stock'").get().c;
    const totalCategories = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
    const recentProducts = db.prepare(`
      SELECT p.*, c.name_en as category_name_en, c.name_km as category_name_km
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
      LIMIT 5
    `).all();

    // Attach first image as thumbnail
    const imgStmt = db.prepare('SELECT file_path FROM product_images WHERE product_id = ? ORDER BY display_order ASC, id ASC LIMIT 1');
    recentProducts.forEach(prod => {
      const img = imgStmt.get(prod.id);
      prod.thumbnail = img ? img.file_path : null;
    });

    return {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalCategories,
      recentProducts
    };
  }
};

module.exports = productService;
