const multer = require('multer');
const path = require('path');

// Use memoryStorage so files are available as a buffer (req.file.buffer)
// This is required for streaming directly to Cloudinary without writing to disk.
// On Render (and most cloud platforms), the local filesystem is ephemeral —
// files written to disk disappear on redeploy. Cloudinary is the source of truth.
const storage = multer.memoryStorage();

// File filter — images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

module.exports = upload;