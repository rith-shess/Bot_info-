const assert = require('assert');
const bcrypt = require('bcryptjs');
const db = require('../database');
const config = require('../config');

function testAuth() {
  console.log('--- Testing Admin Authentication ---');

  // Verify admin exists
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(config.adminUsername);
  assert(admin, 'Admin user must exist in database');
  assert.strictEqual(admin.username, config.adminUsername, 'Username matches config');

  // Verify correct password matches hash
  const isValid = bcrypt.compareSync(config.adminPassword, admin.password_hash);
  assert(isValid, 'Config admin password must successfully verify with stored hash');

  // Verify wrong password fails
  const isInvalid = bcrypt.compareSync('WrongPassword123!', admin.password_hash);
  assert(!isInvalid, 'Incorrect password must be rejected');

  console.log('✔ Admin Authentication tests passed successfully.');
}

module.exports = { testAuth };
