const { Markup } = require('telegraf');
const settingsService = require('../../services/settingsService');
const { getMsg } = require('../messages/i18n');
const productService = require('../../services/productService');

const DEFAULT_SALES_HANDLE = 'Skybalsupport';

function getSalesHandle() {
  const raw = String(settingsService.getSettings().sales_telegram || '')
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/t\.me\//i, '');
  return /^[A-Za-z0-9_]{4,32}$/.test(raw) ? raw : DEFAULT_SALES_HANDLE;
}

function formatPrice(product) {
  return product.currency === 'USD'
    ? `$${Number(product.price).toFixed(2)}`
    : `${Number(product.price).toLocaleString()} KHR`;
}

/**
 * Builds the "Buy Now" deep link. Opens a chat with the sales account
 * with a ready-to-send message about this product.
 */
function buildBuyUrl(product, lang) {
  const name = (lang === 'km' && product.name_km) ? product.name_km : product.name_en;
  const price = formatPrice(product);
  const text = lang === 'km'
    ? `សួស្តី! ខ្ញុំចង់ទិញផលិតផលនេះ:\n📦 ${name}\n🔖 SKU: ${product.sku}\n💵 តម្លៃ: ${price}`
    : `Hello! I would like to buy this product:\n📦 ${name}\n🔖 SKU: ${product.sku}\n💵 Price: ${price}`;
  return `https://t.me/${getSalesHandle()}?text=${encodeURIComponent(text)}`;
}

/**
 * Inline keyboard for a product page: a single [Buy Now] button.
 * Tapping it sends the product picture + details to the sales account
 * (see handleBuyNow) and offers a direct chat link to the customer.
 */
function buildProductKeyboard(product, lang) {
  const i18n = getMsg(lang);
  const videos = product.videos || productService.getVideosByProductId(product.id);
  const rows = [];
  if (videos && videos.length > 0) {
    rows.push([Markup.button.callback(i18n.btnWatchVideo, `prod_video_${product.id}`)]);
  }
  rows.push([Markup.button.callback(i18n.btnBuyNow, `buy_now_${product.id}`)]);
  return Markup.inlineKeyboard(rows);
}

/** Just the Buy Now button (attached under videos) */
function buildBuyOnlyKeyboard(product, lang) {
  const i18n = getMsg(lang);
  return Markup.inlineKeyboard([
    [Markup.button.callback(i18n.btnBuyNow, `buy_now_${product.id}`)]
  ]);
}

/**
 * Shown to the customer after Buy Now: opens a chat with the sales account
 * with a ready-to-send message about this product.
 */
function buildChatKeyboard(product, lang) {
  const i18n = getMsg(lang);
  return Markup.inlineKeyboard([
    [Markup.button.url(i18n.btnChatSales, buildBuyUrl(product, lang))]
  ]);
}

module.exports = { buildProductKeyboard, buildBuyOnlyKeyboard, buildChatKeyboard, buildBuyUrl, getSalesHandle };
