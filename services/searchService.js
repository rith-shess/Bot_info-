const db = require('../database');

// Common conversational stop words / filler phrases in English and Khmer
const EN_STOPWORDS = new Set([
  'do', 'you', 'have', 'a', 'an', 'the', 'how', 'much', 'is', 'are', 'what', 'can',
  'show', 'me', 'your', 'picture', 'photo', 'images', 'price', 'cost', 'please',
  'any', 'available', 'tell', 'about', 'want', 'to', 'buy', 'looking', 'for', 'need',
  'of', 'this', 'that', 'these', 'those', 'there'
]);

const KM_STOPWORDS = [
  'តើមាន', 'តើ', 'មាន', 'ទេ', 'តម្លៃប៉ុន្មាន', 'ថ្លៃប៉ុន្មាន', 'ប៉ុន្មាន', 'តម្លៃ',
  'សូមបង្ហាញ', 'បង្ហាញ', 'រូបភាព', 'រូប', 'ផលិតផលនេះ', 'ផលិតផល',
  'ចង់បាន', 'ចង់ទិញ', 'ត្រូវការ', 'សូម', 'ជួយ', 'ប្រាប់',
  'នេះ', 'នោះ', 'មួយណា', 'ទាំងនេះ', 'ឯណា', 'អត់', 'អី', 'អ្វី', 'ខ្លះ', 'ផង', 'ដែរ', 'ណា'
];

const searchService = {
  /**
   * Extract key search tokens from user sentence in English or Khmer
   */
  extractKeywords(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();

    // Khmer cleaning: remove known question particles/intent words
    // Sort stopwords by descending length so compound phrases are matched first
    const sortedKm = [...KM_STOPWORDS].sort((a, b) => b.length - a.length);
    sortedKm.forEach(stop => {
      cleaned = cleaned.split(stop).join(' ');
    });

    // English cleaning: lower-case and remove punctuation except hyphens/alphanumeric
    const words = cleaned
      .replace(/[?!.,;:"'()\[\]{}*&^%$#@\/\\<>៛$]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);

    const filtered = words.filter(w => !EN_STOPWORDS.has(w.toLowerCase()));

    // If all words were filtered out (e.g. "what products do you have"), fallback to original non-empty words or empty
    if (filtered.length === 0) {
      return words.join(' ');
    }

    return filtered.join(' ');
  },

  /**
   * Search active products matching the query
   */
  search(rawQuery, limit = 10) {
    if (!rawQuery || rawQuery.trim() === '') {
      return [];
    }

    const trimmed = rawQuery.trim();
    const keywords = this.extractKeywords(trimmed);
    const searchTerm = keywords.length > 0 ? keywords : trimmed;
    const tokens = searchTerm.split(/\s+/).filter(t => t.length > 0);

    // 1. Direct SKU exact or prefix match
    const skuMatches = db.prepare(`
      SELECT p.*, c.name_en as category_name_en, c.name_km as category_name_km
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND (LOWER(p.sku) = LOWER(?) OR LOWER(p.sku) LIKE LOWER(?))
      LIMIT ?
    `).all(trimmed, `%${trimmed}%`, limit);

    if (skuMatches.length > 0) {
      return this._attachImages(skuMatches);
    }

    // 2. Full phrase search in name, description, SKU, details, category
    const pattern = `%${searchTerm}%`;
    const broadPattern = `%${trimmed}%`;

    const phraseMatches = db.prepare(`
      SELECT p.*, c.name_en as category_name_en, c.name_km as category_name_km
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND (
        p.name_en LIKE ? OR
        p.name_km LIKE ? OR
        p.description_en LIKE ? OR
        p.description_km LIKE ? OR
        p.details_en LIKE ? OR
        p.details_km LIKE ? OR
        c.name_en LIKE ? OR
        c.name_km LIKE ? OR
        p.name_en LIKE ? OR
        p.name_km LIKE ?
      )
      ORDER BY 
        CASE 
          WHEN p.name_en LIKE ? THEN 1
          WHEN p.name_km LIKE ? THEN 2
          WHEN c.name_en LIKE ? THEN 3
          WHEN c.name_km LIKE ? THEN 4
          ELSE 5
        END,
        p.id DESC
      LIMIT ?
    `).all(
      pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, broadPattern, broadPattern,
      pattern, pattern, pattern, pattern,
      limit
    );

    if (phraseMatches.length > 0) {
      return this._attachImages(phraseMatches);
    }

    // 3. Multi-token individual word match (OR scoring)
    if (tokens.length > 1) {
      let whereClauses = [];
      let params = [];
      tokens.forEach(tok => {
        if (tok.length > 1) {
          const p = `%${tok}%`;
          whereClauses.push(`(p.name_en LIKE ? OR p.name_km LIKE ? OR c.name_en LIKE ? OR c.name_km LIKE ? OR p.description_en LIKE ? OR p.description_km LIKE ?)`);
          params.push(p, p, p, p, p, p);
        }
      });

      if (whereClauses.length > 0) {
        const tokenQuery = `
          SELECT p.*, c.name_en as category_name_en, c.name_km as category_name_km
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.is_active = 1 AND (${whereClauses.join(' OR ')})
          LIMIT ?
        `;
        params.push(limit);

        const tokenMatches = db.prepare(tokenQuery).all(...params);
        if (tokenMatches.length > 0) {
          return this._attachImages(tokenMatches);
        }
      }
    }

    // 4. Reverse substring match: check if user sentence contains any category name or product name
    const reverseMatches = db.prepare(`
      SELECT p.*, c.name_en as category_name_en, c.name_km as category_name_km
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND (
        (? LIKE '%' || p.name_en || '%') OR
        (? LIKE '%' || p.name_km || '%') OR
        (? LIKE '%' || c.name_en || '%') OR
        (? LIKE '%' || c.name_km || '%')
      )
      LIMIT ?
    `).all(trimmed, trimmed, trimmed, trimmed, limit);

    if (reverseMatches.length > 0) {
      return this._attachImages(reverseMatches);
    }

    return [];
  },

  _attachImages(products) {
    const imgStmt = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC, id ASC');
    return products.map(prod => {
      prod.images = imgStmt.all(prod.id);
      return prod;
    });
  }
};

module.exports = searchService;
