const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: true,
  credentials: true
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
  
  // Simple check without bcrypt
  if (username === 'admin' && password === 'password') {
    // Set a simple cookie
    res.cookie('authToken', 'dummy-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000
    });
    
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
  
  if (token === 'dummy-token') {
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
  res.clearCookie('authToken');
  res.json({ success: true });
});

// Protected API endpoints (dummy data)
const requireAuth = (req, res, next) => {
  if (req.cookies.authToken === 'dummy-token') {
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