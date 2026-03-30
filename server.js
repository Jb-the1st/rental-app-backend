const app = require('./src/app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 5000; // Render provides PORT

// Connect to MongoDB
connectDB();

// Start server
app.listen(PORT, '0.0.0.0', () => {  // Add '0.0.0.0' for Render
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});