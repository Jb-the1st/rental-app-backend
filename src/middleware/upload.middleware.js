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

// ─── Memory storage (buffer files, then push to Cloudinary manually) ───────
const memoryStorage = multer.memoryStorage();

const propertyMulter = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
  fileFilter: propertyFileFilter,
});

const feedbackMulter = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

const userMulter = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

// ─── Upload a buffer to Cloudinary via upload_stream ──────────────────────
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
};

// ─── Second middleware: push buffered files to Cloudinary ──────────────────
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

      req.uploadedMedia = uploaded; // controllers read from here
      next();
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  };
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

// ─── Exported upload middleware sets ──────────────────────────────────────
// Each is an ARRAY — spread them in your route:
//   router.post('/', ...upload.propertyMedia, controller)

const upload = {
  propertyMedia: [
    handleMulterError(propertyMulter.array('media', MAX_FILES)),
    pushToCloudinary('rental-app/properties'),
  ],
  feedbackImage: [
    handleMulterError(feedbackMulter.single('image')),
    pushToCloudinary('rental-app/feedbacks'),
  ],
  userAvatar: [
    handleMulterError(userMulter.single('avatar')),
    pushToCloudinary('rental-app/users', true),
  ],
};

module.exports = upload;