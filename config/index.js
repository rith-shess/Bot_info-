const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  botToken: process.env.BOT_TOKEN || '',
  sessionSecret: process.env.SESSION_SECRET || 'dev_session_secret_change_me_987654321',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'ChangeMe-Admin-123',
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  paths: {
    root: path.resolve(__dirname, '..'),
    data: path.resolve(__dirname, '..', 'data'),
    uploads: path.resolve(__dirname, '..', 'uploads', 'products'),
    videos: path.resolve(__dirname, '..', 'uploads', 'videos'),
    public: path.resolve(__dirname, '..', 'public'),
    views: path.resolve(__dirname, '..', 'views')
  },
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB per image
    maxFiles: 10,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    // Videos (MAX_VIDEO_MB in .env can change the 1 GB default)
    maxVideoSize: (parseInt(process.env.MAX_VIDEO_MB, 10) || 1024) * 1024 * 1024,
    maxVideos: 3,
    allowedVideoMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm']
  }
};

module.exports = config;
