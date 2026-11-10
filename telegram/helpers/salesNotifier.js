const fs = require('fs');
const path = require('path');
const config = require('../../config');
const settingsService = require('../../services/settingsService');
const productService = require('../../services/productService');
const { getSalesHandle } = require('./productKeyboard');

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Where "Buy Now" requests are delivered:
 *  1) Sales Chat ID typed in the dashboard (works for a person OR a group), else
 *  2) the sales account, once it has opened the bot and pressed /start.
 */
function getSalesChatId() {
  const s = settingsService.getSettings();
  const manual = String(s.sales_chat_id || '').trim();
  if (manual) return manual;

  const [handle, id] = String(s.sales_chat_auto || '').split('|');
  if (handle && id && handle.toLowerCase() === getSalesHandle().toLowerCase()) return id;
  return null;
}

/**
 * Called for every update. When the sales account talks to the bot (e.g. /start)
 * its chat id is remembered, so the bot is allowed to message it later.
 * Returns true only when something new was registered.
 */
function registerIfSales(ctx) {
  const from = ctx.from;
  if (!from || !from.username || !ctx.chat || ctx.chat.type !== 'private') return false;
  if (from.username.toLowerCase() !== getSalesHandle().toLowerCase()) return false;

  const value = `${from.username}|${ctx.chat.id}`;
  if (settingsService.getSettings().sales_chat_auto === value) return false;

  settingsService.updateSettings({ sales_chat_auto: value });
  return true;
}

function formatPrice(product) {
  return product.currency === 'USD'
    ? `$${Number(product.price).toFixed(2)}`
    : `${Number(product.price).toLocaleString()} KHR`;
}

function buildCaption(ctx, product, lang) {
  const from = ctx.from || {};
  const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Customer';
  const when = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', hour12: false });

  let text = '🛒 <b>New Buy Now request</b>\n\n';
  text += `📦 <b>${esc(product.name_en)}</b>\n`;
  if (product.name_km) text += `${esc(product.name_km)}\n`;
  text += `🔖 SKU: <code>${esc(product.sku)}</code>\n`;
  if (product.category_name_en) text += `📂 ${esc(product.category_name_en)}\n`;
  text += `💵 Price: <b>${esc(formatPrice(product))}</b>\n\n`;
  text += `👤 Customer: <a href="tg://user?id=${from.id}">${esc(fullName.slice(0, 60))}</a>`;
  if (from.username) text += ` (@${esc(from.username)})`;
  text += `\n🌐 Language: ${lang === 'km' ? 'Khmer' : 'English'}`;
  text += `\n🕒 ${esc(when)}`;
  return text.slice(0, 1000); // Telegram caption limit is 1024
}

async function callTelegram(method, form) {
  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/${method}`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(10000)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || `${method} failed`);
  return data.result;
}

function localImage(img) {
  const full = path.isAbsolute(img.file_path) ? img.file_path : path.join(config.paths.uploads, img.file_path);
  if (!fs.existsSync(full)) return null;
  const ext = path.extname(full).toLowerCase();
  return {
    blob: new Blob([fs.readFileSync(full)], { type: MIME[ext] || 'image/jpeg' }),
    name: path.basename(full)
  };
}

function cacheFileId(img, message) {
  try {
    if (message && message.photo && message.photo.length > 0) {
      productService.saveTelegramFileId(img.id, message.photo[message.photo.length - 1].file_id);
    }
  } catch (e) { /* caching is only an optimisation */ }
}

async function sendText(chatId, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('text', caption);
  form.append('parse_mode', 'HTML');
  return callTelegram('sendMessage', form);
}

async function sendOnePhoto(chatId, img, caption) {
  // 1) Fast path: cached file_id
  if (img.telegram_file_id) {
    try {
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('photo', img.telegram_file_id);
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
      return await callTelegram('sendPhoto', form);
    } catch (err) {
      console.warn('[Telegram] Cached file_id failed for sales photo, uploading file:', err.message);
    }
  }
  // 2) Upload the local file
  const local = localImage(img);
  if (!local) return sendText(chatId, caption);
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('photo', local.blob, local.name);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  const sent = await callTelegram('sendPhoto', form);
  cacheFileId(img, sent);
  return sent;
}

async function sendPhotoGroup(chatId, images, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  const media = images.map((img, idx) => {
    const item = { type: 'photo' };
    if (img.telegram_file_id) {
      item.media = img.telegram_file_id;
    } else {
      item.media = `attach://attach_${idx}`;
      const local = localImage(img);
      form.append(`attach_${idx}`, local.blob, local.name);
    }
    if (idx === 0) {
      item.caption = caption;
      item.parse_mode = 'HTML';
    }
    return item;
  });
  form.append('media', JSON.stringify(media));
  const sent = await callTelegram('sendMediaGroup', form);
  if (Array.isArray(sent)) sent.forEach((msg, idx) => { if (!images[idx].telegram_file_id) cacheFileId(images[idx], msg); });
  return sent;
}

/**
 * Sends the product picture(s) + product details + customer info to the sales chat.
 * Returns { sent: true } or { sent: false, error }.
 */
async function notifySales(ctx, product, lang) {
  const chatId = getSalesChatId();
  if (!chatId) return { sent: false, error: 'Sales chat is not registered yet' };

  try {
    const caption = buildCaption(ctx, product, lang);
    const images = (product.images || [])
      .filter(img => img.telegram_file_id || localImage(img))
      .slice(0, 5);

    if (images.length === 0) await sendText(chatId, caption);
    else if (images.length === 1) await sendOnePhoto(chatId, images[0], caption);
    else await sendPhotoGroup(chatId, images, caption);

    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

module.exports = { getSalesChatId, registerIfSales, notifySales };
