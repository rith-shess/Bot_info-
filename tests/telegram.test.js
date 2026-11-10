const assert = require('assert');
const { isKhmerText, resolveLanguage } = require('../telegram/helpers/languageDetector');
const { getMsg } = require('../telegram/messages/i18n');
const telegramUserService = require('../services/telegramUserService');
const { sendProductInfo } = require('../telegram/helpers/mediaSender');

async function testTelegram() {
  console.log('--- Testing Telegram Bot Services & Helpers ---');

  // 1. Language Detection
  assert.strictEqual(isKhmerText('តើមានម៉ាស៊ីនព្រីនទេ?'), true, 'Should detect Khmer script');
  assert.strictEqual(isKhmerText('Do you have a printer?'), false, 'English should not be detected as Khmer');
  assert.strictEqual(isKhmerText('Barcode scanner ម៉ាស៊ីនស្កេន'), true, 'Mixed string with Khmer script should detect Khmer');

  // 2. Language Resolver
  assert.strictEqual(resolveLanguage('តើមានម៉ាស៊ីនព្រីនទេ?', 'en'), 'km', 'Khmer query should resolve to km');
  assert.strictEqual(resolveLanguage('How much is this?', 'en'), 'en', 'English query should resolve to en');
  assert.strictEqual(resolveLanguage('Hello', 'km'), 'km', 'User with km preference asking generic greeting');

  // 3. User Service Persistence
  const mockFrom = {
    id: 99887766,
    first_name: 'Dara',
    last_name: 'Sok',
    username: 'darasok'
  };

  const user1 = telegramUserService.upsertUser(mockFrom, 'km');
  assert.strictEqual(user1.telegram_id, 99887766);
  assert.strictEqual(user1.language_code, 'km');

  // Update language
  telegramUserService.setLanguage(mockFrom.id, 'en');
  const userLang = telegramUserService.getLanguage(mockFrom.id);
  assert.strictEqual(userLang, 'en', 'User language must update to English');

  // 4. i18n Formatting
  const mockProduct = {
    sku: 'TEST-SKU',
    name_en: 'Test Receipt Printer',
    name_km: 'ម៉ាស៊ីនព្រីនវិក្កយបត្រ',
    price: 50.00,
    currency: 'USD',
    stock_status: 'in_stock',
    description_en: 'Fast thermal printer',
    description_km: 'ម៉ាស៊ីនព្រីនលឿន'
  };

  const enText = getMsg('en').formatProduct(mockProduct);
  assert(enText.includes('Test Receipt Printer'), 'English format contains English name');
  assert(enText.includes('$50.00'), 'Formatted price in USD');
  assert(enText.includes('In Stock'), 'English in-stock badge');

  const kmText = getMsg('km').formatProduct(mockProduct);
  assert(kmText.includes('ម៉ាស៊ីនព្រីនវិក្កយបត្រ'), 'Khmer format contains Khmer name');
  assert(kmText.includes('$50.00'), 'Price shown in USD');
  assert(kmText.includes('មានក្នុងស្តុក'), 'Khmer in-stock badge');

  // 5. Media Sender logic with mock Telegram Context
  let sentType = null;
  let sentPayload = null;
  const mockCtx = {
    sendChatAction: () => Promise.resolve(),
    reply: (txt, opts) => {
      sentType = 'text';
      sentPayload = txt;
      return Promise.resolve({ message_id: 101 });
    },
    replyWithPhoto: (photo, opts) => {
      sentType = 'photo';
      sentPayload = photo;
      return Promise.resolve({ message_id: 102, photo: [{ file_id: 'file_id_cached' }] });
    },
    replyWithMediaGroup: (media) => {
      sentType = 'mediaGroup';
      sentPayload = media;
      return Promise.resolve([
        { photo: [{ file_id: 'file_1' }] },
        { photo: [{ file_id: 'file_2' }] }
      ]);
    }
  };

  // Test no images -> text
  await sendProductInfo(mockCtx, { ...mockProduct, images: [] }, 'en');
  assert.strictEqual(sentType, 'text');

  // Test 1 cached image -> photo
  await sendProductInfo(mockCtx, { ...mockProduct, images: [{ id: 1, telegram_file_id: 'tg_file_123', file_path: 'p.jpg' }] }, 'en');
  assert.strictEqual(sentType, 'photo');
  assert.strictEqual(sentPayload, 'tg_file_123');

  console.log('✔ Telegram Bot Services & Helpers tests passed successfully.');
}

module.exports = { testTelegram };
