const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./index');
const config = require('../config');

function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema
  db.exec(schemaSql);

  // Check and seed default admin from environment
  const adminCheck = db.prepare('SELECT id FROM admins WHERE username = ?').get(config.adminUsername);
  if (!adminCheck) {
    const saltRounds = 10;
    const passwordHash = bcrypt.hashSync(config.adminPassword, saltRounds);
    const insertAdmin = db.prepare(`
      INSERT INTO admins (username, password_hash, full_name)
      VALUES (?, ?, ?)
    `);
    insertAdmin.run(config.adminUsername, passwordHash, 'System Administrator');
    console.log(`[Database] Default administrator created: "${config.adminUsername}"`);
  } else if (process.env.ADMIN_PASSWORD) {
    // ADMIN_PASSWORD is set explicitly (e.g. Railway Variables): keep the stored password in sync,
    // so the admin password can be changed later by editing the variable.
    const row = db.prepare('SELECT id, password_hash FROM admins WHERE username = ?').get(config.adminUsername);
    if (!bcrypt.compareSync(config.adminPassword, row.password_hash)) {
      db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(config.adminPassword, 10), row.id);
      console.log(`[Database] Password for administrator "${config.adminUsername}" updated from ADMIN_PASSWORD.`);
    }
  }

  // Seed default categories if none exist
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (catCount.count === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (name_en, name_km, description_en, description_km)
      VALUES (?, ?, ?, ?)
    `);
    
    const cat1 = insertCat.run(
      'Thermal Printers',
      'ម៉ាស៊ីនព្រីនកម្ដៅ',
      'High-speed receipt and POS thermal printers',
      'ម៉ាស៊ីនព្រីនវិក្កយបត្រល្បឿនលឿន និងប្រព័ន្ធ POS'
    );
    const cat2 = insertCat.run(
      'Barcode Scanners',
      'ម៉ាស៊ីនស្កេនបាកូដ',
      '1D and 2D handheld and omnidirectional barcode scanners',
      'ម៉ាស៊ីនស្កេនបាកូដ 1D និង 2D ប្រភេទកាន់ដៃ និងស្វ័យប្រវត្តិ'
    );
    const cat3 = insertCat.run(
      'POS Accessories',
      'គ្រឿងបន្លាស់ POS',
      'Cash drawers, receipt paper rolls, and mounts',
      'ថតដាក់ប្រាក់ ក្រដាសព្រីន និងគ្រឿងតម្លើង'
    );

    // Seed initial products so the system is immediately usable and testable
    const insertProd = db.prepare(`
      INSERT INTO products (
        sku, name_en, name_km, description_en, description_km,
        details_en, details_km, price, currency, category_id,
        stock_status, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProd.run(
      'PRN-80MM-USB',
      '80mm Thermal Receipt Printer USB/LAN',
      'ម៉ាស៊ីនព្រីនវិក្កយបត្រកម្ដៅ 80mm USB/LAN',
      'Fast 260mm/s auto-cutter thermal printer suitable for retail, restaurants, and supermarkets.',
      'ម៉ាស៊ីនព្រីនវិក្កយបត្រកម្ដៅល្បឿនលឿន 260mm/s កាត់ក្រដាសស្វ័យប្រវត្តិ ស័ក្តិសមសម្រាប់ហាងទំនិញ ភោជនីយដ្ឋាន និងផ្សារទំនើប។',
      'Printing Speed: 260mm/s\nInterface: USB + LAN + Serial\nPaper Width: 80mm\nAuto Cutter: 1.5 million cuts\nPower: 24V/2.5A',
      'ល្បឿនព្រីន: 260mm/s\nរន្ធតភ្ជាប់: USB + LAN + Serial\nទំហំក្រដាស: 80mm\nកាំបិតកាត់ស្វ័យប្រវត្តិ: 1.5 លានដង\nថាមពល: 24V/2.5A',
      68.00,
      'USD',
      cat1.lastInsertRowid,
      'in_stock',
      1
    );

    insertProd.run(
      'SCN-2D-WIFI',
      'Wireless 2D QR & Barcode Scanner',
      'ម៉ាស៊ីនស្កេនបាកូដឥតខ្សែ 2D QR និងបាកូដ',
      'Reliable handheld 2.4G wireless and Bluetooth barcode scanner, reads on-screen QR codes.',
      'ម៉ាស៊ីនស្កេនឥតខ្សែ 2.4G និងប៊្លូធូស អាចស្កេនបាកូដលើក្រដាស និង QR កូដលើអេក្រង់ទូរស័ព្ទបានយ៉ាងរហ័ស។',
      'Scan Type: 1D & 2D (QR, Data Matrix, PDF417)\nConnection: 2.4GHz Wireless + Bluetooth + USB Cable\nBattery: 2000mAh (up to 20 hours continuous)\nDrop Resistance: 1.5m on concrete',
      'ប្រភេទស្កេន: 1D និង 2D (QR, Data Matrix, PDF417)\nការតភ្ជាប់: ឥតខ្សែ 2.4GHz + Bluetooth + ខ្សែ USB\nថ្ម: 2000mAh (ប្រើបានរហូតដល់ ២០ ម៉ោង)\nធន់នឹងការធ្លាក់: 1.5 ម៉ែត្រលើបេតុង',
      45.00,
      'USD',
      cat2.lastInsertRowid,
      'in_stock',
      1
    );

    insertProd.run(
      'DRW-410-RJ11',
      'Heavy Duty POS Cash Drawer RJ11',
      'ថតដាក់ប្រាក់ដែកក្រាស់ POS Cash Drawer RJ11',
      'Solid steel construction with 5 bills and 8 coins compartments, connects directly to receipt printer.',
      'ថតប្រាក់ដែកក្រាស់គុណភាពខ្ពស់ មាន ៥ ប្រឡោះក្រដាសប្រាក់ និង ៨ ប្រឡោះកាក់ តភ្ជាប់ដោយផ្ទាល់ជាមួយម៉ាស៊ីនព្រីន។',
      'Dimensions: 410(W) x 420(D) x 100(H) mm\nCompartments: 5 Bills / 8 Coins\nInterface: RJ11 (Connects to printer)\nLock: 3-position key lock',
      'ទំហំ: 410(W) x 420(D) x 100(H) mm\nប្រឡោះ: ក្រដាសប្រាក់ ៥ / កាក់ ៨\nរន្ធតភ្ជាប់: RJ11 (ភ្ជាប់ទៅម៉ាស៊ីនព្រីន)\nសោរ: សោរ ៣ ដំណាក់កាល',
      35.00,
      'USD',
      cat3.lastInsertRowid,
      'in_stock',
      1
    );

    insertProd.run(
      'PPR-80X80-BOX',
      'Thermal Paper Roll 80x80mm (Box of 50 Rolls)',
      'ក្រដាសកម្ដៅព្រីនវិក្កយបត្រ 80x80mm (កេស ៥០ ដុំ)',
      'High grade thermal paper roll, BPA free, dark clear printout and long image stability.',
      'ក្រដាសកម្ដៅគុណភាពខ្ពស់ គ្មានសារធាតុ BPA ព្រីនចេញអក្សរច្បាស់ ពណ៌ដិត និងរក្សាទុកបានយូរ។',
      'Size: 80mm width x 80mm diameter\nQuantity: 50 rolls / box\nCore size: 12mm\nFeatures: Premium white, dust-free',
      'ទំហំ: ទទឹង 80mm x អង្កត់ផ្ចិត 80mm\nចំនួន: ៥០ ដុំ / កេស\nទំហំស្នូល: 12mm\nគុណសម្បត្តិ: ពណ៌សស្អាត គ្មានធូលីក្រដាស',
      120000.00,
      'KHR',
      cat3.lastInsertRowid,
      'in_stock',
      1
    );

    console.log('[Database] Default categories and starter products initialized.');
  }

  // Seed sample images for starter products
  const { seedSampleImages } = require('./seedImages');
  seedSampleImages();

  console.log('[Database] Database tables and indexes verified.');
}

module.exports = { initDatabase };
