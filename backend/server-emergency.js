const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: ['https://app.stockagent.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'healthy', service: 'stockagent-backend-emergency' });
});

// Emergency login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Emergency login attempt:', { username });
  
  if (username === 'moshelog' && password === 'log0349!') {
    res.json({ 
      success: true,
      message: 'Login successful',
      token: 'emergency-token-123'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Basic auth verify
app.get('/api/auth/verify', (req, res) => {
  res.json({ authenticated: true });
});

// Emergency API endpoints with mock data
app.get('/api/settings', (req, res) => {
  res.json({
    notifications: { enabled: true },
    theme: 'dark',
    autoRefresh: true,
    refreshInterval: 30
  });
});

app.get('/api/available-alerts', (req, res) => {
  res.json([
    { id: 'nautilus-divergence', name: 'Nautilus Divergence', weight: 25 },
    { id: 'market-core-order-block', name: 'Market Core Order Block', weight: 30 },
    { id: 'extreme-zones', name: 'Extreme Zones', weight: 35 }
  ]);
});

app.get('/api/alerts', (req, res) => {
  const mockAlerts = [
    {
      id: 1,
      ticker: 'EMERGENCY',
      indicator: 'System Alert',
      timeframe: '5M',
      trigger: 'Emergency server mode active - limited functionality',
      timestamp: new Date().toISOString(),
      htf: 'Emergency Mode'
    }
  ];
  res.json(mockAlerts);
});

app.get('/api/score', (req, res) => {
  res.json({
    tickers: {},
    lastUpdate: new Date().toISOString(),
    message: 'Emergency mode - trading features disabled'
  });
});

app.get('/api/strategies', (req, res) => {
  res.json([]);
});

// Additional endpoints needed by frontend
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', mode: 'emergency' });
});

app.get('/ticker-indicators', (req, res) => {
  res.json({});
});

app.get('/api/ticker-indicators', (req, res) => {
  res.json({});
});

app.get('/test-public', (req, res) => {
  res.json({ status: 'Emergency server running', timestamp: new Date().toISOString() });
});

// Webhook endpoint (non-functional in emergency mode)
app.post('/webhook', (req, res) => {
  console.log('Webhook received in emergency mode - ignoring');
  res.json({ status: 'received', mode: 'emergency' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Emergency server running on port ${PORT}`);
});