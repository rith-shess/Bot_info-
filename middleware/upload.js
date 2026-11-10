const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure destinations exist
[config.paths.uploads, config.paths.videos].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, file.fieldname === 'videos' ? config.paths.videos : config.paths.uploads);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = file.fieldname === 'videos' ? 'vid' : 'prod';
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'videos') {
    if (config.upload.allowedVideoMimeTypes.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Invalid file type. Only MP4, MOV and WEBM videos are allowed.'));
  }
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
  return cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
};

// multer applies ONE size limit to every file, so it is set to the (larger) video limit
// and the smaller image limit is enforced afterwards by checkImageSizes().
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxVideoSize,
    files: config.upload.maxFiles + config.upload.maxVideos
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

function checkImageSizes(req, res, next) {
  const images = (req.files && req.files.images) || [];
  const tooBig = images.find(f => f.size > config.upload.maxFileSize);
  if (tooBig) {
    removeUploadedFiles(req.files);
    return res.status(400).json({
      success: false,
      message: `Image "${tooBig.originalname}" is too large. Maximum image size is ${Math.round(config.upload.maxFileSize / 1024 / 1024)}MB.`
    });
  }
  next();
}

// Product form: up to 10 pictures + up to 3 videos
upload.productMedia = [
  upload.fields([
    { name: 'images', maxCount: config.upload.maxFiles },
    { name: 'videos', maxCount: config.upload.maxVideos }
  ]),
  checkImageSizes
];
upload.removeUploadedFiles = removeUploadedFiles;

module.exports = upload;
