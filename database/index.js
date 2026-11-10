const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

// Ensure data and upload directories exist
if (!fs.existsSync(config.paths.data)) {
  fs.mkdirSync(config.paths.data, { recursive: true });
}
if (!fs.existsSync(config.paths.uploads)) {
  fs.mkdirSync(config.paths.uploads, { recursive: true });
}

const dbPath = path.join(config.paths.data, 'catalog.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

module.exports = db;
