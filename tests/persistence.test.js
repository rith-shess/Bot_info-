const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

function testPersistence() {
  console.log('--- Testing SQLite Database Persistence ---');

  const dbFilePath = path.join(config.paths.data, 'catalog.db');
  assert(fs.existsSync(dbFilePath), 'Database file must exist on disk at data/catalog.db');

  // Verify file size is greater than 0
  const stats = fs.statSync(dbFilePath);
  assert(stats.size > 0, 'Database file size must be non-zero');

  // Open an independent fresh connection to the database file
  const independentDb = new DatabaseSync(dbFilePath);
  const admin = independentDb.prepare('SELECT username FROM admins WHERE username = ?').get(config.adminUsername);
  assert(admin, 'Admin record must persist across separate database connection instances');
  assert.strictEqual(admin.username, config.adminUsername);

  const productCount = independentDb.prepare('SELECT COUNT(*) as count FROM products').get();
  assert(productCount.count > 0, 'Products table must contain persisted records');

  console.log(`✔ Persistence verified on file "${dbFilePath}" (${stats.size} bytes).`);
}

module.exports = { testPersistence };
