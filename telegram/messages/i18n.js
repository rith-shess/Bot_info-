const messages = {
  en: {
    welcome: (name) => `👋 Hello ${name ? name : 'there'}!\n\nWelcome to our *Product Catalog Bot*.\nI can help you browse our products, check prices, specifications, and send you product photos.\n\nUse the buttons below or type any question naturally (e.g. _"Do you have a thermal printer?"_).`,
    help: `📖 *How to use this bot:*\n\n` +
          `• /products - View all available products\n` +
          `• /categories - Browse products by category\n` +
          `• /language - Change bot language (English / ភាសាខ្មែរ)\n` +
          `• /contact - Contact our support / administrator\n` +
          `• /clear - Clear the chat\n\n` +
          `💡 *Natural Questions:*\n` +
          `You can type normally in English or Khmer:\n` +
          `• _"How much is the barcode scanner?"_\n` +
          `• _"Show me thermal printers"_\n` +
          `• _"Can you show me pictures of PRN-80MM-USB?"_`,
    selectLanguage: '🌐 *Please choose your preferred language / សូមជ្រើសរើសភាសា:*',
    languageChanged: '✅ Language changed to *English*.',
    contact: `📞 *Contact Support & Store Info:*\n\n` +
             `🏢 *Office / Store:* Phnom Penh, Cambodia\n` +
             `📱 *Telegram Admin:* @AdminSupport\n` +
             `☎️ *Phone:* +855 12 345 678 / +855 98 765 432\n` +
             `⏰ *Working Hours:* Mon - Sat, 8:00 AM - 6:00 PM\n\n` +
             `Feel free to reach out to us for orders and inquiries!`,
    categoriesTitle: '📂 *Product Categories:*\nSelect a category to view products:',
    productsTitle: (page, totalPages) => `📦 *Available Products (Page ${page}/${totalPages}):*`,
    noProducts: 'Currently, there are no active products in the catalog.',
    noProductsInCategory: 'No active products found in this category.',
    notFound: (term) => `🔍 We couldn't find any product matching "${term}".\n\nPlease try a different product name, model code, or contact our support team (/contact) for assistance.`,
    multipleMatches: (count) => `🔎 Found *${count}* matching products. Please select one:`,
    btnViewDetails: '📄 View Details',
    btnBackToCategories: '⬅️ Back to Categories',
    btnBackToProducts: '⬅️ Back to Products',
    btnBuyNow: '🛒 Buy Now',
    btnChatSales: '💬 Chat with Sales',
    btnWatchVideo: '▶️ Watch Video on YouTube',
    buyRequestSent: (name) => `✅ Request sent!\nOur sales team received your request for "${name}".\n\nTap the button below to chat with them directly.`,
    buyChatPrompt: '👇 Tap the button below to chat with our sales team about this product.',
    stockStatus: {
      in_stock: '✅ In Stock',
      out_of_stock: '❌ Out of Stock',
      low_stock: '⚠️ Low Stock'
    },
    formatProduct: (product) => {
      const stock = messages.en.stockStatus[product.stock_status] || product.stock_status;
      const formattedPrice = product.currency === 'USD' 
        ? `$${Number(product.price).toFixed(2)}` 
        : `${Number(product.price).toLocaleString()} KHR`;

      let text = `📦 *${product.name_en}*\n`;
      text += `🔖 *SKU / Code:* \`${product.sku}\`\n`;
      if (product.category_name_en) {
        text += `📂 *Category:* ${product.category_name_en}\n`;
      }
      text += `💵 *Price:* *${formattedPrice}*\n`;
      text += `📊 *Status:* ${stock}\n\n`;

      if (product.description_en && product.description_en.trim()) {
        text += `📝 *Description:*\n${product.description_en.trim()}\n\n`;
      }

      if (product.details_en && product.details_en.trim()) {
        text += `⚙️ *Specifications:*\n${product.details_en.trim()}\n`;
      }

      return text;
    }
  },

  km: {
    welcome: (name) => `👋 សួស្តី ${name ? name : ''}!\n\nសូមស្វាគមន៍មកកាន់ *ប្រព័ន្ធ Chatbot ស្វែងរកទំនិញ* របស់យើងខ្ញុំ។\nខ្ញុំអាចជួយលោកអ្នកស្វែងរកទំនិញ មើលតម្លៃ លក្ខណៈបច្ចេកទេស និងរូបភាពជាក់ស្តែង។\n\nសូមចុចប៊ូតុងខាងក្រោម ឬសួរសំណួរធម្មតា (ឧ. _"តើមានម៉ាស៊ីនព្រីនទេ?"_)។`,
    help: `📖 *របៀបប្រើប្រាស់ Bot នេះ:*\n\n` +
          `• /products - មើលបញ្ជីផលិតផលទាំងអស់\n` +
          `• /categories - មើលផលិតផលតាមប្រភេទ\n` +
          `• /language - ផ្លាស់ប្តូរភាសា (English / ភាសាខ្មែរ)\n` +
          `• /contact - ព័ត៌មានទំនាក់ទំនងអ្នកគ្រប់គ្រង\n` +
          `• /clear - សម្អាតការសន្ទនា\n\n` +
          `💡 *ការសួរសំណួរធម្មតា:*\n` +
          `លោកអ្នកអាចសួរជាភាសាខ្មែរ ឬអង់គ្លេសបានដោយសេរី:\n` +
          `• _"ម៉ាស៊ីនព្រីននេះតម្លៃប៉ុន្មាន?"_\n` +
          `• _"មានម៉ាស៊ីនស្កេន Barcode ទេ?"_\n` +
          `• _"សូមបង្ហាញរូបភាពផលិតផលនេះ"_\n` +
          `• _"តើមានផលិតផលអ្វីខ្លះ?"_`,
    selectLanguage: '🌐 *សូមជ្រើសរើសភាសា / Please choose your preferred language:*',
    languageChanged: '✅ ភាសាត្រូវបានប្តូរទៅជា *ភាសាខ្មែរ* ដោយជោគជ័យ។',
    contact: `📞 *ព័ត៌មានទំនាក់ទំនង និងហាង:*\n\n` +
             `🏢 *ទីតាំង:* រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា\n` +
             `📱 *Telegram អ្នកគ្រប់គ្រង:* @AdminSupport\n` +
             `☎️ *លេខទូរស័ព្ទ:* +855 12 345 678 / +855 98 765 432\n` +
             `⏰ *ម៉ោងធ្វើការ:* ច័ន្ទ - សៅរ៍, ម៉ោង 8:00 ព្រឹក - 6:00 ល្ងាច\n\n` +
             `សូមទាក់ទងមកយើងខ្ញុំសម្រាប់ការបញ្ជាទិញ និងព័ត៌មានបន្ថែម!`,
    categoriesTitle: '📂 *ប្រភេទផលិតផល:*\nសូមជ្រើសរើសប្រភេទដើម្បីមើលផលិតផល:',
    productsTitle: (page, totalPages) => `📦 *ផលិតផលទាំងអស់ (ទំព័រទី ${page}/${totalPages}):*`,
    noProducts: 'បច្ចុប្បន្ន មិនទាន់មានផលិតផលដាក់លក់នៅក្នុងប្រព័ន្ធនៅឡើយទេ។',
    noProductsInCategory: 'មិនមានផលិតផលនៅក្នុងប្រភេទនេះនៅឡើយទេ។',
    notFound: (term) => `🔍 សូមអភ័យទោស យើងខ្ញុំរកមិនឃើញផលិតផលដែលត្រូវនឹង "${term}" ទេ។\n\nសូមព្យាយាមស្វែងរកឈ្មោះផ្សេងទៀត កូដទំនិញ ឬទាក់ទងមកកាន់អ្នកគ្រប់គ្រងតាមរយៈ /contact ។`,
    multipleMatches: (count) => `🔎 រកឃើញផលិតផលចំនួន *${count}* ដែលពាក់ព័ន្ធ។ សូមជ្រើសរើសផលិតផលខាងក្រោម:`,
    btnViewDetails: '📄 មើលព័ត៌មានលម្អិត',
    btnBackToCategories: '⬅️ ត្រឡប់ទៅកាន់ប្រភេទវិញ',
    btnBackToProducts: '⬅️ ត្រឡប់ទៅកាន់ផលិតផលវិញ',
    btnBuyNow: '🛒 ទិញឥឡូវនេះ',
    btnChatSales: '💬 ជជែកជាមួយផ្នែកលក់',
    btnWatchVideo: '▶️ មើលវីដេអូលើ YouTube',
    buyRequestSent: (name) => `✅ បានផ្ញើសំណើរួចរាល់!\nក្រុមការងារលក់របស់យើងបានទទួលសំណើរបស់អ្នកសម្រាប់ "${name}"។\n\nសូមចុចប៊ូតុងខាងក្រោមដើម្បីជជែកជាមួយពួកគេដោយផ្ទាល់។`,
    buyChatPrompt: '👇 សូមចុចប៊ូតុងខាងក្រោមដើម្បីជជែកជាមួយក្រុមការងារលក់អំពីផលិតផលនេះ។',
    stockStatus: {
      in_stock: '✅ មានក្នុងស្តុក',
      out_of_stock: '❌ អស់ពីស្តុក',
      low_stock: '⚠️ ស្តុកនៅសល់តិច'
    },
    formatProduct: (product) => {
      const stock = messages.km.stockStatus[product.stock_status] || product.stock_status;
      const name = product.name_km || product.name_en;
      const desc = product.description_km || product.description_en;
      const details = product.details_km || product.details_en;
      const category = product.category_name_km || product.category_name_en;
      const formattedPrice = product.currency === 'USD' 
        ? `$${Number(product.price).toFixed(2)}` 
        : `${Number(product.price).toLocaleString()} រៀល`;

      let text = `📦 *${name}*\n`;
      text += `🔖 *កូដទំនិញ (SKU):* \`${product.sku}\`\n`;
      if (category) {
        text += `📂 *ប្រភេទ:* ${category}\n`;
      }
      text += `💵 *តម្លៃ:* *${formattedPrice}*\n`;
      text += `📊 *ស្ថានភាព:* ${stock}\n\n`;

      if (desc && desc.trim()) {
        text += `📝 *ការពិពណ៌នា:*\n${desc.trim()}\n\n`;
      }

      if (details && details.trim()) {
        text += `⚙️ *លក្ខណៈបច្ចេកទេស:*\n${details.trim()}\n`;
      }

      return text;
    }
  }
};

function getMsg(lang = 'en') {
  return messages[lang] || messages.en;
}

module.exports = {
  messages,
  getMsg
};
