const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// ─── Limits ────────────────────────────────────────────────────────────────
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;
const MAX_FILES    = 10;

// ─── File filters ──────────────────────────────────────────────────────────
const propertyFileFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');
  if (isImage || isVideo) return cb(null, true);
  cb(new Error('Only image and video files are allowed'));
};

const imageOnlyFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new Error('Only image files are allowed'));
};

const anyFileFilter = (req, file, cb) => cb(null, true);

// ─── Memory storage ────────────────────────────────────────────────────────
const memoryStorage = multer.memoryStorage();

// ─── Upload a buffer to Cloudinary ────────────────────────────────────────
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
};

// ─── Multer error wrapper ──────────────────────────────────────────────────
const handleMulterError = (multerFn) => (req, res, next) => {
  multerFn(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({
        success: false,
        message: `File too large. Max: images ${MAX_IMAGE_MB}MB, videos ${MAX_VIDEO_MB}MB`,
      });
    if (err.code === 'LIMIT_FILE_COUNT')
      return res.status(400).json({
        success: false,
        message: `Too many files. Max ${MAX_FILES} per upload`,
      });
    return res.status(400).json({ success: false, message: err.message });
  });
};

// ─── Push buffered files to Cloudinary ────────────────────────────────────
const pushToCloudinary = (folder, avatarCrop = false) => {
  return async (req, res, next) => {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      if (files.length === 0) return next();

      const uploaded = await Promise.all(
        files.map(async (file) => {
          const isVideo = file.mimetype.startsWith('video/');
          const limitBytes = isVideo
            ? MAX_VIDEO_MB * 1024 * 1024
            : MAX_IMAGE_MB * 1024 * 1024;

          if (file.size > limitBytes) {
            throw new Error(
              `${file.originalname} exceeds limit. Max: ${isVideo ? MAX_VIDEO_MB + 'MB (video)' : MAX_IMAGE_MB + 'MB (image)'}`
            );
          }

          const options = {
            folder,
            resource_type: isVideo ? 'video' : 'image',
            ...(isVideo
              ? {}
              : avatarCrop
              ? { transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }] }
              : { transformation: [{ quality: 'auto', fetch_format: 'auto' }] }),
          };

          const result = await uploadToCloudinary(file.buffer, options);

          return {
            url:          result.secure_url,
            publicId:     result.public_id,
            resourceType: isVideo ? 'video' : 'image',
          };
        })
      );

      req.uploadedMedia = uploaded;
      next();
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  };
};

// ─── Exported upload middleware ────────────────────────────────────────────
// All exports are ARRAYS — spread them in your routes:
//   router.post('/path', ...upload.propertyMedia, controller)
//   router.post('/path', ...upload.single('document'), controller)

const upload = {
  // Multiple images + videos for properties (field name: "media")
  propertyMedia: [
    handleMulterError(multer({ storage: memoryStorage, limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 }, fileFilter: propertyFileFilter }).array('media', MAX_FILES)),
    pushToCloudinary('rental-app/properties'),
  ],

  // Single image for feedback (field name: "image")
  feedbackImage: [
    handleMulterError(multer({ storage: memoryStorage, limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 }, fileFilter: imageOnlyFilter }).single('image')),
    pushToCloudinary('rental-app/feedbacks'),
  ],

  // Single avatar image for user profile (field name: "avatar")
  userAvatar: [
    handleMulterError(multer({ storage: memoryStorage, limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 }, fileFilter: imageOnlyFilter }).single('avatar')),
    pushToCloudinary('rental-app/users', true),
  ],

  // Generic single file upload — use for documents, etc.
  // Usage: ...upload.single('fieldName')
  single: (fieldName) => [
    handleMulterError(multer({ storage: memoryStorage, limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 }, fileFilter: anyFileFilter }).single(fieldName)),
    pushToCloudinary('rental-app/documents'),
  ],

  // Generic multiple file upload
  // Usage: ...upload.array('fieldName', maxCount)
  array: (fieldName, maxCount = MAX_FILES) => [
    handleMulterError(multer({ storage: memoryStorage, limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 }, fileFilter: anyFileFilter }).array(fieldName, maxCount)),
    pushToCloudinary('rental-app/misc'),
  ],
};

module.exports = upload;