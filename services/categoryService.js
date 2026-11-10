const db = require('../database');

const categoryService = {
  getAllCategories() {
    return db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.name_en ASC
    `).all();
  },

  getCategoryById(id) {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  },

  createCategory({ name_en, name_km, description_en, description_km }) {
    const stmt = db.prepare(`
      INSERT INTO categories (name_en, name_km, description_en, description_km, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const result = stmt.run(
      name_en.trim(),
      (name_km || name_en).trim(),
      description_en ? description_en.trim() : null,
      description_km ? description_km.trim() : null
    );
    return this.getCategoryById(result.lastInsertRowid);
  },

  updateCategory(id, { name_en, name_km, description_en, description_km }) {
    const stmt = db.prepare(`
      UPDATE categories
      SET name_en = ?, name_km = ?, description_en = ?, description_km = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      name_en.trim(),
      (name_km || name_en).trim(),
      description_en ? description_en.trim() : null,
      description_km ? description_km.trim() : null,
      id
    );
    return this.getCategoryById(id);
  },

  deleteCategory(id) {
    // Unlink products first (or SQLite SET NULL does it)
    db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(id);
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return result.changes > 0;
  },

  getProductsByCategory(categoryId, activeOnly = true) {
    let query = `
      SELECT p.*, c.name_en as category_name_en, c.name_km as category_name_km
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ?
    `;
    if (activeOnly) {
      query += ' AND p.is_active = 1';
    }
    query += ' ORDER BY p.name_en ASC';
    return db.prepare(query).all(categoryId);
  }
};

module.exports = categoryService;
