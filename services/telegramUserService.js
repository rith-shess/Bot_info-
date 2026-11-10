const db = require('../database');

const telegramUserService = {
  getUser(telegramId) {
    return db.prepare('SELECT * FROM telegram_users WHERE telegram_id = ?').get(telegramId);
  },

  upsertUser(from, forcedLang = null) {
    const existing = this.getUser(from.id);
    const lang = forcedLang || (existing ? existing.language_code : 'en');

    if (existing) {
      db.prepare(`
        UPDATE telegram_users
        SET first_name = ?, last_name = ?, username = ?, language_code = ?, last_interaction = CURRENT_TIMESTAMP
        WHERE telegram_id = ?
      `).run(
        from.first_name || '',
        from.last_name || '',
        from.username || '',
        lang,
        from.id
      );
      return this.getUser(from.id);
    } else {
      db.prepare(`
        INSERT INTO telegram_users (telegram_id, first_name, last_name, username, language_code, last_interaction)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        from.id,
        from.first_name || '',
        from.last_name || '',
        from.username || '',
        lang
      );
      return this.getUser(from.id);
    }
  },

  setLanguage(telegramId, languageCode) {
    db.prepare(`
      UPDATE telegram_users
      SET language_code = ?, last_interaction = CURRENT_TIMESTAMP
      WHERE telegram_id = ?
    `).run(languageCode, telegramId);
    return this.getUser(telegramId);
  },

  getLanguage(telegramId) {
    const user = this.getUser(telegramId);
    return user ? user.language_code : 'en';
  }
};

module.exports = telegramUserService;
