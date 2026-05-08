require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const MongoStore = require('connect-mongo').default;

app.set('trust proxy', 1);

// ✅ 1. CORS config object — reused for both middleware and preflight
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://axterra.vercel.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // ✅ preflight uses same config

// ✅ 2. Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ 3. Security & logging
app.use(helmet());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ✅ 4. Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// ✅ 5. Session & passport
require('./config/passport');
app.use(session({
  secret: process.env.SESSION_SECRET,   // ✅ from env
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,    // ✅ real DB URI not localhost
  })
}));
app.use(passport.initialize());
app.use(passport.session());

// ✅ 6. Swagger
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Rental API", version: "1.0.0" }
  },
  apis: ["./src/routes/*.js"]
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ 7. Routes
const authRoutes       = require('./routes/auth.routes');
const userRoutes       = require('./routes/users.routes');
const propertyRoutes   = require('./routes/properties.routes');
const reviewRoutes     = require('./routes/reviews.routes');
const feedbackRoutes   = require('./routes/feedbacks.routes');
const bookingRoutes    = require('./routes/bookings.routes');
const landlordRoutes   = require('./routes/landlord.routes');
const ninVerifyRoutes  = require('./routes/ninVerification.routes');
const notificationRoutes = require('./routes/notifications.routes');

app.use('/api/auth',                  authRoutes);
app.use('/api/users',                 userRoutes);
app.use('/api/properties',            propertyRoutes);
app.use('/api/reviews',               reviewRoutes);
app.use('/api/feedbacks',             feedbackRoutes);
app.use('/api/bookings',              bookingRoutes);
app.use('/api/landlord-verifications', landlordRoutes);
app.use('/api/nin-verification',      ninVerifyRoutes);
app.use('/api/notifications',         notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;