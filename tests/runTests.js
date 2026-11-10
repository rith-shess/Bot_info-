const { initDatabase } = require('../database/init');

// Initialize database schema and admin first
initDatabase();

const { testAuth } = require('./auth.test');
const { testCategories } = require('./category.test');
const { testProducts } = require('./product.test');
const { testSearch } = require('./search.test');
const { testTelegram } = require('./telegram.test');
const { testPersistence } = require('./persistence.test');

async function runAllTests() {
  console.log('====================================================');
  console.log('🚀 Running Telegram Catalog & Dashboard Test Suite');
  console.log('====================================================\n');

  try {
    testAuth();
    console.log('');
    testCategories();
    console.log('');
    testProducts();
    console.log('');
    testSearch();
    console.log('');
    await testTelegram();
    console.log('');
    testPersistence();

    console.log('\n====================================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (6/6 Suites)');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Failure:', error);
    process.exit(1);
  }
}

runAllTests();
