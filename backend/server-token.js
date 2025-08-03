const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Simple JWT secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Basic middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

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

// Login endpoint - returns token in response body
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username });
  
  // Simple check
  if (username === 'admin' && password === 'password') {
    // Generate JWT token
    const token = jwt.sign(
      { username: 'admin', isAdmin: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      success: true,
      message: 'Login successful',
      token: token // Send token in response body
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Verify endpoint - expects token in Authorization header
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  console.log('Verify request:', { token: token ? 'present' : 'missing' });
  
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ 
      authenticated: true,
      user: {
        username: decoded.username,
        isAdmin: decoded.isAdmin
      }
    });
  } catch (error) {
    console.error('Token verification failed:', error.message);
    res.status(401).json({ authenticated: false });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  // With token-based auth, logout is handled client-side
  res.json({ success: true });
});

// Auth middleware for protected routes
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Protected API endpoints
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
  console.log(`Token-based server running on port ${PORT}`);
});