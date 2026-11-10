const fs = require('fs');
const path = require('path');
const config = require('../../config');
const productService = require('../../services/productService');
const { getMsg } = require('../messages/i18n');

/**
 * Upload single local photo directly via native Fetch & FormData
 * avoiding Telegraf streaming bugs on Windows/Node 26.
 */
async function uploadPhotoDirectly(chatId, filePath, caption, replyMarkup = null) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(config.paths.uploads, filePath);
  if (!fs.existsSync(fullPath)) return null;

  const fileData = fs.readFileSync(fullPath);
  const blob = new Blob([fileData], { type: 'image/jpeg' });

  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('photo', blob, path.basename(fullPath));
  if (caption) {
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
  }
  if (replyMarkup) {
    form.append('reply_markup', JSON.stringify(replyMarkup));
  }

  const url = `https://api.telegram.org/bot${config.botToken}/sendPhoto`;
  const response = await fetch(url, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(8000) // 8s safety timeout
  });

  const data = await response.json();
  if (data.ok && data.result) {
    return data.result;
  } else {
    throw new Error(data.description || 'Failed to upload photo to Telegram');
  }
}

/**
 * Upload multiple local photos directly via native Fetch as MediaGroup
 */
async function uploadMediaGroupDirectly(chatId, imagesWithPaths, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));

  const mediaArray = [];
  imagesWithPaths.forEach((img, idx) => {
    const attachName = `attach_${idx}`;
    const item = {
      type: 'photo',
      media: img.telegram_file_id ? img.telegram_file_id : `attach://${attachName}`
    };
    if (idx === 0 && caption) {
      item.caption = caption;
      item.parse_mode = 'Markdown';
    }
    mediaArray.push(item);

    if (!img.telegram_file_id) {
      const fullPath = path.isAbsolute(img.file_path) ? img.file_path : path.join(config.paths.uploads, img.file_path);
      const fileData = fs.readFileSync(fullPath);
      const blob = new Blob([fileData], { type: 'image/jpeg' });
      form.append(attachName, blob, path.basename(fullPath));
    }
  });

  form.append('media', JSON.stringify(mediaArray));

  const url = `https://api.telegram.org/bot${config.botToken}/sendMediaGroup`;
  const response = await fetch(url, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(10000)
  });

  const data = await response.json();
  if (data.ok && data.result) {
    return data.result;
  } else {
    throw new Error(data.description || 'Failed to upload media group to Telegram');
  }
}

async function sendProductInfo(ctx, product, lang = 'en', inlineButtons = null) {
  const i18n = getMsg(lang);
  const text = i18n.formatProduct(product);
  const chatId = ctx.chat ? ctx.chat.id : (ctx.from ? ctx.from.id : null);

  // Send immediate visual typing feedback
  ctx.sendChatAction('upload_photo').catch(() => {});

  const images = product.images || [];

  // Filter to images that actually exist on disk or have cached file_id
  const validImages = images.filter(img => {
    if (img.telegram_file_id) return true;
    const fullPath = path.join(config.paths.uploads, img.file_path);
    return fs.existsSync(fullPath);
  });

  const extraOptions = {
    parse_mode: 'Markdown'
  };
  if (inlineButtons) {
    extraOptions.reply_markup = inlineButtons;
  }

  // Case 1: No images -> send formatted markdown text instantly
  if (validImages.length === 0) {
    return ctx.reply(text, extraOptions);
  }

  // Case 2: Exactly 1 image
  if (validImages.length === 1) {
    const img = validImages[0];

    // Subcase 2A: If cached file_id exists, send via Telegraf in 200ms
    if (img.telegram_file_id) {
      try {
        return await ctx.replyWithPhoto(img.telegram_file_id, {
          caption: text,
          parse_mode: 'Markdown',
          reply_markup: inlineButtons
        });
      } catch (err) {
        console.warn('[Telegram] Cached file_id failed, uploading fresh file:', err.message);
      }
    }

    // Subcase 2B: Local file -> upload with native fetch & cache file_id
    try {
      const fullPath = path.join(config.paths.uploads, img.file_path);
      const sentMsg = await uploadPhotoDirectly(chatId, fullPath, text, inlineButtons);

      if (sentMsg && sentMsg.photo && sentMsg.photo.length > 0) {
        const fileId = sentMsg.photo[sentMsg.photo.length - 1].file_id;
        productService.saveTelegramFileId(img.id, fileId);
      }
      return sentMsg;
    } catch (err) {
      console.error('[Telegram] Native photo upload failed, sending text fallback:', err.message);
      return ctx.reply(text, extraOptions);
    }
  }

  // Case 3: Multiple images
  try {
    const allCached = validImages.every(img => Boolean(img.telegram_file_id));

    if (allCached) {
      // Send directly via Telegraf media group
      const media = validImages.map((img, index) => {
        const item = {
          type: 'photo',
          media: img.telegram_file_id
        };
        if (index === 0) {
          item.caption = text;
          item.parse_mode = 'Markdown';
        }
        return item;
      });
      const sentGroup = await ctx.replyWithMediaGroup(media);
      if (inlineButtons) {
        await ctx.reply(lang === 'km' ? 'ជម្រើសបន្ថែម:' : 'Actions:', { reply_markup: inlineButtons });
      }
      return sentGroup;
    } else {
      // Upload via native fetch
      const sentGroup = await uploadMediaGroupDirectly(chatId, validImages, text);
      if (Array.isArray(sentGroup)) {
        sentGroup.forEach((msg, idx) => {
          if (validImages[idx] && !validImages[idx].telegram_file_id && msg.photo && msg.photo.length > 0) {
            const fileId = msg.photo[msg.photo.length - 1].file_id;
            productService.saveTelegramFileId(validImages[idx].id, fileId);
          }
        });
      }
      if (inlineButtons) {
        await ctx.reply(lang === 'km' ? 'ជម្រើសបន្ថែម:' : 'Actions:', { reply_markup: inlineButtons });
      }
      return sentGroup;
    }
  } catch (err) {
    console.error('[Telegram] Media group upload failed, sending text fallback:', err.message);
    return ctx.reply(text, extraOptions);
  }
}

module.exports = {
  sendProductInfo
};
