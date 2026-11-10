const db = require('../database');

const DEFAULT_SETTINGS = {
  contact_phone: '+855 12 345 678 / +855 98 765 432',
  contact_telegram: '@AdminSupport',
  sales_telegram: '@Skybalsupport',
  contact_sales: '@inforpos',
  sales_chat_id: '',
  sales_chat_auto: '',
  contact_address_en: 'Phnom Penh, Cambodia',
  contact_address_km: 'រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា',
  contact_hours_en: 'Mon - Sat, 8:00 AM - 6:00 PM',
  contact_hours_km: 'ច័ន្ទ - សៅរ៍, ម៉ោង 8:00 ព្រឹក - 6:00 ល្ងាច'
};

const settingsService = {
  getSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = { ...DEFAULT_SETTINGS };

    rows.forEach(r => {
      if (r.value !== null && r.value !== undefined) {
        settings[r.key] = r.value;
      }
    });

    return settings;
  },

  updateSettings(data) {
    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      if (data[key] !== undefined) {
        upsertStmt.run(key, String(data[key]).trim());
      }
    });

    return this.getSettings();
  }
};

module.exports = settingsService;
