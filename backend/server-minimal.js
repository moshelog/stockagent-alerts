const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins for now
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD_HASH
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ service: 'stockagent-backend', status: 'running' });
});

// Simple login endpoint for testing
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // For now, just check if env vars are set
  if (!process.env.ADMIN_PASSWORD_HASH || !process.env.JWT_SECRET) {
    return res.status(503).json({ 
      error: 'Server not configured. Please set ADMIN_PASSWORD_HASH and JWT_SECRET environment variables.' 
    });
  }
  
  // Simple response for testing
  res.json({ 
    message: 'Login endpoint working',
    received: { username, hasPassword: !!password }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment check:', {
    PORT,
    NODE_ENV: process.env.NODE_ENV || 'not set',
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasAdminPassword: !!process.env.ADMIN_PASSWORD_HASH
  });
});