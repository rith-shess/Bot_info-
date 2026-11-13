const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure the uploads directory exists
if (!fs.existsSync(config.paths.uploads)) {
  fs.mkdirSync(config.paths.uploads, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.paths.uploads);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `prod-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles
  },
  fileFilter: fileFilter
});

function removeUploadedFiles(files) {
  const list = Array.isArray(files) ? files : Object.values(files || {}).flat();
  list.forEach(f => {
    if (f && f.path) {
      try { fs.unlinkSync(f.path); } catch (e) { /* already gone */ }
    }
  });
}

// Product form: up to 10 pictures
upload.productMedia = [upload.array('images', config.upload.maxFiles)];
upload.removeUploadedFiles = removeUploadedFiles;

module.exports = upload;
