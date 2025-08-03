const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow specific origins
    const allowedOrigins = [
      'https://app.stockagent.app',
      'http://app.stockagent.app',
      'http://localhost:3000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ service: 'stockagent-backend', status: 'running' });
});

// Simple login endpoint (no bcrypt for now)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, origin: req.headers.origin });
  
  // Simple check without bcrypt
  if (username === 'admin' && password === 'password') {
    // Set a simple cookie with explicit options
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    };
    
    res.cookie('authToken', 'dummy-token-123', cookieOptions);
    console.log('Cookie set with options:', cookieOptions);
    
    res.json({ 
      success: true,
      message: 'Login successful'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Verify endpoint
app.get('/api/auth/verify', (req, res) => {
  const token = req.cookies.authToken;
  console.log('Verify request:', { 
    token, 
    cookies: req.cookies,
    origin: req.headers.origin,
    cookie: req.headers.cookie 
  });
  
  if (token === 'dummy-token-123') {
    res.json({ 
      authenticated: true,
      user: {
        username: 'admin',
        isAdmin: true
      }
    });
  } else {
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
  res.json({ success: true });
});

// Protected API endpoints (dummy data)
const requireAuth = (req, res, next) => {
  if (req.cookies.authToken === 'dummy-token-123') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.get('/api/alerts', requireAuth, (req, res) => res.json([]));
app.get('/api/score', requireAuth, (req, res) => res.json({ lastAction: null, scores: [] }));
app.get('/api/strategies', requireAuth, (req, res) => res.json([]));
app.get('/api/available-alerts', requireAuth, (req, res) => res.json([]));
app.get('/api/settings', requireAuth, (req, res) => res.json({
  ui: { showAlertsTable: true, showScoreMeter: true, showStrategyPanel: true, showWeights: true },
  scoring: { timeWindowMinutes: 60 }
}));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Basic server running on port ${PORT}`);
});