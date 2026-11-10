const assert = require('assert');
const categoryService = require('../services/categoryService');

function testCategories() {
  console.log('--- Testing Category Management ---');

  // Create
  const newCat = categoryService.createCategory({
    name_en: 'Test Category EN',
    name_km: 'ប្រភេទសាកល្បង KM',
    description_en: 'Test category description in English',
    description_km: 'ការពិពណ៌នាប្រភេទជាភាសាខ្មែរ'
  });
  assert(newCat && newCat.id, 'Created category must return ID');
  assert.strictEqual(newCat.name_en, 'Test Category EN');
  assert.strictEqual(newCat.name_km, 'ប្រភេទសាកល្បង KM');

  // Read
  const fetched = categoryService.getCategoryById(newCat.id);
  assert.strictEqual(fetched.id, newCat.id);

  // Update
  const updated = categoryService.updateCategory(newCat.id, {
    name_en: 'Updated Category EN',
    name_km: 'ប្រភេទកែប្រែ KM',
    description_en: 'Updated Desc',
    description_km: 'ការពិពណ៌នាកែប្រែ'
  });
  assert.strictEqual(updated.name_en, 'Updated Category EN');
  assert.strictEqual(updated.name_km, 'ប្រភេទកែប្រែ KM');

  // Delete
  const deleted = categoryService.deleteCategory(newCat.id);
  assert.strictEqual(deleted, true);

  const afterDelete = categoryService.getCategoryById(newCat.id);
  assert.strictEqual(afterDelete, undefined);

  console.log('✔ Category Management tests passed successfully.');
}

module.exports = { testCategories };
