const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const { initDatabase } = require('./database/init');
const { startBot } = require('./telegram/bot');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize database tables, indexes, and default administrator
initDatabase();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"], // dashboard buttons use inline onclick handlers
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  name: 'tg_catalog_sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Static files
app.use('/public', express.static(config.paths.public));
app.use('/uploads/products', express.static(config.paths.uploads));
app.use('/uploads/videos', express.static(config.paths.videos)); // supports Range requests (video seeking)

// Apply API rate limiting
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// Web View Routes (Dashboard and Login pages)
app.use('/', require('./routes/viewRoutes'));

// Global Error Handler
app.use(errorHandler);

// Start Telegram Bot
startBot().catch(err => {
  console.error('[Telegram] Bot failed to start on boot:', err.message);
});

// Start Express Server
const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Telegram Catalog Server running on port ${config.port}`);
  console.log(`🌐 Dashboard URL: ${config.baseUrl}`);
  console.log(`🔑 Default Admin: ${config.adminUsername}`);
  console.log(`📁 Uploads Directory: ${config.paths.uploads}`);
  console.log(`====================================================`);
});

// Large video uploads (up to 1GB) can take many minutes: Node's default 5-minute request timeout would cut them off
server.requestTimeout = 0;

module.exports = { app, server };
