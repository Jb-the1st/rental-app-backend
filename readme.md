# Deploy Express.js Backend to Render - Complete Guide

## 🎯 WHAT YOU'LL GET

After deployment, you'll have:
- **Live Backend URL**: `https://your-app-name.onrender.com`
- **All APIs accessible**: `https://your-app-name.onrender.com/api/auth/login`
- **Automatic HTTPS**
- **Free hosting** (with limitations)
- **Auto-deploys** from GitHub

---

## 📋 BEFORE YOU START

### Prerequisites:
1. ✅ GitHub account
2. ✅ Render account (free) - Sign up at https://render.com
3. ✅ MongoDB Atlas account (free) - Sign up at https://www.mongodb.com/cloud/atlas
4. ✅ Your Express.js code ready

---

## 🗄️ STEP 1: Setup MongoDB Atlas (Cloud Database)

### 1.1 Create MongoDB Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click **"Try Free"**
3. Sign up with Google/GitHub or email
4. Choose **"M0 FREE"** tier

### 1.2 Create Cluster
1. After login, click **"Create"** or **"Build a Database"**
2. Choose **"M0 FREE"** tier
3. Select **Cloud Provider**: AWS
4. Select **Region**: Choose closest to you (e.g., `us-east-1`)
5. **Cluster Name**: `rental-app-cluster` (or any name)
6. Click **"Create Cluster"** (takes 3-5 minutes)

### 1.3 Create Database User
1. Click **"Database Access"** in left sidebar
2. Click **"Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `rentalapp_user`
5. **Password**: Click "Autogenerate Secure Password" → **COPY IT!**
6. **Database User Privileges**: Select **"Read and write to any database"**
7. Click **"Add User"**

### 1.4 Whitelist IP Address
1. Click **"Network Access"** in left sidebar
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for development)
   - This adds `0.0.0.0/0`
4. Click **"Confirm"**

### 1.5 Get Connection String
1. Click **"Database"** in left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **Driver**: Node.js
5. Select **Version**: 4.1 or later
6. **Copy the connection string**:
   ```
   mongodb+srv://rentalapp_user:<password>@rental-app-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. **Replace `<password>`** with the password you copied earlier
8. **Add database name**: Change it to:
   ```
   mongodb+srv://rentalapp_user:YOUR_PASSWORD@rental-app-cluster.xxxxx.mongodb.net/rental-app?retryWrites=true&w=majority
   ```

**Save this connection string!** You'll need it for Render.

---

## 📁 STEP 2: Prepare Your Code for Deployment

### 2.1 Update package.json

Add these scripts to your `package.json`:

```json
{
  "name": "rental-app-backend",
  "version": "1.0.0",
  "description": "Rental app backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'No build required'"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "cloudinary": "^1.41.0",
    "express-validator": "^7.0.1",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "passport-facebook": "^3.0.0",
    "passport-apple": "^2.0.2",
    "express-session": "^1.17.3",
    "morgan": "^1.10.0",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### 2.2 Update server.js

Make sure your `server.js` uses the `PORT` environment variable:

```javascript
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
```

### 2.3 Update CORS in src/app.js

Update your CORS configuration to allow your frontend:

```javascript
// CORS - Allow your frontend domain
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-frontend-app.vercel.app', // Add your frontend URL
    'https://your-frontend-app.netlify.app'  // Add your frontend URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 2.4 Create .gitignore

```
# Dependencies
node_modules/

# Environment variables
.env
.env.local
.env.production

# Uploads (don't commit uploaded files)
uploads/*
!uploads/.gitkeep

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Apple OAuth Key
keys/

# Build
dist/
build/
```

### 2.5 Create README.md (Optional but recommended)

```markdown
# Rental App Backend API

Backend API for the Rental Property Management Application.

## Features
- User authentication (JWT + OAuth)
- Property management
- Reviews and ratings
- Bookings
- Feedbacks

## API Documentation
Base URL: https://your-app-name.onrender.com/api

### Endpoints
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/properties` - Get all properties
- (See full documentation below)

## Environment Variables
Required environment variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
```

---

## 🔗 STEP 3: Push Code to GitHub

### 3.1 Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit - Express.js rental app backend"
```

### 3.2 Create GitHub Repository

1. Go to https://github.com
2. Click **"New repository"** (green button)
3. **Repository name**: `rental-app-backend`
4. **Visibility**: Public or Private (your choice)
5. **Do NOT** initialize with README (you already have one)
6. Click **"Create repository"**

### 3.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/rental-app-backend.git
git branch -M main
git push -u origin main
```

---

## 🚀 STEP 4: Deploy to Render

### 4.1 Create Render Account
1. Go to https://render.com
2. Click **"Get Started"** or **"Sign Up"**
3. Sign up with **GitHub** (recommended)
4. Authorize Render to access your repositories

### 4.2 Create New Web Service
1. Click **"New +"** button (top right)
2. Select **"Web Service"**
3. Connect your GitHub repository:
   - If first time: Click **"Connect GitHub"**
   - Select **"rental-app-backend"** repository
   - Click **"Connect"**

### 4.3 Configure Web Service

Fill in the configuration:

**Basic Settings:**
- **Name**: `rental-app-backend` (or any unique name)
- **Region**: Choose closest to you (e.g., `Oregon (US West)`)
- **Branch**: `main`
- **Root Directory**: Leave blank (unless your code is in a subfolder)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Choose **"Free"** plan ($0/month)
  - ⚠️ Free plan limitations:
    - Spins down after 15 minutes of inactivity
    - Takes 30-60 seconds to spin back up on first request
    - 750 hours/month free

### 4.4 Add Environment Variables

Scroll down to **"Environment Variables"** section:

Click **"Add Environment Variable"** for each:

```
Key: NODE_ENV
Value: production

Key: PORT
Value: 5000

Key: MONGODB_URI
Value: mongodb+srv://rentalapp_user:YOUR_PASSWORD@rental-app-cluster.xxxxx.mongodb.net/rental-app?retryWrites=true&w=majority

Key: JWT_SECRET
Value: your-super-secret-jwt-key-make-it-long-and-random-123456789

Key: JWT_EXPIRE
Value: 7d

Key: CLOUDINARY_CLOUD_NAME
Value: your-cloudinary-cloud-name

Key: CLOUDINARY_API_KEY
Value: your-cloudinary-api-key

Key: CLOUDINARY_API_SECRET
Value: your-cloudinary-api-secret

Key: GOOGLE_CLIENT_ID
Value: your-google-client-id

Key: GOOGLE_CLIENT_SECRET
Value: your-google-client-secret

Key: GOOGLE_CALLBACK_URL
Value: https://your-app-name.onrender.com/api/auth/google/callback

Key: FACEBOOK_APP_ID
Value: your-facebook-app-id

Key: FACEBOOK_APP_SECRET
Value: your-facebook-app-secret

Key: FACEBOOK_CALLBACK_URL
Value: https://your-app-name.onrender.com/api/auth/facebook/callback

Key: FRONTEND_URL
Value: https://your-frontend-app.vercel.app

Key: SESSION_SECRET
Value: your-session-secret-key-make-it-random
```

**Important Notes:**
- Replace `your-app-name` with your actual Render app name
- Replace `YOUR_PASSWORD` in MongoDB URI with your actual password
- Generate strong random strings for secrets
- Add your actual frontend URL

### 4.5 Create Web Service

1. Click **"Create Web Service"** button at bottom
2. Wait for deployment (takes 2-5 minutes)
3. Watch the build logs in real-time

---

## ✅ STEP 5: Verify Deployment

### 5.1 Check Build Status

You should see:
```
==> Building...
==> Installing dependencies...
==> Build succeeded!
==> Starting service...
🚀 Server running on port 5000
✅ MongoDB Connected: ...
```

### 5.2 Get Your API URL

After deployment, Render gives you a URL:
```
https://rental-app-backend.onrender.com
```

### 5.3 Test Your API

Open your browser or Postman and test:

**Health Check:**
```
GET https://rental-app-backend.onrender.com/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-12-06T10:30:00.000Z",
  "uptime": 123.456
}
```

**Test Login:**
```
POST https://rental-app-backend.onrender.com/api/auth/login
Content-Type: application/json

{
  "email": "admin@rentright.com",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "firstName": "Admin",
    "lastName": "RentRight",
    "email": "admin@rentright.com",
    "role": "admin"
  }
}
```

---

## 📤 STEP 6: Share APIs with Frontend Team

### 6.1 Create API Documentation

Create a document with all endpoints:

```markdown
# Rental App API Documentation

## Base URL
Production: https://rental-app-backend.onrender.com/api

## Authentication
All protected routes require JWT token in header:
Authorization: Bearer YOUR_JWT_TOKEN

## Endpoints

### Authentication
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout

### Users
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
PATCH  /api/users/:id/switch-to-landlord

### Properties
GET    /api/properties
GET    /api/properties/:id
POST   /api/properties
PUT    /api/properties/:id
DELETE /api/properties/:id

### Reviews
GET    /api/reviews
GET    /api/reviews/property/:propertyId
POST   /api/reviews
DELETE /api/reviews/:id

### Feedbacks
GET    /api/feedbacks
POST   /api/feedbacks
DELETE /api/feedbacks/:id

### Bookings
GET    /api/bookings/my-bookings
POST   /api/bookings
DELETE /api/bookings/:id

## Example Requests

### Register User
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": 1234567890,
  "password": "password123",
  "company": ""
}

### Login
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}

### Create Property
POST /api/properties
Headers: Authorization: Bearer TOKEN
Content-Type: multipart/form-data

Form Data:
- title: Beautiful House
- price: 250000
- description: Amazing property
- country: Nigeria
- state: Lagos
- city: Lekki
- type: house
- image: [FILE]
```

### 6.2 Share with Frontend Team

Send them:
1. **Base URL**: `https://rental-app-backend.onrender.com/api`
2. **API Documentation** (above)
3. **Example Postman Collection** (optional)
4. **Test credentials**:
   - Email: `admin@rentright.com`
   - Password: `admin123`

### 6.3 Frontend Integration Example

Tell them to update their axios configuration:

```javascript
// Create axios instance
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://rental-app-backend.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**Usage:**
```javascript
// Login
const response = await api.post('/auth/login', {
  email: 'john@example.com',
  password: 'password123'
});

// Get properties
const properties = await api.get('/properties');

// Create property (with image)
const formData = new FormData();
formData.append('title', 'My House');
formData.append('price', 250000);
formData.append('image', imageFile);

const newProperty = await api.post('/properties', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

---

## 🔄 STEP 7: Update & Redeploy

### Auto-Deploy (Recommended)

Render auto-deploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update API endpoints"
git push origin main
```

Render automatically:
1. Detects the push
2. Pulls latest code
3. Runs build
4. Deploys new version
5. Takes ~2-3 minutes

### Manual Deploy

In Render dashboard:
1. Go to your service
2. Click **"Manual Deploy"** dropdown
3. Select **"Deploy latest commit"**

---

## 📊 STEP 8: Monitor Your Backend

### View Logs

In Render dashboard:
1. Click on your service
2. Click **"Logs"** tab
3. See real-time logs

### Metrics

Click **"Metrics"** tab to see:
- CPU usage
- Memory usage
- Request count
- Response times

---

## 🎯 STEP 9: Custom Domain (Optional)

### Free Render Domain
```
https://rental-app-backend.onrender.com
```

### Add Custom Domain (if you have one)
1. Go to your service in Render
2. Click **"Settings"** tab
3. Scroll to **"Custom Domain"**
4. Click **"Add Custom Domain"**
5. Enter: `api.yourdomain.com`
6. Add DNS records to your domain provider
7. Wait for verification

---

## ⚠️ IMPORTANT NOTES

### Free Plan Limitations:
- ✅ 750 hours/month (more than enough)
- ❌ Spins down after 15 min inactivity
- ❌ Cold start: 30-60 sec first request
- ❌ Limited to 512 MB RAM
- ❌ Shared CPU

### Solutions for Cold Starts:
1. **Use a ping service**:
   - https://uptimerobot.com (free)
   - Ping your API every 14 minutes
   
2. **Upgrade to paid plan** ($7/month):
   - No spin down
   - Instant responses
   - More resources

### Security Checklist:
- ✅ Environment variables set
- ✅ CORS configured correctly
- ✅ MongoDB IP whitelist configured
- ✅ JWT_SECRET is strong and secret
- ✅ .gitignore includes .env
- ✅ Cloudinary credentials set
- ✅ OAuth callback URLs updated

---

## 🐛 TROUBLESHOOTING

### Build Failed
**Check:**
- `package.json` has correct scripts
- All dependencies in `package.json`
- No syntax errors in code

### Service Not Starting
**Check logs for:**
- MongoDB connection error → Check URI
- Port binding error → Use `process.env.PORT`
- Missing environment variables

### API Returns 503
- Service is spinning up (first request)
- Wait 30-60 seconds and try again

### CORS Errors
- Add frontend URL to CORS whitelist
- Check credentials: true in CORS config

---

## 📋 FINAL CHECKLIST

Before sharing with frontend team:

- [ ] Backend deployed successfully
- [ ] Health check endpoint working
- [ ] MongoDB connected
- [ ] Admin user exists (test login works)
- [ ] All environment variables set
- [ ] CORS allows frontend domain
- [ ] OAuth callbacks updated with Render URL
- [ ] API documentation created
- [ ] Test all major endpoints
- [ ] Share base URL with team
- [ ] Share test credentials
- [ ] Monitor logs for errors

---

## 🎉 SUCCESS!

Your backend is now live at:
```
https://your-app-name.onrender.com/api
```

Frontend team can now integrate with:
- Login: `POST /api/auth/login`
- Register: `POST /api/auth/register`
- Properties: `GET /api/properties`
- And all other endpoints!

**Pro Tip:** Set up UptimeRobot to ping your API every 14 minutes to prevent cold starts! 🚀