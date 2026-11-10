const assert = require('assert');
const productService = require('../services/productService');

function testProducts() {
  console.log('--- Testing Product Management CRUD ---');

  const testSku = 'TEST-UNIT-' + Date.now();

  // Create product with mock file upload
  const mockFiles = [
    {
      filename: 'test-img-1.jpg',
      originalname: 'original-1.jpg',
      size: 1024,
      mimetype: 'image/jpeg'
    },
    {
      filename: 'test-img-2.jpg',
      originalname: 'original-2.jpg',
      size: 2048,
      mimetype: 'image/jpeg'
    }
  ];

  const product = productService.createProduct(
    {
      sku: testSku,
      name_en: 'Unit Test Product EN',
      name_km: 'ផលិតផលសាកល្បង KM',
      description_en: 'Test description EN',
      description_km: 'ការពិពណ៌នាសាកល្បង KM',
      details_en: 'Specs: 100W, Fast, Durable',
      details_km: 'លក្ខណៈ: 100W, លឿន, ធន់',
      price: 99.50,
      currency: 'USD',
      stock_status: 'in_stock',
      is_active: 1
    },
    mockFiles
  );

  assert(product && product.id, 'Product must be inserted with ID');
  assert.strictEqual(product.sku, testSku);
  assert.strictEqual(product.price, 99.5);
  assert.strictEqual(product.images.length, 2, 'Must have 2 images attached');

  // Verify caching telegram_file_id
  const img1 = product.images[0];
  productService.saveTelegramFileId(img1.id, 'tg_cached_file_id_xyz');
  const reloaded = productService.getProductById(product.id);
  assert.strictEqual(reloaded.images[0].telegram_file_id, 'tg_cached_file_id_xyz', 'Telegram file ID should be cached');

  // Toggle active
  const toggled = productService.toggleProductActive(product.id);
  assert.strictEqual(toggled.is_active, 0, 'Product should be deactivated');
  const toggledBack = productService.toggleProductActive(product.id);
  assert.strictEqual(toggledBack.is_active, 1, 'Product should be active again');

  // Update product
  const updated = productService.updateProduct(
    product.id,
    {
      price: 110.00,
      stock_status: 'low_stock'
    },
    [],
    [reloaded.images[1].id] // Remove second image
  );
  assert.strictEqual(updated.price, 110.00);
  assert.strictEqual(updated.stock_status, 'low_stock');
  assert.strictEqual(updated.images.length, 1, 'Should now have 1 image after removal');

  // Delete product
  const deleted = productService.deleteProduct(product.id);
  assert.strictEqual(deleted, true);

  const check = productService.getProductById(product.id);
  assert.strictEqual(check, null, 'Deleted product must not be found');

  console.log('✔ Product Management CRUD tests passed successfully.');
}

module.exports = { testProducts };
