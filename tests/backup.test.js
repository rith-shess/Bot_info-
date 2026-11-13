const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = require('../database');
const { createZip, readZip } = require('../services/zipUtil');
const { createBackup, restoreBackup } = require('../services/backupService');

function counts() {
  const n = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  return { categories: n('categories'), products: n('products'), images: n('product_images'), admins: n('admins') };
}

function testBackup() {
  console.log('💾 Testing zip tools and backup & restore...');

  // 1) zip writer/reader
  const zip = createZip([
    { name: 'a.txt', data: Buffer.from('hello') },
    { name: 'folder/ឯកសារ.txt', data: Buffer.from('khmer name') }
  ]);
  const entries = readZip(zip);
  if (entries.length !== 2 || entries[1].name !== 'folder/ឯកសារ.txt' || entries[0].data.toString() !== 'hello') {
    throw new Error('Zip round trip failed');
  }
  let rejected = false;
  try { readZip(Buffer.from('not a zip')); } catch (e) { rejected = true; }
  if (!rejected) throw new Error('A file that is not a zip must be rejected');

  // 2) backup contains the database but never the admin password
  const before = counts();
  const { buffer } = createBackup();
  const files = readZip(buffer);
  const dbEntry = files.find(f => f.name === 'catalog.db');
  if (!dbEntry) throw new Error('Backup has no catalog.db');
  const tmp = path.join(os.tmpdir(), `backup-test-${Date.now()}.db`);
  fs.writeFileSync(tmp, dbEntry.data);
  const inside = new DatabaseSync(tmp);
  const adminsInBackup = inside.prepare('SELECT COUNT(*) c FROM admins').get().c;
  const productsInBackup = inside.prepare('SELECT COUNT(*) c FROM products').get().c;
  inside.close();
  fs.unlinkSync(tmp);
  if (adminsInBackup !== 0) throw new Error('Backup must not contain admin accounts');
  if (productsInBackup !== before.products) throw new Error('Backup has the wrong number of products');

  // 3) change the data, restore, and everything is back (admin login untouched)
  db.prepare("INSERT INTO categories (name_en, name_km) VALUES ('TEMP-CATEGORY', 'TEMP-CATEGORY')").run();
  const summary = restoreBackup(buffer);
  const after = counts();
  if (after.categories !== before.categories || after.products !== before.products || after.images !== before.images) {
    throw new Error('Restore did not bring back the original data');
  }
  if (db.prepare("SELECT COUNT(*) c FROM categories WHERE name_en = 'TEMP-CATEGORY'").get().c !== 0) {
    throw new Error('Data added after the backup should be gone after the restore');
  }
  if (after.admins !== before.admins) throw new Error('Restore must not change admin accounts');
  if (summary.products !== before.products) throw new Error('Restore summary is wrong');

  // 4) a bad file is refused and nothing changes
  let refused = false;
  try { restoreBackup(createZip([{ name: 'hello.txt', data: Buffer.from('x') }])); } catch (e) { refused = e.status === 400; }
  if (!refused) throw new Error('A zip without catalog.db must be refused with status 400');
  if (counts().products !== before.products) throw new Error('A refused restore must not change data');

  console.log('✔ Backup & restore tests passed successfully.');
}

module.exports = { testBackup };
