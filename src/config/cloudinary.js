const cloudinary = require('cloudinary').v2;

// Cloudinary accepts either:
//   Option A — a single CLOUDINARY_URL connection string (what Render/Heroku usually sets)
//              e.g. cloudinary://API_KEY:API_SECRET@CLOUD_NAME
//   Option B — three separate variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//
// If CLOUDINARY_URL is set, cloudinary.v2 picks it up automatically — no config() call needed.
// If only separate vars are set, we call config() manually.

if (!process.env.CLOUDINARY_URL) {
  // Option B — configure from separate env vars
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}
// If CLOUDINARY_URL is present, cloudinary SDK reads it automatically — nothing to do.

module.exports = cloudinary;