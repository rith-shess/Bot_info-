const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = require('../database');
const config = require('../config');
const { createZip, readZip } = require('./zipUtil');

// Tables copied by a backup/restore. The admin login (table "admins") is never touched by a restore.
// Order matters: parents first.
const DATA_TABLES = ['categories', 'products', 'product_images', 'settings', 'telegram_users'];
const IMAGE_NAME = /^[A-Za-z0-9._ -]+\.(jpe?g|png|webp|gif)$/i;

function sqlString(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function tableColumns(handle, schemaName, table) {
  return handle.prepare(`PRAGMA ${schemaName}.table_info(${table})`).all().map(c => c.name);
}

/** Builds a .zip containing catalog.db (without admin passwords) + all product pictures. */
function createBackup() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-backup-'));
  try {
    const snapshot = path.join(tmpDir, 'catalog.db');
    db.exec(`VACUUM INTO ${sqlString(snapshot)}`);

    const snap = new DatabaseSync(snapshot);
    snap.exec('DELETE FROM admins'); // never put password hashes in a backup file
    snap.exec('VACUUM');
    snap.close();

    const entries = [{ name: 'catalog.db', data: fs.readFileSync(snapshot) }];
    const files = db.prepare('SELECT DISTINCT file_path FROM product_images').all();
    let images = 0;
    files.forEach(row => {
      const full = path.join(config.paths.uploads, path.basename(row.file_path));
      if (fs.existsSync(full)) {
        entries.push({ name: `uploads/products/${path.basename(full)}`, data: fs.readFileSync(full) });
        images++;
      }
    });

    const info = {
      createdAt: new Date().toISOString(),
      products: db.prepare('SELECT COUNT(*) c FROM products').get().c,
      categories: db.prepare('SELECT COUNT(*) c FROM categories').get().c,
      images
    };
    entries.push({ name: 'backup-info.json', data: Buffer.from(JSON.stringify(info, null, 2)) });
    return { buffer: createZip(entries), info };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Replaces categories, products, pictures, settings and customers with the content of a backup.
 * Runs synchronously (no other request can interleave) and inside one transaction.
 */
function restoreBackup(zipBuffer) {
  let entries;
  try {
    entries = readZip(zipBuffer);
  } catch (err) {
    const e = new Error(err.message);
    e.status = 400;
    throw e;
  }

  const dbEntry = entries.find(e => /(^|\/)catalog\.db$/i.test(e.name.replace(/\\/g, '/')));
  if (!dbEntry) {
    const e = new Error('This .zip is not a catalog backup (catalog.db is missing).');
    e.status = 400;
    throw e;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-restore-'));
  const writtenImages = [];
  let attached = false;
  try {
    // 1) Check the database inside the backup
    const tmpDb = path.join(tmpDir, 'backup.db');
    fs.writeFileSync(tmpDb, dbEntry.data);
    const probe = new DatabaseSync(tmpDb);
    let backupTables;
    try {
      const integrity = probe.prepare('PRAGMA integrity_check').get();
      if (!integrity || Object.values(integrity)[0] !== 'ok') throw new Error('The database inside the backup is damaged.');
      backupTables = probe.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
      if (!backupTables.includes('products') || !backupTables.includes('categories')) {
        throw new Error('This .zip is not a catalog backup (no products table).');
      }
    } catch (err) {
      err.status = 400;
      throw err;
    } finally {
      probe.close();
    }

    // 2) Pictures (only safe file names, only into the uploads folder)
    fs.mkdirSync(config.paths.uploads, { recursive: true });
    entries.forEach(entry => {
      const base = path.basename(entry.name.replace(/\\/g, '/'));
      if (!IMAGE_NAME.test(base) || entry.name === dbEntry.name) return;
      const target = path.join(config.paths.uploads, base);
      const existed = fs.existsSync(target);
      fs.writeFileSync(target, entry.data);
      writtenImages.push({ target, existed, name: base });
    });

    // 3) Swap the data inside one transaction
    const oldImages = db.prepare('SELECT file_path FROM product_images').all().map(r => r.file_path);
    db.prepare('ATTACH DATABASE ? AS backup_src').run(tmpDb);
    attached = true;

    const counts = {};
    db.exec('BEGIN IMMEDIATE');
    try {
      ['product_images', 'products', 'categories', 'settings', 'telegram_users'].forEach(t => db.exec(`DELETE FROM main.${t}`));
      DATA_TABLES.forEach(table => {
        if (!backupTables.includes(table)) { counts[table] = 0; return; }
        const live = tableColumns(db, 'main', table);
        const backup = tableColumns(db, 'backup_src', table);
        const cols = live.filter(c => backup.includes(c));
        if (cols.length === 0) { counts[table] = 0; return; }
        const list = cols.map(c => `"${c}"`).join(', ');
        db.exec(`INSERT INTO main.${table} (${list}) SELECT ${list} FROM backup_src.${table}`);
        counts[table] = db.prepare(`SELECT COUNT(*) c FROM main.${table}`).get().c;
      });
      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (e) { /* nothing to roll back */ }
      throw err;
    }

    // 4) Tidy up: delete pictures that belonged only to the data that was replaced
    const keep = new Set(db.prepare('SELECT file_path FROM product_images').all().map(r => r.file_path));
    oldImages.filter(f => !keep.has(f)).forEach(f => {
      try { fs.unlinkSync(path.join(config.paths.uploads, path.basename(f))); } catch (e) { /* already gone */ }
    });
    const missingImages = [...keep].filter(f => !fs.existsSync(path.join(config.paths.uploads, path.basename(f)))).length;

    return {
      categories: counts.categories || 0,
      products: counts.products || 0,
      images: counts.product_images || 0,
      settings: counts.settings || 0,
      customers: counts.telegram_users || 0,
      missingImages
    };
  } catch (err) {
    // Remove pictures that were only written for this failed restore
    writtenImages.filter(w => !w.existed).forEach(w => { try { fs.unlinkSync(w.target); } catch (e) { /* ignore */ } });
    throw err;
  } finally {
    if (attached) { try { db.exec('DETACH DATABASE backup_src'); } catch (e) { /* ignore */ } }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = { createBackup, restoreBackup };
