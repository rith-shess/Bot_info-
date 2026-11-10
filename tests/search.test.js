const assert = require('assert');
const searchService = require('../services/searchService');

function testSearch() {
  console.log('--- Testing Product Search (English & Khmer) ---');

  // English queries from prompt requirements
  const query1 = 'Do you have a thermal printer?';
  const res1 = searchService.search(query1);
  assert(res1.length > 0, `Query "${query1}" should find thermal printer`);
  assert(res1.some(p => p.sku === 'PRN-80MM-USB'), 'Should match 80mm printer SKU');

  const query2 = 'How much is this printer?';
  const res2 = searchService.search(query2);
  assert(res2.length > 0, `Query "${query2}" should match printers`);

  const query3 = 'Show me your barcode scanners.';
  const res3 = searchService.search(query3);
  assert(res3.length > 0, `Query "${query3}" should find barcode scanner`);
  assert(res3.some(p => p.sku === 'SCN-2D-WIFI'), 'Should match scanner SKU');

  // Khmer queries from prompt requirements
  const queryKm1 = 'តើមានម៉ាស៊ីនព្រីនទេ?';
  const resKm1 = searchService.search(queryKm1);
  assert(resKm1.length > 0, `Khmer query "${queryKm1}" should find printer`);

  const queryKm2 = 'ម៉ាស៊ីនព្រីននេះតម្លៃប៉ុន្មាន?';
  const resKm2 = searchService.search(queryKm2);
  assert(resKm2.length > 0, `Khmer query "${queryKm2}" should find printer`);

  const queryKm3 = 'មានម៉ាស៊ីនស្កេន Barcode ទេ?';
  const resKm3 = searchService.search(queryKm3);
  assert(resKm3.length > 0, `Khmer query "${queryKm3}" should find barcode scanner`);

  // SKU exact match
  const resSku = searchService.search('PRN-80MM-USB');
  assert.strictEqual(resSku.length, 1);
  assert.strictEqual(resSku[0].sku, 'PRN-80MM-USB');

  // Non-existent item
  const resEmpty = searchService.search('Spaceship Rocket NASA');
  assert.strictEqual(resEmpty.length, 0, 'Non-existent item should return empty array');

  console.log('✔ Search System (EN & KM) tests passed successfully.');
}

module.exports = { testSearch };
