const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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

// Simple login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Check if env vars are set
  if (!process.env.ADMIN_PASSWORD_HASH || !process.env.JWT_SECRET) {
    return res.status(503).json({ 
      error: 'Server not configured. Please set ADMIN_PASSWORD_HASH and JWT_SECRET environment variables.' 
    });
  }
  
  // Check username
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  if (username !== adminUsername) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Check password
  try {
    const isValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { username, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Set cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });
    
    res.json({ 
      success: true,
      message: 'Login successful',
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify endpoint
app.get('/api/auth/verify', (req, res) => {
  const token = req.cookies.authToken;
  
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ 
      authenticated: true,
      user: {
        username: decoded.username,
        isAdmin: decoded.isAdmin
      }
    });
  } catch (error) {
    res.status(401).json({ authenticated: false });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// Auth middleware for protected routes
const requireAuth = (req, res, next) => {
  const token = req.cookies.authToken;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Protected API endpoints (return empty data for now)
app.get('/api/alerts', requireAuth, (req, res) => {
  res.json([]);
});

app.get('/api/score', requireAuth, (req, res) => {
  res.json({
    lastAction: null,
    scores: []
  });
});

app.get('/api/strategies', requireAuth, (req, res) => {
  res.json([]);
});

app.get('/api/available-alerts', requireAuth, (req, res) => {
  res.json([]);
});

app.get('/api/settings', requireAuth, (req, res) => {
  res.json({
    ui: {
      showAlertsTable: true,
      showScoreMeter: true,
      showStrategyPanel: true,
      showWeights: true
    },
    scoring: {
      timeWindowMinutes: 60
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
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

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});