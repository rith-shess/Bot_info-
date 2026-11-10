const { Markup } = require('telegraf');
const searchService = require('../../services/searchService');
const telegramUserService = require('../../services/telegramUserService');
const { resolveLanguage, isKhmerText } = require('../helpers/languageDetector');
const { getMsg } = require('../messages/i18n');
const { sendProductInfo } = require('../helpers/mediaSender');
const commandHandlers = require('./commandHandlers');
const { buildProductKeyboard } = require('../helpers/productKeyboard');

const messageHandlers = {
  async handleTextMessage(ctx) {
    const text = ctx.message.text;
    if (!text || text.startsWith('/')) return;

    // Detect language and update profile
    const existingUser = telegramUserService.getUser(ctx.from.id);
    const userPreferredLang = existingUser ? existingUser.language_code : 'en';
    const currentLang = resolveLanguage(text, userPreferredLang);

    // Save user interaction with updated language if detected
    telegramUserService.upsertUser(ctx.from, currentLang);
    const i18n = getMsg(currentLang);

    const lowerText = text.toLowerCase().trim();

    // Check for general greeting or catalog overview question
    const isGeneralCatalogQuery = 
      lowerText === 'hi' || lowerText === 'hello' || lowerText === 'hey' ||
      lowerText.includes('what products do you have') ||
      lowerText.includes('show all products') ||
      lowerText.includes('list products') ||
      text.includes('តើមានផលិតផលអ្វីខ្លះ') ||
      text.includes('ផលិតផលទាំងអស់') ||
      text.includes('សួស្តី');

    if (isGeneralCatalogQuery && !lowerText.includes('printer') && !lowerText.includes('scanner') && !text.includes('ព្រីន') && !text.includes('ស្កេន')) {
      return commandHandlers.handleProducts(ctx, 1);
    }

    // Perform database search
    const results = searchService.search(text);

    // Case 1: No product found
    if (!results || results.length === 0) {
      const fallbackButtons = Markup.inlineKeyboard([
        [
          Markup.button.callback(currentLang === 'km' ? '📦 មើលផលិតផលទាំងអស់' : '📦 View All Products', 'cmd_products_1'),
          Markup.button.callback(currentLang === 'km' ? '📂 ប្រភេទផលិតផល' : '📂 Categories', 'cmd_categories')
        ],
        [
          Markup.button.callback(currentLang === 'km' ? '🌐 ប្តូរភាសា' : '🌐 Change Language', 'cmd_language'),
          Markup.button.callback(currentLang === 'km' ? '📞 ទំនាក់ទំនង' : '📞 Contact Support', 'cmd_contact')
        ]
      ]);

      return ctx.reply(i18n.notFound(text), {
        parse_mode: 'Markdown',
        ...fallbackButtons
      });
    }

    // Case 2: Exactly 1 matching product
    if (results.length === 1) {
      const product = results[0];
      return sendProductInfo(ctx, product, currentLang, buildProductKeyboard(product, currentLang).reply_markup);
    }

    // Case 3: Multiple matching products -> list with inline buttons for customer to choose
    const buttons = results.slice(0, 8).map(prod => {
      const name = (currentLang === 'km' && prod.name_km) ? prod.name_km : prod.name_en;
      const price = prod.currency === 'USD' 
        ? `$${Number(prod.price).toFixed(2)}` 
        : `${Number(prod.price).toLocaleString()}៛`;
      return [Markup.button.callback(`${name} - ${price}`, `prod_view_${prod.id}`)];
    });

    return ctx.reply(i18n.multipleMatches(results.length), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }
};

module.exports = messageHandlers;
