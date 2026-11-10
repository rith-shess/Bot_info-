const { Markup } = require('telegraf');
const { getMsg } = require('../messages/i18n');
const telegramUserService = require('../../services/telegramUserService');
const categoryService = require('../../services/categoryService');
const productService = require('../../services/productService');
const { sendProductInfo } = require('../helpers/mediaSender');
const { buildProductKeyboard, buildBuyOnlyKeyboard, buildChatKeyboard } = require('../helpers/productKeyboard');
const { sendProductVideos } = require('../helpers/videoSender');
const { notifySales } = require('../helpers/salesNotifier');

// Prevents spamming the sales team when a customer taps Buy Now repeatedly
const BUY_COOLDOWN_MS = 60 * 1000;
const recentBuyRequests = new Map();

// Videos currently being uploaded (prevents a second tap from starting a second 40MB upload)
const sendingVideos = new Set();

const actionHandlers = {
  async handleLanguageChange(ctx, chosenLang) {
    ctx.answerCbQuery().catch(() => {});
    telegramUserService.setLanguage(ctx.from.id, chosenLang);
    const i18n = getMsg(chosenLang);
    await ctx.reply(i18n.languageChanged, { parse_mode: 'Markdown' });
  },

  async handleProductView(ctx, productId) {
    ctx.answerCbQuery().catch(() => {});
    const lang = telegramUserService.getLanguage(ctx.from.id);
    const i18n = getMsg(lang);

    const product = productService.getProductById(productId);
    if (!product || product.is_active === 0) {
      return ctx.reply(i18n.notFound('ID ' + productId));
    }

    const keyboard = buildProductKeyboard(product, lang);

    await sendProductInfo(ctx, product, lang, keyboard.reply_markup);
  },

  async handleProductVideo(ctx, productId) {
    ctx.answerCbQuery().catch(() => {});
    const lang = telegramUserService.getLanguage(ctx.from.id);
    const i18n = getMsg(lang);

    const product = productService.getProductById(productId);
    if (!product || product.is_active === 0) {
      return ctx.reply(i18n.notFound('ID ' + productId));
    }
    if (!product.videos || product.videos.length === 0) {
      return ctx.reply(i18n.noVideos);
    }

    const sendKey = `${ctx.from.id}:${productId}`;
    if (sendingVideos.has(sendKey)) {
      return ctx.reply(i18n.videoSending);
    }
    sendingVideos.add(sendKey);

    // A video that is not on Telegram yet must be uploaded first (can take a while): tell the customer
    const needsUpload = product.videos.some(v => !v.telegram_file_id);
    let waitMsg = null;
    if (needsUpload) {
      waitMsg = await ctx.reply(i18n.videoSending).catch(() => null);
    }
    ctx.sendChatAction('upload_video').catch(() => {});
    const keepAlive = setInterval(() => ctx.sendChatAction('upload_video').catch(() => {}), 4000);

    const buyKeyboard = buildBuyOnlyKeyboard(product, lang);
    let result;
    try {
      result = await sendProductVideos(ctx, product, lang, buyKeyboard.reply_markup);
    } finally {
      clearInterval(keepAlive);
      sendingVideos.delete(sendKey);
      if (waitMsg && waitMsg.message_id && ctx.chat) {
        ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      }
    }

    // Videos too big for Telegram's bot upload limit: offer a link to watch them
    if (result.links.length > 0) {
      const rows = result.links.map((item, idx) => [
        Markup.button.url(`▶️ ${i18n.btnWatchVideo} ${result.links.length > 1 ? idx + 1 : ''}`.trim(), item.url)
      ]);
      rows.push([Markup.button.callback(i18n.btnBuyNow, `buy_now_${product.id}`)]);
      await ctx.reply(i18n.videoLargeLink, Markup.inlineKeyboard(rows));
    }

    // Could not deliver at all: be honest and point to the sales team
    if (result.tooLarge.length > 0 || (result.sent === 0 && result.links.length === 0 && result.failed.length > 0)) {
      await ctx.reply(i18n.videoUnavailable, buildChatKeyboard(product, lang));
    }
  },

  async handleBuyNow(ctx, productId) {
    ctx.answerCbQuery().catch(() => {});
    const lang = telegramUserService.getLanguage(ctx.from.id);
    const i18n = getMsg(lang);

    const product = productService.getProductById(productId);
    if (!product || product.is_active === 0) {
      return ctx.reply(i18n.notFound('ID ' + productId));
    }

    const key = `${ctx.from.id}:${productId}`;
    const now = Date.now();
    let delivered = false;

    if (now - (recentBuyRequests.get(key) || 0) < BUY_COOLDOWN_MS) {
      delivered = true; // already sent a moment ago - don't notify sales twice
    } else {
      ctx.sendChatAction('typing').catch(() => {});
      const result = await notifySales(ctx, product, lang);
      delivered = result.sent;
      if (result.sent) {
        recentBuyRequests.set(key, now);
        for (const [k, t] of recentBuyRequests) {
          if (now - t > 10 * BUY_COOLDOWN_MS) recentBuyRequests.delete(k);
        }
      } else {
        console.warn('[Telegram] Buy Now: could not notify sales team:', result.error);
      }
    }

    const name = (lang === 'km' && product.name_km) ? product.name_km : product.name_en;
    const text = delivered ? i18n.buyRequestSent(name) : i18n.buyChatPrompt;
    return ctx.reply(text, buildChatKeyboard(product, lang));
  },

  async handleCategoryView(ctx, categoryId, page = 1) {
    ctx.answerCbQuery().catch(() => {});
    const lang = telegramUserService.getLanguage(ctx.from.id);
    const i18n = getMsg(lang);

    const category = categoryService.getCategoryById(categoryId);
    if (!category) {
      return ctx.reply('Category not found.');
    }

    const products = categoryService.getProductsByCategory(categoryId, true);
    if (!products || products.length === 0) {
      return ctx.reply(i18n.noProductsInCategory, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback(i18n.btnBackToCategories, 'cmd_categories')]
        ])
      });
    }

    const catName = (lang === 'km' && category.name_km) ? category.name_km : category.name_en;
    const buttons = products.map(p => {
      const pName = (lang === 'km' && p.name_km) ? p.name_km : p.name_en;
      const price = p.currency === 'USD' ? `$${Number(p.price).toFixed(2)}` : `${Number(p.price).toLocaleString()}៛`;
      return [Markup.button.callback(`${pName} - ${price}`, `prod_view_${p.id}`)];
    });

    buttons.push([Markup.button.callback(i18n.btnBackToCategories, 'cmd_categories')]);

    await ctx.reply(`📂 *${catName}:*\n${lang === 'km' ? 'សូមជ្រើសរើសផលិតផល:' : 'Select a product to view details & pictures:'}`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }
};

module.exports = actionHandlers;
