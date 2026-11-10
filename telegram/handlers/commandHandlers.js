const { Markup } = require('telegraf');
const { getMsg } = require('../messages/i18n');
const telegramUserService = require('../../services/telegramUserService');
const categoryService = require('../../services/categoryService');
const productService = require('../../services/productService');
const settingsService = require('../../services/settingsService');

const commandHandlers = {
  async handleStart(ctx) {
    if (ctx.callbackQuery) ctx.answerCbQuery().catch(() => {});
    const user = telegramUserService.upsertUser(ctx.from);
    const lang = user ? user.language_code : 'en';
    const i18n = getMsg(lang);

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(lang === 'km' ? '📦 ផលិតផលទាំងអស់' : '📦 All Products', 'cmd_products_1'),
        Markup.button.callback(lang === 'km' ? '📂 ប្រភេទផលិតផល' : '📂 Categories', 'cmd_categories')
      ],
      [
        Markup.button.callback(lang === 'km' ? '🌐 ប្តូរភាសា' : '🌐 Change Language', 'cmd_language'),
        Markup.button.callback(lang === 'km' ? '📞 ទំនាក់ទំនង' : '📞 Contact Info', 'cmd_contact')
      ]
    ]);

    await ctx.reply(i18n.welcome(ctx.from.first_name), {
      parse_mode: 'Markdown',
      ...keyboard
    });
  },

  // /clear - wipes the recent chat (bot + user messages, last 48h) then shows the main menu again
  async handleClear(ctx) {
    const chatId = ctx.chat && ctx.chat.id;
    const currentId = ctx.message && ctx.message.message_id;

    if (chatId && currentId) {
      // Telegram message ids in a private chat are sequential: delete the last ~300 in batches of 100
      for (let top = currentId; top > Math.max(0, currentId - 300); top -= 100) {
        const ids = [];
        for (let id = top; id > Math.max(0, top - 100); id--) ids.push(id);
        try {
          await ctx.telegram.deleteMessages(chatId, ids);
        } catch (err) {
          // Fallback: delete one by one (missing/old messages are simply skipped)
          for (const id of ids) {
            await ctx.telegram.deleteMessage(chatId, id).catch(() => {});
          }
        }
      }
    }

    // Show the welcome menu again so the chat is never left empty
    return commandHandlers.handleStart(ctx);
  },

  async handleHelp(ctx) {
    if (ctx.callbackQuery) ctx.answerCbQuery().catch(() => {});
    const lang = telegramUserService.getLanguage(ctx.from.id);
    const i18n = getMsg(lang);
    await ctx.reply(i18n.help, { parse_mode: 'Markdown' });
  },

  async handleLanguage(ctx) {
    if (ctx.callbackQuery) ctx.answerCbQuery().catch(() => {});
    const lang = telegramUserService.getLanguage(ctx.from.id);
    const i18n = getMsg(lang);

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🇺🇸 English', 'set_lang_en'),
        Markup.button.callback('🇰🇭 ភាសាខ្មែរ (Khmer)', 'set_lang_km')
      ]
    ]);

    await ctx.reply(i18n.selectLanguage, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  },

  async handleContact(ctx) {
    if (ctx.callbackQuery) ctx.answerCbQuery().catch(() => {});
    const lang = telegramUserService.getLanguage(ctx.from.id);
    const settings = settingsService.getSettings();

    // Escape underscores so Telegram Markdown doesn't break on handles like @my_shop
    const salesContact = String(settings.contact_sales || '').trim().replace(/_/g, '\\_');

    let text;
    if (lang === 'km') {
      text = `📞 *ព័ត៌មានទំនាក់ទំនង និងហាង:*\n\n` +
             `🏢 *ទីតាំង:* ${settings.contact_address_km || settings.contact_address_en}\n` +
             `📱 *Telegram អ្នកគ្រប់គ្រង:* ${settings.contact_telegram}\n` +
             (salesContact ? `🛒 *ទំនាក់ទំនងផ្នែកលក់:* ${salesContact}\n` : '') +
             `☎️ *លេខទូរស័ព្ទ:* ${settings.contact_phone}\n` +
             `⏰ *ម៉ោងធ្វើការ:* ${settings.contact_hours_km || settings.contact_hours_en}\n\n` +
             `សូមទាក់ទងមកយើងខ្ញុំសម្រាប់ការបញ្ជាទិញ និងព័ត៌មានបន្ថែម!`;
    } else {
      text = `📞 *Contact Support & Store Info:*\n\n` +
             `🏢 *Office / Store:* ${settings.contact_address_en}\n` +
             `📱 *Telegram Admin:* ${settings.contact_telegram}\n` +
             (salesContact ? `🛒 *Sales Contact:* ${salesContact}\n` : '') +
             `☎️ *Phone:* ${settings.contact_phone}\n` +
             `⏰ *Working Hours:* ${settings.contact_hours_en}\n\n` +
             `Feel free to reach out to us for orders and inquiries!`;
    }

    await ctx.reply(text, { parse_mode: 'Markdown' });
  },

  async handleCategories(ctx) {
    if (ctx.callbackQuery) ctx.answerCbQuery().catch(() => {});
    const lang = telegramUserService.getLanguage(ctx.from.id);
    const i18n = getMsg(lang);

    const categories = categoryService.getAllCategories();
    if (!categories || categories.length === 0) {
      return ctx.reply(i18n.noProducts);
    }

    const buttons = categories.map(cat => {
      const name = (lang === 'km' && cat.name_km) ? cat.name_km : cat.name_en;
      return [Markup.button.callback(`📁 ${name} (${cat.product_count})`, `view_cat_${cat.id}_1`)];
    });

    await ctx.reply(i18n.categoriesTitle, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  },

  async handleProducts(ctx, page = 1) {
    if (ctx.callbackQuery) ctx.answerCbQuery().catch(() => {});
    const lang = telegramUserService.getLanguage(ctx.from.id);
    const i18n = getMsg(lang);

    const limit = 5;
    const offset = (page - 1) * limit;

    const products = productService.getAllProducts({ isActive: 1, limit, offset });
    const total = productService.getTotalCount({ isActive: 1 });
    const totalPages = Math.ceil(total / limit) || 1;

    if (!products || products.length === 0) {
      return ctx.reply(i18n.noProducts);
    }

    const buttons = products.map(p => {
      const name = (lang === 'km' && p.name_km) ? p.name_km : p.name_en;
      const price = p.currency === 'USD' ? `$${Number(p.price).toFixed(2)}` : `${Number(p.price).toLocaleString()}៛`;
      return [Markup.button.callback(`${name} - ${price}`, `prod_view_${p.id}`)];
    });

    // Pagination buttons
    const navButtons = [];
    if (page > 1) {
      navButtons.push(Markup.button.callback('⬅️ Prev', `cmd_products_${page - 1}`));
    }
    if (page < totalPages) {
      navButtons.push(Markup.button.callback('Next ➡️', `cmd_products_${page + 1}`));
    }
    if (navButtons.length > 0) {
      buttons.push(navButtons);
    }

    await ctx.reply(i18n.productsTitle(page, totalPages), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }
};

module.exports = commandHandlers;
