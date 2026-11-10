const fs = require('fs');
const path = require('path');
const config = require('../../config');
const productService = require('../../services/productService');

// The standard (cloud) Telegram Bot API accepts uploads up to 50MB. Stay a little below it.
const BOT_API_UPLOAD_LIMIT = 49 * 1024 * 1024;

/**
 * Telegram only accepts public https links in buttons (not localhost / private IPs).
 */
function isPublicBaseUrl() {
  try {
    const u = new URL(config.baseUrl);
    if (u.protocol !== 'https:') return false;
    return !/^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0$|\[?::1)/i.test(u.hostname);
  } catch (e) {
    return false;
  }
}

function videoPath(video) {
  return path.join(config.paths.videos, video.file_path);
}

function videoUrl(video) {
  return `${config.baseUrl.replace(/\/$/, '')}/uploads/videos/${encodeURIComponent(video.file_path)}`;
}

function fileIdFrom(message) {
  if (!message) return null;
  if (message.video) return message.video.file_id;
  if (message.document) return message.document.file_id;
  return null;
}

/**
 * Uploads a local video (<= 49MB) with native fetch + FormData.
 */
async function uploadVideoDirectly(chatId, video, caption, replyMarkup) {
  const fullPath = videoPath(video);
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('video', new Blob([fs.readFileSync(fullPath)], { type: video.mime_type || 'video/mp4' }), path.basename(fullPath));
  form.append('supports_streaming', 'true');
  if (caption) form.append('caption', caption);
  if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));

  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendVideo`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(20 * 60 * 1000) // slow home upload speeds: allow up to 20 minutes
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || 'Failed to upload video to Telegram');
  return data.result;
}

/**
 * Sends every video of a product into the chat.
 *  - cached file_id        -> instant, any size
 *  - file up to ~49MB      -> uploaded once, file_id cached for next time
 *  - bigger file           -> cannot be uploaded by a bot; returned in `links` (public https
 *                             server only) or `tooLarge` so the caller can tell the customer
 * Returns { sent, links: [{video, url}], tooLarge: [video], failed: [video] }
 */
async function sendProductVideos(ctx, product, lang, replyMarkup = null) {
  const result = { sent: 0, links: [], tooLarge: [], failed: [] };
  const chatId = ctx.chat ? ctx.chat.id : ctx.from.id;
  const name = (lang === 'km' && product.name_km) ? product.name_km : product.name_en;
  const videos = product.videos || [];

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const caption = `🎬 ${name}${videos.length > 1 ? ` (${i + 1}/${videos.length})` : ''}`.slice(0, 1000);
    const extra = { caption, supports_streaming: true };
    if (replyMarkup) extra.reply_markup = replyMarkup;

    // 1) Cached file_id
    if (video.telegram_file_id) {
      try {
        await ctx.replyWithVideo(video.telegram_file_id, extra);
        result.sent++;
        continue;
      } catch (err) {
        console.warn('[Telegram] Cached video file_id failed, trying the file again:', err.message);
      }
    }

    // 2) Local file must exist
    if (!fs.existsSync(videoPath(video))) {
      console.warn(`[Telegram] Video file missing on disk: ${video.file_path}`);
      result.failed.push(video);
      continue;
    }

    const size = video.file_size || fs.statSync(videoPath(video)).size;

    // 3) Small enough -> upload and cache
    if (size <= BOT_API_UPLOAD_LIMIT) {
      try {
        const sent = await uploadVideoDirectly(chatId, video, caption, replyMarkup);
        const fileId = fileIdFrom(sent);
        if (fileId) productService.saveTelegramVideoFileId(video.id, fileId);
        result.sent++;
      } catch (err) {
        const reason = err.cause ? ` (${err.cause.code || err.cause.message})` : '';
        console.error(`[Telegram] Video upload failed for "${video.original_name}": ${err.message}${reason}`);
        result.failed.push(video);
      }
      continue;
    }

    // 4) Too big for the Bot API
    if (isPublicBaseUrl()) {
      result.links.push({ video, url: videoUrl(video) });
    } else {
      console.warn(`[Telegram] Video "${video.original_name}" is ${(size / 1024 / 1024).toFixed(0)}MB: too big to upload through the Bot API (50MB) and BASE_URL (${config.baseUrl}) is not a public https address, so customers cannot open it. Set BASE_URL=https://your-domain in .env.`);
      result.tooLarge.push(video);
    }
  }

  return result;
}

module.exports = { sendProductVideos, isPublicBaseUrl, BOT_API_UPLOAD_LIMIT };
