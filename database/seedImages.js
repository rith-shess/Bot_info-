const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('./index');

function seedSampleImages() {
  if (!fs.existsSync(config.paths.uploads)) {
    fs.mkdirSync(config.paths.uploads, { recursive: true });
  }

  const products = db.prepare('SELECT id, sku FROM products').all();

  products.forEach(p => {
    let filename = null;
    let originalName = null;

    if (p.sku.includes('PRN')) {
      filename = 'sample-printer-80mm.jpg';
      originalName = '80mm-thermal-printer.jpg';
    } else if (p.sku.includes('SCN')) {
      filename = 'sample-barcode-scanner.jpg';
      originalName = 'wireless-2d-scanner.jpg';
    } else if (p.sku.includes('DRW')) {
      filename = 'sample-cash-drawer.jpg';
      originalName = 'pos-cash-drawer.jpg';
    } else if (p.sku.includes('PPR')) {
      filename = 'sample-paper-rolls.jpg';
      originalName = 'thermal-paper-rolls.jpg';
    }

    if (filename) {
      const fullPath = path.join(config.paths.uploads, filename);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        // Replace existing image record or insert new one
        const existing = db.prepare('SELECT id FROM product_images WHERE product_id = ?').get(p.id);
        if (existing) {
          db.prepare(`
            UPDATE product_images 
            SET file_path = ?, original_name = ?, file_size = ?, mime_type = 'image/jpeg', telegram_file_id = NULL
            WHERE id = ?
          `).run(filename, originalName, stats.size, existing.id);
        } else {
          db.prepare(`
            INSERT INTO product_images (product_id, file_path, original_name, file_size, mime_type, display_order)
            VALUES (?, ?, ?, ?, 'image/jpeg', 0)
          `).run(p.id, filename, originalName, stats.size);
        }
      }
    }
  });
}

module.exports = { seedSampleImages };
