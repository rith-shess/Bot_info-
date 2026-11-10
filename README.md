# 🛍️ Telegram Product Catalog Chatbot with Web Admin Dashboard

A full-stack, production-ready Telegram e-commerce catalog chatbot paired with a modern, responsive web-based admin management dashboard.

Administrators can upload product photos, edit bilingual descriptions (English and Khmer), manage categories, monitor live stock status, and track bot connectivity. The Telegram Chatbot answers customer inquiries naturally in both **English** and **Khmer**, returning specifications, real-time prices, and photo media groups directly from the persistent SQLite database without hallucinating or inventing data.

---

## 🌟 Key Features

### 🖥️ Admin Dashboard
- **Dashboard Overview:** Real-time statistics on total products, active products, out-of-stock items, categories, recently added products, and live Telegram bot connection status.
- **Full Product CRUD:**
  - Create new products with bilingual fields (English & Khmer).
  - Drag-and-drop multiple image uploads (JPEG, PNG, WEBP, GIF up to 5MB each).
  - Client-side image preview prior to upload.
  - Per-image removal and replacement.
  - SKU/Product code uniqueness enforcement.
  - Price and multi-currency support (`USD $` and `KHR ៛`).
  - Stock status tracking (`In Stock`, `Low Stock`, `Out of Stock`).
  - One-click active/inactive toggle switch.
  - Real-time search by name, SKU, or description with category and status filters.
- **Category Management:**
  - Create, edit, and delete product categories.
  - "View Products" modal listing all items belonging to any specific category.
- **Security & Authentication:**
  - Protected administrative routes and APIs.
  - Strong password hashing using `bcryptjs`.
  - Express session authentication with secure cookies.
  - Brute-force login rate limiting (10 attempts per 15 minutes).
  - API rate limiting and Helmet HTTP security headers.
  - Environment-based admin provisioning on first boot.

### 🤖 Telegram Chatbot (Telegraf)
- **Natural Language Inquiry Handling:**
  - Understands normal customer questions without requiring rigid command syntax.
  - Natural English examples:
    - *"Do you have a thermal printer?"*
    - *"How much is this printer?"*
    - *"Show me your barcode scanners."*
    - *"What products do you have?"*
  - Natural Khmer examples:
    - *"តើមានម៉ាស៊ីនព្រីនទេ?"*
    - *"ម៉ាស៊ីនព្រីននេះតម្លៃប៉ុន្មាន?"*
    - *"មានម៉ាស៊ីនស្កេន Barcode ទេ?"*
    - *"សូមបង្ហាញរូបភាពផលិតផលនេះ។"*
- **Strict Database Grounding (Zero Hallucination):**
  - Only retrieves and displays real data from the database.
  - Polite fallback messages if a product is unavailable, suggesting alternatives or administrator contact.
  - Interactive inline button selection when multiple products match a customer's query.
- **Product Pictures in Telegram:**
  - Multiple images sent as a native **Telegram Media Group**.
  - Single images sent as a photo with formatted Markdown caption.
  - Text-only fallback if no picture is uploaded.
  - **Telegram `file_id` caching**: Once an image is uploaded to Telegram, its unique `file_id` is cached in SQLite, allowing instant re-sends without re-uploading file bytes.
- **Bilingual Support (English & Khmer):**
  - Automatic language detection (Khmer Unicode range recognition).
  - User language preference persistence in SQLite.
  - Manual language switching anytime via `/language` or interactive buttons.
- **Bot Commands:**
  - `/start` - Welcome banner with quick navigation buttons.
  - `/products` - Browse catalog with interactive pagination buttons.
  - `/categories` - Browse products by category.
  - `/language` - Switch between English and Khmer (ភាសាខ្មែរ).
  - `/contact` - Display store location, phone numbers, and Telegram support.
  - `/help` - Explanation of bot features and query examples.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v18+) |
| **Backend Framework** | Express.js |
| **Telegram Bot Engine**| Telegraf (Telegram Bot API) |
| **Database** | SQLite (`node:sqlite` persistent storage) |
| **File / Image Upload** | Multer |
| **Security** | Helmet, Express Rate Limit, Session, Bcrypt |
| **Frontend** | Responsive Vanilla HTML5, CSS3, JavaScript (ES6+) |
| **Icons** | FontAwesome 6 |

---

## 📋 Prerequisites & Required Software

- **Node.js**: v18.0.0 or higher (Node 20+ or 22+ recommended).
- **NPM**: v9.0.0 or higher.
- A Telegram account to create a bot using `@BotFather`.

---

## 🚀 Installation

1. **Clone or navigate into the project directory:**
   ```bash
   cd "telegram bot"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

---

## ⚙️ How to Configure the Telegram Bot

1. Open Telegram on your phone or desktop and search for **[@BotFather](https://t.me/BotFather)**.
2. Send the message `/newbot`.
3. Enter a friendly name for your bot (e.g., `My Store Catalog Bot`).
4. Enter a username ending in `bot` (e.g., `mystore_catalog_bot`).
5. **BotFather** will generate a secret **HTTP API Token**, such as:
   ```text
   7123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ1234567
   ```
6. Copy this token.

---

## 🔐 Environment Configuration

Create a `.env` file in the root directory (you can copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```ini
# ===================================================
# Telegram Product Catalog Chatbot & Admin Dashboard
# ===================================================

# 1. Telegram Bot Token from @BotFather
BOT_TOKEN=7123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ1234567

# 2. Administrator Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=AdminSecurePassword123!

# 3. Server Port
PORT=3000

# 4. Session Security Secret (Set to a random string)
SESSION_SECRET=replace_with_a_long_random_string

# 5. Base URL
BASE_URL=http://localhost:3000
```

> **Note:** If `BOT_TOKEN` is left empty, the server will start normally, and the Admin Dashboard will be 100% accessible. The overview card will notify you that the bot is waiting for a token. Once added, restart the server to activate the Telegram bot!

---

## 👤 Creating the First Administrator

You **never** need to manually insert admin records into the database. On initial boot:
- The system reads `ADMIN_USERNAME` and `ADMIN_PASSWORD` from your `.env` file.
- It securely hashes the password with `bcryptjs` (salt rounds: 10).
- It creates the administrator in `data/catalog.db`.
- Default credentials if unspecified:
  - **Username:** `admin`
  - **Password:** the value of `ADMIN_PASSWORD` in your `.env`

---

## 🏃 Starting the Application

### Development Mode (with automatic restart on file change):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

### Run Automated Test Suite:
```bash
npm test
```

When started, you will see output similar to:
```text
[Database] Database tables and indexes verified.
[Telegram] Bot started successfully as @mystore_catalog_bot (My Store Bot)
====================================================
🚀 Telegram Catalog Server running on port 3000
🌐 Dashboard URL: http://localhost:3000
🔑 Default Admin: admin
📁 Uploads Directory: D:\...\uploads\products
====================================================
```

---

## 🖥️ Opening the Admin Dashboard

1. Open your web browser and navigate to:
   ```text
   http://localhost:3000
   ```
2. You will be greeted by the secure login screen at `http://localhost:3000/login`.
3. Log in with your admin credentials:
   - **Username:** `admin`
   - **Password:** the value of `ADMIN_PASSWORD` in your `.env`.
4. Once authenticated, you will be redirected to the responsive Admin Dashboard.

---

## 📦 Adding and Managing Products

1. In the sidebar or top bar, click **"Products"** or **"+ Add Product"**.
2. Fill in the product details:
   - **SKU / Product Code:** e.g., `PRN-80MM-USB` (must be unique).
   - **Product Name (English):** e.g., `80mm Thermal Receipt Printer`.
   - **Product Name (Khmer):** e.g., `ម៉ាស៊ីនព្រីនវិក្កយបត្រកម្ដៅ 80mm`.
   - **Price & Currency:** e.g., `68.00` and select `USD ($)` or `KHR (៛)`.
   - **Category:** Select a category (e.g., `Thermal Printers`).
   - **Stock Status:** Choose `In Stock`, `Low Stock`, or `Out of Stock`.
   - **Active Status:** Ensure the checkbox is checked to make it searchable in Telegram.
   - **Bilingual Descriptions & Technical Specifications:** Add details in English and Khmer.
   - **Product Pictures:** Drag and drop one or several images into the dropzone (JPEG, PNG, WEBP).
3. Click **"Save Product"**.
4. The product is immediately saved to the database and becomes instantly available for customer inquiries on Telegram!

---

## 💬 Testing the Telegram Chatbot

Open your bot in Telegram (search for your bot's username or click `t.me/your_bot_username`):

### 1. Test Bot Commands
- Send `/start` — Enjoy the interactive welcome card with buttons.
- Send `/products` — Browse products with pagination buttons (`Next ➡️`, `⬅️ Prev`). Click any product to view its photo and full details.
- Send `/categories` — Browse categories and view their specific products.
- Send `/language` — Switch between English and Khmer (ភាសាខ្មែរ).
- Send `/contact` — View store details and administrator contact.

### 2. Test English Natural Queries
- *"Do you have a thermal printer?"*
- *"How much is this printer?"*
- *"Show me your barcode scanners."*
- *"What products do you have?"*
- *"Can you show me a picture?"*

### 3. Test Khmer Natural Queries
- *"តើមានម៉ាស៊ីនព្រីនទេ?"*
- *"ម៉ាស៊ីនព្រីននេះតម្លៃប៉ុន្មាន?"*
- *"មានម៉ាស៊ីនស្កេន Barcode ទេ?"*
- *"សូមបង្ហាញរូបភាពផលិតផលនេះ។"*

### 4. Zero Hallucination Verification
- Search for a non-existent product: *"Do you sell iPhone 16 Pro Max?"* or *"តើមានលក់ទូរស័ព្ទដៃទេ?"*.
- The bot will politely inform the customer that no matching product exists in the catalog and suggest contacting support.

---

## 💾 Backing Up Database & Uploaded Pictures

All application state is permanently stored on disk and will persist across restarts, server reboots, and bot reconnects:

1. **SQLite Database File:**
   - Located at: `data/catalog.db`
   - Contains all products, categories, admins, customer interaction states, and cached Telegram file IDs.
2. **Product Uploaded Pictures:**
   - Located at: `uploads/products/`
   - Contains all uploaded product images.

### Quick Backup Command (PowerShell / Windows):
```powershell
Compress-Archive -Path data, uploads -DestinationPath "catalog_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
```

### Quick Backup Command (Linux / macOS):
```bash
tar -czvf "catalog_backup_$(date +%Y%m%d_%H%M%S).tar.gz" data uploads
```

To restore from a backup, simply extract the `data/` and `uploads/` folders back into the project root.

---

## 🧪 Automated Testing

Run the included automated test suite anytime:

```bash
npm test
```

This verifies:
1. Admin password hashing & verification with `bcryptjs`.
2. Category CRUD operations and product unlinking.
3. Product CRUD, image attachments, and `telegram_file_id` caching.
4. Multilingual search parsing across English and Khmer natural sentences.
5. Telegram bot helper logic, Khmer Unicode detection, and media sender handlers.
6. SQLite file persistence across independent database connections.

---

## 📂 Project Structure

```text
telegram-bot/
├── config/
│   └── index.js              # Application configuration and paths
├── controllers/
│   ├── authController.js     # Admin login, logout, and session check
│   ├── categoryController.js # Category CRUD and product filtering
│   ├── dashboardController.js# Overview metrics and bot status
│   └── productController.js  # Product CRUD, multi-image uploads, toggles
├── database/
│   ├── index.js              # SQLite persistent database connection
│   ├── init.js               # Database schema executor and admin seeder
│   ├── schema.sql            # Table definitions, constraints, indexes
│   └── seedImages.js         # Starter product sample images
├── middleware/
│   ├── auth.js               # Session authentication guards
│   ├── errorHandler.js       # Central error & upload error handling
│   ├── rateLimiter.js        # Login brute-force and API rate limits
│   └── upload.js             # Multer image storage and validation
├── public/
│   ├── css/
│   │   ├── dashboard.css     # Responsive dashboard styling
│   │   └── login.css         # Modern login page styles
│   └── js/
│       ├── auth.js           # Client-side login handler
│       └── dashboard.js      # Full dashboard SPA controller
├── routes/
│   ├── authRoutes.js         # /api/auth
│   ├── categoryRoutes.js     # /api/categories
│   ├── dashboardRoutes.js    # /api/dashboard
│   ├── productRoutes.js      # /api/products
│   └── viewRoutes.js         # HTML view routes
├── services/
│   ├── categoryService.js    # Category database operations
│   ├── productService.js     # Product database operations & metrics
│   ├── searchService.js      # Khmer & English search engine
│   └── telegramUserService.js# User profiles & language preference
├── telegram/
│   ├── bot.js                # Telegraf bot lifecycle & setup
│   ├── handlers/
│   │   ├── actionHandlers.js # Inline keyboard callback handlers
│   │   ├── commandHandlers.js# /start, /products, /categories, etc.
│   │   └── messageHandlers.js# Natural language question processor
│   ├── helpers/
│   │   ├── languageDetector.js# Khmer Unicode detector
│   │   └── mediaSender.js    # Media group & file_id caching sender
│   └── messages/
│       └── i18n.js           # English & Khmer message templates
├── tests/
│   ├── auth.test.js          # Authentication tests
│   ├── category.test.js      # Category management tests
│   ├── persistence.test.js   # Disk persistence tests
│   ├── product.test.js       # Product CRUD tests
│   ├── runTests.js           # Master test runner
│   ├── search.test.js        # Bilingual search tests
│   └── telegram.test.js      # Bot helpers & media sender tests
├── uploads/
│   └── products/             # Stored product images
├── views/
│   ├── index.html            # Main Admin Dashboard
│   └── login.html            # Admin Login Page
├── .env.example              # Template environment variables
├── .gitignore                # Git ignore configuration
├── package.json              # Project metadata & dependencies
├── README.md                 # Project documentation
└── server.js                 # Application entry point
```

---

## 🎬 Product Videos

In the dashboard, **Add/Edit Product** has a *Product Videos* section: MP4 (recommended), MOV or WEBM, **up to 1GB each, 3 videos per upload**, with a live upload progress bar. The limit can be changed with `MAX_VIDEO_MB` in `.env`.

In Telegram, products with videos show a **🎬 Watch Video** button above **🛒 Buy Now**.

| Video size | What the customer gets |
|------------|------------------------|
| up to ~49MB | The video plays inside the chat (uploaded once, then sent instantly) |
| over 49MB | Telegram bots cannot upload files over 50MB, so the customer gets a **▶️ Watch Video** link. This needs a **public https** `BASE_URL` in `.env` (for example `https://shop.example.com`). With `http://localhost` the customer is told to contact sales instead. |

Tip: compress long videos to under 49MB (for example with HandBrake) if you want them to play directly in the chat.

---

## 🛒 Buy Now & Sales Notifications

Every product page in the bot has a **🛒 Buy Now** button.

When a customer taps it:
1. The bot sends the **product picture(s) + details + customer info** to the sales chat.
2. The customer gets a confirmation and a **💬 Chat with Sales** button that opens a chat with the sales account (a ready-to-send message about the product is pre-filled).
3. Repeated taps within 60 seconds do not notify sales again.

**One-time setup:** the sales account (Settings → *Sales Account*) must open the bot and send `/start` once. Telegram only lets a bot message people who have started it. The bot then remembers that chat automatically.
Alternatively, enter a **Sales Chat ID** in Settings (a person's ID or a group ID; add the bot to the group).

The startup log shows `Sales notifications READY` once this is set up.

**Bot menu:** `/start`, `/products`, `/categories`, `/language`, `/contact`, `/help`, `/clear` (registered automatically at startup).

---

## 📄 License
ISC License. Built for production deployment and seamless maintainability.
