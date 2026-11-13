const { Telegraf } = require('telegraf');
const config = require('../config');
const commandHandlers = require('./handlers/commandHandlers');
const actionHandlers = require('./handlers/actionHandlers');
const messageHandlers = require('./handlers/messageHandlers');
const { registerIfSales, getSalesChatId } = require('./helpers/salesNotifier');

let bot = null;
let botStatus = {
  connected: false,
  username: null,
  firstName: null,
  error: null,
  startedAt: null
};

function initBot() {
  if (!config.botToken || config.botToken.trim() === '' || config.botToken === 'YOUR_TELEGRAM_BOT_TOKEN') {
    botStatus = {
      connected: false,
      username: null,
      firstName: null,
      error: 'BOT_TOKEN is missing or not configured in .env',
      startedAt: null
    };
    console.warn('[Telegram] Warning: BOT_TOKEN is not configured. Telegram bot is currently inactive. Admin dashboard is fully operational.');
    return null;
  }

  try {
    bot = new Telegraf(config.botToken);

    // Global middleware: Instantly dismiss callback button spinners on Telegram client
    bot.use(async (ctx, next) => {
      if (ctx.callbackQuery) {
        ctx.answerCbQuery().catch(() => {});
      }

      // When the sales account opens the bot, remember its chat so Buy Now requests can be delivered
      try {
        if (registerIfSales(ctx)) {
          console.log(`[Telegram] Sales account @${ctx.from.username} registered (chat ${ctx.chat.id}) - Buy Now requests will be delivered here.`);
          await ctx.reply('✅ You are now registered as the sales account.\nBuy Now requests from customers (with the product picture) will be sent to you here.').catch(() => {});
        }
      } catch (e) {
        console.error('[Telegram] Sales registration error:', e.message);
      }
      return next();
    });

    // Command handlers
    bot.command('start', commandHandlers.handleStart);
    bot.command('help', commandHandlers.handleHelp);
    bot.command('products', ctx => commandHandlers.handleProducts(ctx, 1));
    bot.command('categories', commandHandlers.handleCategories);
    bot.command('language', commandHandlers.handleLanguage);
    bot.command('contact', commandHandlers.handleContact);
    bot.command('clear', commandHandlers.handleClear);

    // Action handlers (Inline keyboards)
    bot.action('set_lang_en', ctx => actionHandlers.handleLanguageChange(ctx, 'en'));
    bot.action('set_lang_km', ctx => actionHandlers.handleLanguageChange(ctx, 'km'));

    bot.action(/^buy_now_(\d+)$/, ctx => {
      const prodId = parseInt(ctx.match[1], 10);
      return actionHandlers.handleBuyNow(ctx, prodId);
    });

    bot.action('cmd_categories', commandHandlers.handleCategories);
    bot.action('cmd_language', commandHandlers.handleLanguage);
    bot.action('cmd_contact', commandHandlers.handleContact);

    bot.action(/^cmd_products_(\d+)$/, ctx => {
      const page = parseInt(ctx.match[1], 10) || 1;
      return commandHandlers.handleProducts(ctx, page);
    });

    bot.action(/^view_cat_(\d+)_(\d+)$/, ctx => {
      const catId = parseInt(ctx.match[1], 10);
      const page = parseInt(ctx.match[2], 10) || 1;
      return actionHandlers.handleCategoryView(ctx, catId, page);
    });

    bot.action(/^prod_view_(\d+)$/, ctx => {
      const prodId = parseInt(ctx.match[1], 10);
      return actionHandlers.handleProductView(ctx, prodId);
    });

    // Natural language query handler
    bot.on('text', messageHandlers.handleTextMessage);

    // Error handling
    bot.catch((err, ctx) => {
      console.error(`[Telegram] Error encountered for ${ctx.updateType}:`, err);
    });

    return bot;
  } catch (error) {
    botStatus = {
      connected: false,
      username: null,
      firstName: null,
      error: error.message,
      startedAt: null
    };
    console.error('[Telegram] Initialization failed:', error.message);
    return null;
  }
}

async function startBot() {
  const instance = initBot();
  if (!instance) return;

  try {
    const me = await instance.telegram.getMe();
    botStatus = {
      connected: true,
      username: me.username,
      firstName: me.first_name,
      error: null,
      startedAt: new Date().toISOString()
    };
    console.log(`[Telegram] Bot started successfully as @${me.username} (${me.first_name})`);
    try {
      const { getSalesHandle } = require('./helpers/productKeyboard');
      console.log(`[Telegram] Buy Now button ACTIVE -> sales account @${getSalesHandle()}`);
      if (getSalesChatId()) {
        console.log('[Telegram] Sales notifications READY (product pictures will be sent to the sales chat).');
      } else {
        console.warn(`[Telegram] Sales notifications NOT ready: ask @${getSalesHandle()} to open the bot and send /start once (or set "Sales Chat ID" in Settings).`);
      }
    } catch (e) {
      console.error('[Telegram] Buy Now helper NOT loaded:', e.message);
    }

    // Telegram "Menu" button: list of commands shown next to the message box
    try {
      const commandsEn = [
        { command: 'start', description: 'Start the bot' },
        { command: 'products', description: 'View all products' },
        { command: 'categories', description: 'Browse by category' },
        { command: 'language', description: 'Change language' },
        { command: 'contact', description: 'Contact & store info' },
        { command: 'help', description: 'How to use this bot' },
        { command: 'clear', description: 'Clear chat' }
      ];
      const commandsKm = [
        { command: 'start', description: 'ចាប់ផ្តើមប្រើប្រាស់' },
        { command: 'products', description: 'មើលផលិតផលទាំងអស់' },
        { command: 'categories', description: 'មើលតាមប្រភេទ' },
        { command: 'language', description: 'ប្តូរភាសា' },
        { command: 'contact', description: 'ព័ត៌មានទំនាក់ទំនង' },
        { command: 'help', description: 'របៀបប្រើប្រាស់' },
        { command: 'clear', description: 'សម្អាតការសន្ទនា' }
      ];
      await instance.telegram.setMyCommands(commandsEn);
      await instance.telegram.setMyCommands(commandsKm, { language_code: 'km' });
      await instance.telegram.setChatMenuButton({ menuButton: { type: 'commands' } });
      console.log('[Telegram] Menu commands registered (start, products, categories, language, contact, help, clear)');
    } catch (e) {
      console.error('[Telegram] Could not register menu commands:', e.message);
    }

    // Launch polling in background
    instance.launch({
      dropPendingUpdates: true
    }).catch(err => {
      console.error('[Telegram] Polling error:', err.message);
      botStatus.connected = false;
      botStatus.error = err.message;
    });

    // Enable graceful stop
    process.once('SIGINT', () => instance.stop('SIGINT'));
    process.once('SIGTERM', () => instance.stop('SIGTERM'));
  } catch (error) {
    botStatus = {
      connected: false,
      username: null,
      firstName: null,
      error: error.message,
      startedAt: null
    };
    console.error('[Telegram] Failed to connect bot to Telegram API:', error.message);
  }
}

function getStatus() {
  return botStatus;
}

function getBotInstance() {
  return bot;
}

module.exports = {
  initBot,
  startBot,
  getStatus,
  getBotInstance
};
