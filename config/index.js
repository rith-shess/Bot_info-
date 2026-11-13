const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Where the database and uploads live.
//  - Local PC: ./data and ./uploads (default)
//  - Railway: attach a Volume and its mount path is used automatically (RAILWAY_VOLUME_MOUNT_PATH)
//  - Anywhere else: set DATA_DIR to a persistent folder
const storageRoot = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || '';
const isRailway = !!(process.env.RAILWAY_SERVICE_ID || process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT_ID);

// Public address of the site
function resolveBaseUrl() {
  const configured = (process.env.BASE_URL || '').trim();
  const looksLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(configured);
  if (configured && !(looksLocal && process.env.RAILWAY_PUBLIC_DOMAIN)) return configured;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  botToken: process.env.BOT_TOKEN || '',
  sessionSecret: process.env.SESSION_SECRET || 'dev_session_secret_change_me_987654321',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'ChangeMe-Admin-123',
  baseUrl: resolveBaseUrl(),
  storage: { root: storageRoot ? path.resolve(storageRoot) : null, persistent: !!storageRoot, isRailway },
  paths: {
    root: path.resolve(__dirname, '..'),
    data: storageRoot ? path.resolve(storageRoot) : path.resolve(__dirname, '..', 'data'),
    uploads: storageRoot ? path.join(path.resolve(storageRoot), 'uploads', 'products') : path.resolve(__dirname, '..', 'uploads', 'products'),
    public: path.resolve(__dirname, '..', 'public'),
    views: path.resolve(__dirname, '..', 'views')
  },
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB per image
    maxFiles: 10,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  }
};

module.exports = config;
