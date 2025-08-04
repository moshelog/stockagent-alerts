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

// Import notification services
let telegramNotifier, discordNotifier;
try {
  telegramNotifier = require('./services/telegramNotifier');
} catch (err) {
  console.error('Telegram notifier load error:', err.message);
}

try {
  discordNotifier = require('./services/discordNotifier');
} catch (err) {
  console.error('Discord notifier load error:', err.message);
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

// Async handler utility
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

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
  if (username === 'moshelog' && password === 'log0349!') {
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

// Validation middleware for JSON payloads
const validateAlertPayload = (req, res, next) => {
  const { ticker, indicator, trigger } = req.body;
  
  if (!ticker || !indicator || !trigger) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['ticker', 'indicator', 'trigger']
    });
  }
  
  // Validate ticker format (basic)
  if (typeof ticker !== 'string' || ticker.length > 20) {
    return res.status(400).json({
      error: 'Invalid ticker format'
    });
  }
  
  next();
};

// Simple test endpoint
app.post('/webhook-test', async (req, res) => {
  console.log('Webhook-test endpoint hit with body:', req.body);
  res.json({ success: true, message: 'Test endpoint working', received: req.body });
});

// Test notification endpoint - sends notifications without requiring strategy completion
app.post('/api/test-notification', requireAuth, asyncHandler(async (req, res) => {
  const { action = 'BUY', ticker = 'BTCUSDT.P' } = req.body;
  
  console.log('🧪 Test notification requested:', { action, ticker });
  
  // Create test notification data
  const testNotificationData = {
    action,
    ticker,
    strategy: action === 'BUY' ? 'Buy on discount zone' : 'Sell on Premium zone',
    triggers: action === 'BUY' 
      ? ['Discount Zone', 'Normal Bullish Divergence', 'Bullish OB Break']
      : ['Premium Zone', 'Normal Bearish Divergence', 'Bearish OB Break'],
    score: action === 'BUY' ? 4.2 : -4.3,
    isTest: true // Mark as test notification
  };

  let telegramResult = { success: false, message: 'Not configured' };
  let discordResult = { success: false, message: 'Not configured' };

  // Send Telegram test notification
  if (telegramNotifier) {
    try {
      const telegramConfig = await telegramNotifier.getTelegramConfig();
      if (telegramConfig.enabled && telegramConfig.botToken && telegramConfig.chatId) {
        telegramResult = await telegramNotifier.sendNotification(testNotificationData, telegramConfig);
        console.log('📤 Telegram test result:', telegramResult);
      } else {
        telegramResult = { success: false, message: 'Telegram not configured' };
      }
    } catch (error) {
      telegramResult = { success: false, message: error.message };
    }
  }

  // Send Discord test notification  
  if (discordNotifier) {
    try {
      const discordConfig = await discordNotifier.getDiscordConfig();
      if (discordConfig.enabled && discordConfig.webhookUrl) {
        discordResult = await discordNotifier.sendNotification(testNotificationData, discordConfig);
        console.log('📤 Discord test result:', discordResult);
      } else {
        discordResult = { success: false, message: 'Discord not configured' };
      }
    } catch (error) {
      discordResult = { success: false, message: error.message };
    }
  }

  res.json({
    success: telegramResult.success || discordResult.success,
    message: 'Test notifications sent',
    results: {
      telegram: telegramResult,
      discord: discordResult
    }
  });
}));

// Webhook endpoint for JSON format (used by test webhook button)
app.post('/webhook-json', webhookLimiter, validateAlertPayload, async (req, res) => {
  console.log('Webhook-json endpoint hit with body:', req.body);
  try {
    const { ticker, time, indicator, trigger, htf, timeframe } = req.body;
    
    if (logger && logger.info) {
      logger.info('Webhook JSON received', {
        ticker,
        indicator,
        trigger,
        htf: htf || 'none',
        timeframe: timeframe || '15m',
        timestamp: time || new Date().toISOString()
      });
    }
    
    // Save alert to database
    if (supabase) {
      const alertData = {
        ticker: ticker.toUpperCase(),
        timeframe: timeframe || '15m',
        indicator,
        trigger,
        timestamp: time ? 
          (typeof time === 'string' && time.length === 13 ? 
            new Date(parseInt(time)).toISOString() : 
            new Date(time).toISOString()) : 
          new Date().toISOString()
      };
      
      // Add HTF field if it exists
      if (htf) {
        alertData.htf = htf;
      }
      
      const { data, error } = await supabase
        .from('alerts')
        .insert([alertData]);

      if (error) {
        if (logger && logger.error) {
          logger.error('Failed to save alert', { error: error.message });
        }
        return res.status(500).json({ error: 'Failed to save alert' });
      }

      // After saving alert, evaluate strategies
      if (strategyEvaluator && strategyEvaluator.evaluateStrategiesForTicker) {
        try {
          const evaluationResult = await strategyEvaluator.evaluateStrategiesForTicker(ticker.toUpperCase(), { 
            ticker: ticker.toUpperCase(), 
            timeframe: timeframe || '15m',
            indicator,
            trigger
          });
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
    console.error('Webhook JSON error:', error);
    if (logger && logger.error) {
      logger.error('Webhook JSON error', { error: error.message, stack: error.stack });
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Webhook endpoint - receives alerts from TradingView
app.post('/webhook', webhookLimiter, express.text({ type: '*/*' }), async (req, res) => {
  console.log('WEBHOOK ENDPOINT HIT - Body:', req.body);
  try {
    const body = req.body.toString().trim();
    
    if (logger && logger.info) {
      logger.info('Webhook received', {
        contentType: req.get('Content-Type'),
        body: body
      });
    }

    // Parse text format: 
    // Legacy: "TICKER|TIMEFRAME|INDICATOR|TRIGGER" or "TICKER|TIMEFRAME|INDICATOR|TRIGGER|TIME"
    // New with price: "TICKER|PRICE|TIMEFRAME|INDICATOR|TRIGGER" or variants
    const parts = body.split('|');
    
    if (parts.length < 4) {
      return res.status(400).json({ 
        error: 'Invalid text format. Expected: TICKER|TIMEFRAME|INDICATOR|TRIGGER or TICKER|PRICE|TIMEFRAME|INDICATOR|TRIGGER',
        received: body 
      });
    }

    let ticker, price, timeframe, indicator, trigger;
    let partIndex = 0;

    // Parse ticker (always first)
    ticker = parts[partIndex++].trim();

    // Check if second part is a price (contains digits and possibly decimal/dollar)
    const secondPart = parts[partIndex] ? parts[partIndex].trim() : '';
    const isPricePattern = /^\$?[0-9,.]+$/.test(secondPart.replace(/,/g, ''));
    
    console.log('PRICE PARSING DEBUG:', {
      secondPart,
      isPricePattern,
      partsLength: parts.length,
      parts
    });
    
    if (isPricePattern && parts.length >= 5) {
      // Format with price: TICKER|PRICE|TIMEFRAME|INDICATOR|TRIGGER
      price = parseFloat(secondPart.replace(/[\$,]/g, ''));
      partIndex++;
      timeframe = parts[partIndex] ? parts[partIndex].trim() : '';
      partIndex++;
      indicator = parts[partIndex] ? parts[partIndex].trim() : '';
      partIndex++;
      trigger = parts[partIndex] ? parts[partIndex].trim() : '';
      console.log('PARSED WITH PRICE:', { price, timeframe, indicator, trigger });
    } else {
      // Legacy format without price: TICKER|TIMEFRAME|INDICATOR|TRIGGER  
      price = null;
      timeframe = secondPart;
      partIndex++;
      indicator = parts[partIndex] ? parts[partIndex].trim() : '';
      partIndex++;
      trigger = parts[partIndex] ? parts[partIndex].trim() : '';
      console.log('PARSED WITHOUT PRICE (LEGACY):', { price, timeframe, indicator, trigger });
    }
    
    // Handle HTF, time parameters, and test flag
    let htf = null;
    let time = null;
    let isTest = false;
    
    // Check if there are remaining parts after parsing the core fields
    if (partIndex < parts.length) {
      // Check if the last part is "TEST" flag
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart === 'TEST') {
        isTest = true;
        // Remove TEST from parts for normal processing
        parts.pop();
      }
      
      // Process remaining parts for HTF/time
      if (partIndex < parts.length) {
        // Check for new structure with HTF that may contain pipe symbols
        if (indicator.toLowerCase().includes('extreme') || indicator.toLowerCase() === 'indicator') {
          // New structure: includes HTF field (HTF may contain pipes)
          // Join everything from current partIndex onward as HTF field
          htf = parts.slice(partIndex).join('|').trim();
          time = null; // No time in this structure
        } else if (parts.length - partIndex === 1) {
          // Single remaining part - could be TIME
          time = parts[partIndex].trim();
        } else if (parts.length - partIndex === 2) {
          // Two remaining parts: HTF and TIME
          htf = parts[partIndex].trim();
          time = parts[partIndex + 1].trim();
        }
      }
    }

    // Validate required fields
    if (!ticker || !timeframe || !indicator || !trigger) {
      return res.status(400).json({
        error: 'Missing required fields after parsing',
        required: ['ticker', 'timeframe', 'indicator', 'trigger'],
        parsed: { ticker, timeframe, indicator, trigger }
      });
    }

    // Map TradingView indicator names to database names (case-insensitive)
    const indicatorMapping = {
      'smc': 'Market Core Pro™',
      'extreme': 'Extreme Zones',
      'oscillator': 'Nautilus™',
      'wave': 'Market Waves Pro™'
    };
    
    // Normalize indicator name - convert to lowercase for matching
    const indicatorLower = indicator.toLowerCase();
    const normalizedIndicator = indicatorMapping[indicatorLower] || indicator;

    console.log('WEBHOOK PARSED VALUES:', {
      ticker,
      price: price || 'none',
      timeframe,
      indicator: normalizedIndicator,
      trigger,
      htf: htf || 'none',
      time: time,
      isTest: isTest,
      parts: parts
    });

    if (logger && logger.info) {
      logger.info('Webhook parsed', {
        ticker,
        timeframe,
        indicator: normalizedIndicator,
        trigger,
        htf: htf || 'none',
        timestamp: time || new Date().toISOString()
      });
    }

    // Save alert to database
    if (supabase) {
      let timestamp;
      try {
        if (time) {
          if (typeof time === 'string' && time.length === 13) {
            timestamp = new Date(parseInt(time)).toISOString();
          } else {
            timestamp = new Date(time).toISOString();
          }
        } else {
          timestamp = new Date().toISOString();
        }
        console.log('TIMESTAMP CREATED:', timestamp);
      } catch (timestampError) {
        console.error('TIMESTAMP ERROR:', timestampError, 'time value:', time);
        throw new Error('Invalid time value');
      }

      const alertData = {
        ticker: ticker.toUpperCase(),
        timeframe: timeframe,
        indicator: normalizedIndicator,
        trigger: trigger,
        timestamp: timestamp
      };
      
      // Add price if it was parsed from webhook
      if (price !== null && price !== undefined) {
        alertData.price = price;
        console.log('PRICE ADDED TO ALERT DATA:', price);
      } else {
        console.log('NO PRICE TO ADD - price is:', price);
      }
      
      // Add HTF field if it exists
      if (htf) {
        alertData.htf = htf;
      }
      
      console.log('FINAL ALERT DATA BEING SAVED:', JSON.stringify(alertData, null, 2));
      
      const { data, error } = await supabase
        .from('alerts')
        .insert([alertData]);

      if (error) {
        if (logger && logger.error) {
          logger.error('Failed to save alert', { error: error.message });
        }
        return res.status(500).json({ error: 'Failed to save alert' });
      }

      // After saving alert, evaluate strategies
      if (strategyEvaluator && strategyEvaluator.evaluateStrategiesForTicker) {
        try {
          const evaluationResult = await strategyEvaluator.evaluateStrategiesForTicker(ticker.toUpperCase(), {
            ticker: ticker.toUpperCase(),
            timeframe: timeframe,
            indicator: normalizedIndicator,
            trigger: trigger,
            htf: htf,
            isTest: isTest
          });
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
    console.error('WEBHOOK ERROR:', error);
    if (logger && logger.error) {
      logger.error('Webhook error', { error: error.message, stack: error.stack });
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
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

    const { name, timeframe, rules, threshold, enabled = true, ruleGroups } = req.body;
    
    // Validation
    if (!name || !timeframe || !rules) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'timeframe', 'rules']
      });
    }
    
    if (!Array.isArray(rules) || rules.length < 1) {
      return res.status(400).json({
        error: 'Rules must be an array with at least 1 element'
      });
    }
    
    const strategyData = {
      name,
      timeframe: parseInt(timeframe),
      rules: JSON.stringify(rules),
      threshold: parseFloat(threshold) || 0,
      enabled,
      is_manual: true
    };
    
    // Add rule_groups if provided (preserves UI group structure)
    if (ruleGroups && Array.isArray(ruleGroups)) {
      strategyData.rule_groups = JSON.stringify(ruleGroups);
    }

    const { data, error } = await supabase
      .from('strategies')
      .insert(strategyData)
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
      .from('settings')
      .select('*')
      .eq('user_id', 'default') // Using 'default' for single user setup
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      if (logger && logger.error) {
        logger.error('Error fetching settings', { error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }

    // If no settings found, return default settings
    if (!data) {
      const defaultSettings = {
        ui: {
          showAlertsTable: true,
          showScoreMeter: true,
          showStrategyPanel: true,
          showWeights: true
        },
        scoring: {
          timeWindowMinutes: 60
        }
      };
      return res.json(defaultSettings);
    }

    // Return the settings from the 'settings' column
    res.json(data.settings || {
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
  const settings = req.body;
  
  try {
    if (!supabase) {
      return res.json({ success: true });
    }

    // Try to update existing record first
    const { data: updateData, error: updateError } = await supabase
      .from('settings')
      .update({
        settings: settings,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', 'default')
      .select()
      .single();

    if (updateError && updateError.code === 'PGRST116') {
      // Record doesn't exist, create it
      const { data: insertData, error: insertError } = await supabase
        .from('settings')
        .insert({
          user_id: 'default',
          settings: settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        if (logger && logger.error) {
          logger.error('Error creating settings', { error: insertError.message });
        }
        return res.status(500).json({ error: insertError.message });
      }

      return res.json(insertData.settings);
    }

    if (updateError) {
      if (logger && logger.error) {
        logger.error('Error updating settings', { error: updateError.message });
      }
      return res.status(500).json({ error: updateError.message });
    }

    res.json(updateData.settings);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Save settings error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get total count of all alerts
app.get('/api/alerts/count', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ count: 0 });
    }
    
    const { count, error } = await supabase
      .from('alerts')
      .select('id', { count: 'exact' });
    
    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to get alerts count', { error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ count: count || 0 });
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Alerts count endpoint error', { error: error.message });
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

// ============================================================================
// TELEGRAM NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * GET /api/telegram/settings - Get current Telegram settings
 */
app.get('/api/telegram/settings', requireAuth, asyncHandler(async (req, res) => {
  if (!telegramNotifier) {
    return res.json({ configured: false });
  }
  
  const config = await telegramNotifier.getTelegramConfig('default');
  
  // Check if actually configured (has both token and chat ID)
  const isConfigured = !!(config.botToken && config.botToken.length > 0 && config.chatId && config.chatId.length > 0);
  
  res.json({
    configured: isConfigured,
    botToken: isConfigured ? '***' : null, // Don't return the actual token for security
    chatId: config.chatId || null,
    messageTemplate: config.messageTemplate
  });
}));

/**
 * POST /api/telegram/settings - Save Telegram settings
 */
app.post('/api/telegram/settings', requireAuth, asyncHandler(async (req, res) => {
  if (!telegramNotifier) {
    return res.status(500).json({ error: 'Telegram service not available' });
  }
  
  const { botToken, chatId, messageTemplate } = req.body;
  
  if (!chatId) {
    return res.status(400).json({ error: 'Chat ID is required' });
  }
  
  // botToken can be null if user is not updating it
  if (botToken !== null && !botToken) {
    return res.status(400).json({ error: 'Bot token cannot be empty' });
  }
  
  // Save to database
  const result = await telegramNotifier.saveTelegramConfig('default', {
    botToken,
    chatId,
    messageTemplate
  });
  
  if (result.success) {
    res.json({ 
      success: true, 
      message: 'Telegram settings saved successfully',
      settings: {
        chatId,
        messageTemplate
      }
    });
  } else {
    res.status(500).json({ 
      error: 'Failed to save settings',
      message: result.error
    });
  }
}));

/**
 * POST /api/telegram/test - Test Telegram bot connection
 */
app.post('/api/telegram/test', requireAuth, asyncHandler(async (req, res) => {
  if (!telegramNotifier) {
    return res.status(500).json({ error: 'Telegram service not available' });
  }
  
  let { botToken, chatId } = req.body;
  
  // If no credentials provided, try to use the saved ones
  if (!botToken || !chatId) {
    const savedConfig = await telegramNotifier.getTelegramConfig('default');
    botToken = botToken || savedConfig.botToken;
    chatId = chatId || savedConfig.chatId;
    
    if (!botToken || !chatId) {
      return res.status(400).json({ error: 'Bot token and chat ID are required' });
    }
  }
  
  const result = await telegramNotifier.testConnection(botToken, chatId);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

/**
 * POST /api/telegram/test-alert - Send a test trading alert to Telegram
 */
app.post('/api/telegram/test-alert', requireAuth, asyncHandler(async (req, res) => {
  if (!telegramNotifier) {
    return res.status(500).json({ error: 'Telegram service not available' });
  }
  
  const { action = 'BUY', botToken, chatId } = req.body;
  
  // Get saved Telegram config
  const telegramConfig = await telegramNotifier.getTelegramConfig('default');
  
  const finalBotToken = botToken || telegramConfig.botToken;
  const finalChatId = chatId || telegramConfig.chatId;
  
  if (!finalBotToken || !finalChatId) {
    return res.status(400).json({ 
      error: 'Telegram not configured. Please save your bot token and chat ID first.' 
    });
  }
  
  // Test alert data
  const alertData = {
    action,
    ticker: action === 'BUY' ? 'BTC' : 'ETH',
    strategy: action === 'BUY' ? 'Buy on discount zone' : 'Sell on premium zone',
    score: action === 'BUY' ? 4.2 : -4.3,
    triggers: action === 'BUY' 
      ? ['Discount Zone', 'Normal Bullish Divergence', 'Bullish OB Break']
      : ['Premium Zone', 'Normal Bearish Divergence', 'Bearish OB Break'],
    timestamp: new Date().toISOString()
  };
  
  const result = await telegramNotifier.sendNotification(alertData, {
    botToken: finalBotToken,
    chatId: finalChatId,
    messageTemplate: telegramConfig.messageTemplate
  });
  
  if (result.success) {
    res.json({ 
      success: true, 
      message: `Test ${action} alert sent successfully!` 
    });
  } else {
    res.status(400).json({ 
      error: 'Failed to send test alert', 
      message: result.message 
    });
  }
}));

// ============================================================================
// DISCORD NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * GET /api/discord/settings - Get current Discord settings
 */
app.get('/api/discord/settings', requireAuth, asyncHandler(async (req, res) => {
  if (!discordNotifier) {
    return res.json({ configured: false });
  }
  
  const config = await discordNotifier.getDiscordConfig('default');
  
  // Check if actually configured (has webhook URL)
  const isConfigured = !!(config.webhookUrl && config.webhookUrl.length > 0);
  
  res.json({
    configured: isConfigured,
    webhookUrl: isConfigured ? '***' : null, // Don't return the actual URL for security
    messageTemplate: config.messageTemplate
  });
}));

/**
 * POST /api/discord/settings - Save Discord settings
 */
app.post('/api/discord/settings', requireAuth, asyncHandler(async (req, res) => {
  if (!discordNotifier) {
    return res.status(500).json({ error: 'Discord service not available' });
  }
  
  const { webhookUrl, messageTemplate } = req.body;
  
  // For auto-save template updates, webhookUrl might be null
  // Only require webhookUrl for initial setup or when actually updating the URL
  if (webhookUrl === undefined) {
    return res.status(400).json({ error: 'Webhook URL is required for initial setup' });
  }
  
  // Get current config for template-only updates
  let configToSave = { messageTemplate };
  
  if (webhookUrl !== null) {
    // If webhookUrl is provided (not null), include it in the update
    configToSave.webhookUrl = webhookUrl;
  } else {
    // For template-only updates, get the current webhook URL to preserve it
    const currentConfig = await discordNotifier.getDiscordConfig('default');
    configToSave.webhookUrl = currentConfig.webhookUrl;
  }
  
  // Save to database
  const result = await discordNotifier.saveDiscordConfig('default', configToSave);
  
  if (result.success) {
    res.json({ 
      success: true, 
      message: 'Discord settings saved successfully',
      settings: {
        messageTemplate
      }
    });
  } else {
    res.status(500).json({ 
      error: 'Failed to save settings',
      message: result.error
    });
  }
}));

/**
 * POST /api/discord/test - Test Discord webhook connection
 */
app.post('/api/discord/test', requireAuth, asyncHandler(async (req, res) => {
  if (!discordNotifier) {
    return res.status(500).json({ error: 'Discord service not available' });
  }
  
  let { webhookUrl } = req.body;
  
  // If no webhook URL provided, try to use the saved one
  if (!webhookUrl) {
    const savedConfig = await discordNotifier.getDiscordConfig('default');
    webhookUrl = savedConfig.webhookUrl;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }
  }
  
  const result = await discordNotifier.testConnection(webhookUrl);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
}));

/**
 * POST /api/discord/test-alert - Send a test trading alert to Discord
 */
app.post('/api/discord/test-alert', requireAuth, asyncHandler(async (req, res) => {
  if (!discordNotifier) {
    return res.status(500).json({ error: 'Discord service not available' });
  }
  
  const { action = 'BUY', webhookUrl } = req.body;
  
  // Get saved Discord config
  const discordConfig = await discordNotifier.getDiscordConfig('default');
  
  const finalWebhookUrl = webhookUrl || discordConfig.webhookUrl;
  
  if (!finalWebhookUrl) {
    return res.status(400).json({ 
      error: 'Discord not configured. Please save your webhook URL first.' 
    });
  }
  
  // Test alert data
  const alertData = {
    action,
    ticker: action === 'BUY' ? 'BTC' : 'ETH',
    strategy: action === 'BUY' ? 'Buy on discount zone' : 'Sell on premium zone',
    score: action === 'BUY' ? 4.2 : -4.3,
    triggers: action === 'BUY' 
      ? ['Discount Zone', 'Normal Bullish Divergence', 'Bullish OB Break']
      : ['Premium Zone', 'Normal Bearish Divergence', 'Bearish OB Break'],
    timestamp: new Date().toISOString()
  };
  
  const result = await discordNotifier.sendNotification(alertData, {
    webhookUrl: finalWebhookUrl,
    messageTemplate: discordConfig.messageTemplate
  });
  
  if (result.success) {
    res.json({ 
      success: true, 
      message: `Test ${action} alert sent successfully!` 
    });
  } else {
    res.status(400).json({ 
      error: 'Failed to send test alert', 
      message: result.message 
    });
  }
}));

// Admin endpoints for indicators management
app.get('/api/indicators', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('indicators')
      .select('*')
      .order('name');
    
    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to fetch indicators', { error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data || []);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Indicators endpoint error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new indicator
app.post('/api/indicators', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { name, display_name, description, category } = req.body;
    
    if (!name || !display_name) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['name', 'display_name'] 
      });
    }
    
    const { data, error } = await supabase
      .from('indicators')
      .insert([{
        name: name.toLowerCase(),
        display_name,
        description: description || '',
        category: category || 'general',
        enabled: true,
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to create indicator', { error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data[0]);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Create indicator error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update indicator
app.put('/api/indicators/:id', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { name, display_name, description, category, enabled } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name.toLowerCase();
    if (display_name !== undefined) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (enabled !== undefined) updateData.enabled = enabled;
    
    const { data, error } = await supabase
      .from('indicators')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to update indicator', { error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data[0]);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Update indicator error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete indicator
app.delete('/api/indicators/:id', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    
    // Check if indicator has associated alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('available_alerts')
      .select('id')
      .eq('indicator_id', id);
    
    if (alertsError) {
      if (logger && logger.error) {
        logger.error('Failed to check indicator alerts', { error: alertsError.message });
      }
      return res.status(500).json({ error: alertsError.message });
    }
    
    if (alerts && alerts.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete indicator with associated alerts',
        alertCount: alerts.length 
      });
    }
    
    const { error } = await supabase
      .from('indicators')
      .delete()
      .eq('id', id);
    
    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to delete indicator', { error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Delete indicator error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get alerts for an indicator
app.get('/api/indicators/:id/alerts', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.json([]);
    }

    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('available_alerts')
      .select('*')
      .eq('indicator_id', id)
      .order('trigger');
    
    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to fetch indicator alerts', { error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data || []);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Indicator alerts endpoint error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create alert for indicator
app.post('/api/indicators/:id/alerts', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id: indicator_id } = req.params;
    const { trigger, description, weight } = req.body;
    
    if (!trigger) {
      return res.status(400).json({ 
        error: 'Missing required field: trigger' 
      });
    }
    
    const { data, error } = await supabase
      .from('available_alerts')
      .insert([{
        indicator_id,
        trigger,
        description: description || '',
        weight: weight || 1.0,
        enabled: true,
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to create alert', { error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data[0]);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Create alert error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update alert
app.put('/api/alerts/:id', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const { trigger, description, weight, enabled } = req.body;
    
    const updateData = {};
    if (trigger !== undefined) updateData.trigger = trigger;
    if (description !== undefined) updateData.description = description;
    if (weight !== undefined) updateData.weight = weight;
    if (enabled !== undefined) updateData.enabled = enabled;
    
    const { data, error } = await supabase
      .from('available_alerts')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to update alert', { error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data[0]);
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Update alert error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete alert
app.delete('/api/alerts/:id', requireAuth, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    
    const { error } = await supabase
      .from('available_alerts')
      .delete()
      .eq('id', id);
    
    if (error) {
      if (logger && logger.error) {
        logger.error('Failed to delete alert', { error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (error) {
    if (logger && logger.error) {
      logger.error('Delete alert error', { error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
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