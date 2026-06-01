require('dotenv').config();

const path = require('path');

const nodeEnv = process.env.NODE_ENV || 'development';

module.exports = {
  nodeEnv,
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  defaultCountry: process.env.DEFAULT_COUNTRY || 'IN',
  // Where uploaded files are stored. On Render, point this at a persistent
  // disk mount (e.g. /var/data/uploads) so files survive redeploys.
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'),
  // Serve the built React client from this server (single-origin deploy).
  // Enabled automatically in production; override with SERVE_CLIENT=true/false.
  serveClient:
    process.env.SERVE_CLIENT != null
      ? process.env.SERVE_CLIENT === 'true'
      : nodeEnv === 'production',
};
