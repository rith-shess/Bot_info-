/**
 * Detects whether text contains Khmer characters.
 * Unicode range for Khmer script: \u1780-\u17FF, Khmer symbols: \u19E0-\u19FF
 */
function isKhmerText(text) {
  if (!text || typeof text !== 'string') return false;
  const khmerRegex = /[\u1780-\u17FF\u19E0-\u19FF]/;
  return khmerRegex.test(text);
}

/**
 * Determine response language based on user message and user saved profile
 */
function resolveLanguage(text, userLanguagePreference) {
  if (text && isKhmerText(text)) {
    return 'km';
  }
  if (userLanguagePreference) {
    return userLanguagePreference;
  }
  return 'en';
}

module.exports = {
  isKhmerText,
  resolveLanguage
};
