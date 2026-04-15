const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const User = require('../models/User');

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    // clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // User exists, return user
        return done(null, user);
      }

      // Create new user
      user = await User.create({
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        email: profile.emails[0].value,
        password: Math.random().toString(36), // Random password
        role: 'tenant',
        imageUrl: profile.photos[0]?.value,
        phone: 0,
        company: ''
      });

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
));

// // Facebook Strategy
// passport.use(new FacebookStrategy({
//     clientID: process.env.FACEBOOK_APP_ID,
//     clientSecret: process.env.FACEBOOK_APP_SECRET,
//     callbackURL: process.env.FACEBOOK_CALLBACK_URL,
//     profileFields: ['id', 'emails', 'name', 'picture.type(large)']
//   },
//   async (accessToken, refreshToken, profile, done) => {
//     try {
//       let user = await User.findOne({ email: profile.emails[0].value });

//       if (user) {
//         return done(null, user);
//       }

//       user = await User.create({
//         firstName: profile.name.givenName,
//         lastName: profile.name.familyName,
//         email: profile.emails[0].value,
//         password: Math.random().toString(36),
//         role: 'tenant',
//         imageUrl: profile.photos[0]?.value,
//         phone: 0,
//         company: ''
//       });

//       done(null, user);
//     } catch (error) {
//       done(error, null);
//     }
//   }
// ));

module.exports = passport;