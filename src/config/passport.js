const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email found in Google profile'), null);

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists — just return them
      return done(null, user);
    }

    // New user — create account
    user = await User.create({
      firstName:       profile.name?.givenName  || profile.displayName || 'Google',
      lastName:        profile.name?.familyName || 'User',
      email,
      phone:           0, // placeholder — they can update later
      password:        Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
      role:            'user',
      isEmailVerified: true,
      imageUrl:        profile.photos?.[0]?.value || ''
    });

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;