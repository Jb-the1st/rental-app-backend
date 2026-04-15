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
app.set('trust proxy', 1);
// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const propertyRoutes = require('./routes/properties.routes');
const reviewRoutes = require('./routes/reviews.routes');
const feedbackRoutes = require('./routes/feedbacks.routes');
const bookingRoutes = require('./routes/bookings.routes');
const landlordRoutes = require('./routes/landlord.routes');
const ninVerifyRoutes   = require('./routes/ninVerification.routes'); // ← NEW
// Use routes
app.use('/api/landlord-verifications', landlordRoutes);

// Import passport config
require('./config/passport');



// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS
// CORS - Allow your frontend domain
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://rentright-psi.vercel.app', // Add your frontend URL
    'https://your-frontend-app.netlify.app'  // Add your frontend URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Session (for social auth)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Rental API",
      version: "1.0.0"
    }
  },
  apis: ["./src/routes/*.js"]
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve static files (uploaded images)
app.use('/uploads', express.static('uploads'));
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/nin-verification', ninVerifyRoutes); // ← NEW

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
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