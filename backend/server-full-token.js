const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Initialize express app first
const app = express();
const PORT = process.env.PORT || 3001;

// Simple JWT secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Import with error handling
let supabase, testConnection, strategyEvaluator, logger, requestLogger, errorLogger;

try {
  const db = require('./config/database');
  supabase = db.supabase;
  testConnection = db.testConnection;
} catch (err) {
  console.error('Database module load error:', err.message);
}

try {
  strategyEvaluator = require('./services/strategyEvaluator');
} catch (err) {
  console.error('Strategy evaluator load error:', err.message);
}

try {
  const loggerModule = require('./middleware/logger');
  logger = loggerModule.logger || console;
  requestLogger = loggerModule.requestLogger || ((req, res, next) => next());
  errorLogger = loggerModule.errorLogger || ((err, req, res, next) => next(err));
} catch (err) {
  console.error('Logger module load error:', err.message);
  logger = console;
  requestLogger = (req, res, next) => next();
  errorLogger = (err, req, res, next) => next(err);
}

// Health check endpoint (must be before other middleware for Railway)
app.get('/', (req, res) => {
  res.json({ status: 'healthy', service: 'stockagent-backend' });
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow configured frontend URL
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://app.stockagent.app',
      'http://app.stockagent.app'
    ];
    
    // Also allow Railway URLs and stockagent.app domains
    if (origin.includes('railway.app') || origin.includes('stockagent.app') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Allow cookies
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Serve static monitoring dashboard
app.use('/public', express.static('public'));

// Add request logging (exclude health checks to reduce noise)
app.use((req, res, next) => {
  if (req.path !== '/api/health') {
    requestLogger(req, res, next);
  } else {
    next();
  }
});

// Rate limiting for webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many webhook requests from this IP, please try again later.'
});

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'stockagent-backend'
  };

  // Check database connection
  if (testConnection) {
    try {
      await testConnection();
      health.database = { status: 'connected' };
    } catch (error) {
      health.database = { 
        status: 'disconnected', 
        error: error.message,
        hint: 'Check your Supabase credentials and connection'
      };
      health.status = 'degraded';
    }
  } else {
    health.database = { 
      status: 'not configured',
      hint: 'Database module not loaded' 
    };
    health.status = 'degraded';
  }

  // Add system info
  health.environment = {
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  };

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Login endpoint - returns token in response body
app.post('/api/auth/login', loginLimiter, (req, res) => {
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

// Apply auth middleware to all /api routes except auth endpoints
app.use('/api', (req, res, next) => {
  // Skip auth for auth endpoints and health check
  if (req.path.startsWith('/auth/') || req.path === '/health') {
    return next();
  }
  requireAuth(req, res, next);
});

// Webhook endpoint - receives alerts from TradingView
app.post('/webhook', webhookLimiter, async (req, res) => {
  try {
    const alert = req.body;
    
    if (logger && logger.info) {
      logger.info('Webhook received', { alert });
    }

    // Basic validation
    if (!alert.ticker || !alert.indicator || !alert.trigger) {
      return res.status(400).json({ 
        error: 'Missing required fields: ticker, indicator, trigger' 
      });
    }

    // Save alert to database
    if (supabase) {
      const { data, error } = await supabase
        .from('alerts')
        .insert([{
          ticker: alert.ticker,
          timeframe: alert.timeframe || '15m',
          indicator: alert.indicator,
          trigger: alert.trigger,
          timestamp: new Date().toISOString(),
          htf: alert.htf || null // Include HTF field
        }]);

      if (error) {
        if (logger && logger.error) {
          logger.error('Failed to save alert', { error: error.message });
        }
        return res.status(500).json({ error: 'Failed to save alert' });
      }

      // After saving alert, evaluate strategies
      if (strategyEvaluator && strategyEvaluator.evaluateStrategies) {
        try {
          const evaluationResult = await strategyEvaluator.evaluateStrategies(alert);
          if (logger && logger.info) {
            logger.info('Strategy evaluation result', evaluationResult);
          }
        } catch (evalError) {
          if (logger && logger.error) {
            logger.error('Strategy evaluation failed', { error: evalError.message });
          }
        }
      }
    } else {
      if (logger && logger.warn) {
        logger.warn('Database not configured, alert not saved');
      }
    }

    res.json({ success: true, message: 'Alert received' });
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Webhook error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent alerts
app.get('/api/alerts', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to fetch alerts', { error: error.message });
      }
      return res.status(500).json({ error: 'Failed to fetch alerts' });
    }

    res.json(data || []);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Alerts endpoint error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current score and last action
app.get('/api/score', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ lastAction: null, scores: [] });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 60;
    
    // Get the last action
    const { data: actionData, error: actionError } = await supabase
      .from('actions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (actionError) {
      if (logger && logger.error) {
        logger.error('Failed to fetch last action', { error: actionError.message });
      }
    }

    // Get scores for tickers with recent alerts
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000).toISOString();
    
    const { data: alertsData, error: alertsError } = await supabase
      .from('alerts')
      .select('ticker')
      .gte('timestamp', cutoffTime);

    if (alertsError) {
      if (logger && logger.error) {
        logger.error('Failed to fetch recent alerts', { error: alertsError.message });
      }
      return res.json({ 
        lastAction: actionData && actionData.length > 0 ? actionData[0] : null, 
        scores: [] 
      });
    }

    const uniqueTickers = [...new Set(alertsData.map(a => a.ticker))];
    const scores = [];

    // Calculate score for each ticker
    for (const ticker of uniqueTickers) {
      const { data: tickerAlerts, error: tickerError } = await supabase
        .from('alerts')
        .select('*')
        .eq('ticker', ticker)
        .gte('timestamp', cutoffTime)
        .order('timestamp', { ascending: false });

      if (!tickerError && tickerAlerts) {
        // Simple scoring: count alerts
        const score = tickerAlerts.length;
        scores.push({ ticker, score, alertCount: tickerAlerts.length });
      }
    }

    res.json({ 
      lastAction: actionData && actionData.length > 0 ? actionData[0] : null,
      scores: scores.sort((a, b) => b.score - a.score)
    });
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Score endpoint error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all strategies
app.get('/api/strategies', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to fetch strategies', { error: error.message });
      }
      return res.status(500).json({ error: 'Failed to fetch strategies' });
    }

    res.json(data || []);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Strategies endpoint error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new strategy
app.post('/api/strategies', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const strategy = req.body;
    
    // Validate required fields
    if (!strategy.name || !strategy.rules || !Array.isArray(strategy.rules)) {
      return res.status(400).json({ error: 'Invalid strategy format' });
    }

    const { data, error } = await supabase
      .from('strategies')
      .insert([{
        ...strategy,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to create strategy', { error: error.message });
      }
      return res.status(500).json({ error: 'Failed to create strategy' });
    }

    res.json(data[0]);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Create strategy error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update strategy
app.put('/api/strategies/:id', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('strategies')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to update strategy', { error: error.message });
      }
      return res.status(500).json({ error: 'Failed to update strategy' });
    }

    res.json(data[0]);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Update strategy error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete strategy
app.delete('/api/strategies/:id', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', id);

    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to delete strategy', { error: error.message });
      }
      return res.status(500).json({ error: 'Failed to delete strategy' });
    }

    res.json({ success: true });
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Delete strategy error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available alerts configuration
app.get('/api/available-alerts', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('available_alerts')
      .select('*')
      .order('indicator', { ascending: true })
      .order('trigger', { ascending: true });

    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to fetch available alerts', { error: error.message });
      }
      return res.status(500).json({ error: 'Failed to fetch available alerts' });
    }

    res.json(data || []);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Available alerts endpoint error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update available alert weight
app.put('/api/available-alerts/:id', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { weight } = req.body;

    const { data, error } = await supabase
      .from('available_alerts')
      .update({ weight })
      .eq('id', id)
      .select();

    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to update available alert', { error: error.message });
      }
      return res.status(500).json({ error: 'Failed to update alert weight' });
    }

    res.json(data[0]);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Update available alert error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user settings
app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      // Return default settings if database not configured
      return res.json({
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
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .single();

    if (error) {
      // If no settings found, return defaults
      if (error.code === 'PGRST116') {
        return res.json({
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
      }
      if (logger && logger.error) {
        logger.error('Failed to fetch settings', { error: error.message });
      }
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    res.json(data || {
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
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Settings endpoint error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save user settings
app.post('/api/settings', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ success: true });
    }

    const settings = req.body;

    // Upsert settings (insert or update)
    const { data, error } = await supabase
      .from('user_settings')
      .upsert([{
        id: 1, // Single row for settings
        ...settings,
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to save settings', { error: error.message, details: error });
      }
      // Return more detailed error for debugging
      return res.status(500).json({ 
        error: 'Failed to save settings', 
        details: error.message,
        hint: error.hint || 'Check if user_settings table exists in your database'
      });
    }

    res.json({ success: true, data: data[0] });
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Save settings error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear all alerts
app.delete('/api/alerts', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ success: true, message: 'No database configured' });
    }

    const { error } = await supabase
      .from('alerts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to clear alerts', { error: error.message });
      }
      return res.status(500).json({ error: 'Failed to clear alerts' });
    }

    res.json({ success: true, message: 'All alerts cleared' });
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Clear alerts error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Notification endpoints (stubs for now)
app.get('/api/telegram/settings', requireAuth, (req, res) => {
  res.json({ configured: false });
});

app.get('/api/discord/settings', requireAuth, (req, res) => {
  res.json({ configured: false });
});

app.post('/api/telegram/settings', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Telegram notifications not implemented yet' });
});

app.post('/api/discord/settings', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Discord notifications not implemented yet' });
});

app.post('/api/telegram/test', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Telegram test not implemented yet' });
});

app.post('/api/discord/test', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Discord test not implemented yet' });
});

app.post('/api/telegram/test-alert', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Telegram test alert not implemented yet' });
});

app.post('/api/discord/test-alert', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Discord test alert not implemented yet' });
});

// Error handling middleware
app.use(errorLogger);

// Generic error handler
app.use((err, req, res, next) => {
  if (logger && logger.error) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database connection and start server
async function startServer() {
  try {
    // Test database connection
    if (testConnection) {
      console.log('Testing database connection...');
      await testConnection();
      console.log('✅ Database connection successful');
    } else {
      console.log('⚠️  Database module not loaded - running without database');
    }

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      const message = {
        message: 'StockAgent Backend with Token Auth started',
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
          health: `/api/health`,
          webhook: `/webhook`,
          login: `/api/auth/login`,
          verify: `/api/auth/verify`
        }
      };

      if (logger && logger.info) {
        logger.info('StockAgent Backend started', message);
      } else {
        console.log(JSON.stringify(message, null, 2));
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  if (logger && logger.info) {
    logger.info('SIGTERM received, shutting down gracefully...');
  }
  process.exit(0);
});