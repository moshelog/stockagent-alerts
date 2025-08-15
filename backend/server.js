const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Initialize express app first
const app = express();
const PORT = process.env.PORT || 3001;

// Import with error handling
let supabase, testConnection, strategyEvaluator, logger, requestLogger, errorLogger, authService;

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

try {
  authService = require('./services/authService');
} catch (err) {
  console.error('Auth service load error:', err.message);
}

// Admin API endpoints deployment fix - 2025-07-30T21:08:00

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
app.use(cookieParser());

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Webhook rate limiting (more permissive for TradingView)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 webhooks per minute
  message: 'Webhook rate limit exceeded'
});
app.use('/webhook', webhookLimiter);

// Utility function to handle async routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation middleware
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

// ============================================================================
// HELPER FUNCTIONS FOR EXTREME INDICATORS
// ============================================================================

/**
 * Parse technical indicators from Extreme alert trigger text
 * @param {string} trigger - The trigger text containing indicator values
 * @returns {object|null} - Parsed indicator values or null if parsing fails
 */
function parseExtremeIndicators(trigger) {
  try {
    const indicators = {};
    
    // Extract VWAP value and percentage: "VWAP: 0.75%"
    const vwapMatch = trigger.match(/VWAP:\s*([\d.-]+)%?/i);
    if (vwapMatch) {
      indicators.vwap_value = parseFloat(vwapMatch[1]);
    }
    
    // Extract RSI value and status: "RSI: 68.5 (OB)" or "RSI: 45.2 (Neutral)"
    const rsiMatch = trigger.match(/RSI:\s*([\d.-]+)\s*\(([^)]+)\)/i);
    if (rsiMatch) {
      indicators.rsi_value = parseFloat(rsiMatch[1]);
      indicators.rsi_status = rsiMatch[2].trim();
    }
    
    // Extract ADX value, strength, and direction: "ADX: 32.1 (Strong Bullish)"
    const adxMatch = trigger.match(/ADX:\s*([\d.-]+)\s*\(([^)]+)\)/i);
    if (adxMatch) {
      indicators.adx_value = parseFloat(adxMatch[1]);
      const adxInfo = adxMatch[2].trim();
      
      // Parse strength and direction from "Strong Bullish", "Weak Bearish", or "Strong Neutral"
      const strengthMatch = adxInfo.match(/(Strong|Weak)\s+(Bullish|Bearish|Neutral)/i);
      if (strengthMatch) {
        indicators.adx_strength = strengthMatch[1];
        indicators.adx_direction = strengthMatch[2];
      } else {
        // Fallback for different formats
        indicators.adx_strength = adxInfo.includes('Strong') ? 'Strong' : 'Weak';
        if (adxInfo.includes('Bullish')) {
          indicators.adx_direction = 'Bullish';
        } else if (adxInfo.includes('Bearish')) {
          indicators.adx_direction = 'Bearish';
        } else {
          indicators.adx_direction = 'Neutral';
        }
      }
    }
    
    // Extract HTF synergy status: "HTF: Reversal Bullish"
    const htfMatch = trigger.match(/HTF:\s*([^|]+?)(?:\s*\||$)/i);
    if (htfMatch) {
      indicators.htf_status = htfMatch[1].trim();
    }
    
    // Return indicators if at least one was found
    return Object.keys(indicators).length > 0 ? indicators : null;
    
  } catch (error) {
    logger.error('Error parsing extreme indicators', {
      error: error.message,
      trigger
    });
    return null;
  }
}

/**
 * Update ticker indicators table with latest values
 * @param {string} ticker - The ticker symbol
 * @param {object} indicators - Parsed indicator values
 */
async function updateTickerIndicators(ticker, indicators) {
  try {
    // Use upsert to insert or update existing record
    const { data, error } = await supabase
      .from('ticker_indicators')
      .upsert({
        ticker: ticker.toUpperCase(),
        ...indicators,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'ticker'
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Failed to update ticker indicators', {
        error: error.message,
        ticker,
        indicators
      });
    } else {
      logger.info('Ticker indicators updated successfully', {
        ticker: data.ticker,
        indicators
      });
    }
    
    return data;
    
  } catch (error) {
    logger.error('Error updating ticker indicators', {
      error: error.message,
      ticker,
      indicators
    });
    return null;
  }
}

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

// Webhook authentication middleware
const webhookAuth = (req, res, next) => {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    logger.warn('WEBHOOK_SECRET not configured - webhook endpoints are unprotected');
    return next();
  }
  
  const providedSecret = req.headers['x-webhook-secret'] || req.query.secret;
  
  if (providedSecret !== webhookSecret) {
    logger.warn('Invalid webhook secret attempt', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

/**
 * POST /webhook-json - Receive TradingView alerts (JSON format)
 * Expected payload: { ticker, time?, indicator, trigger, htf? }
 */
app.post('/webhook-json', webhookAuth, validateAlertPayload, asyncHandler(async (req, res) => {
  const { ticker, time, indicator, trigger, htf } = req.body;
  
  logger.info('Webhook received', {
    ticker,
    indicator,
    trigger,
    htf: htf || 'none',
    timestamp: time || new Date().toISOString()
  });
  
  try {
    // Handle duplicate detection for specific indicators
    const isDuplicateAlert = ['VWAP', 'RSI', 'ADX'].some(alertType => 
      trigger.includes(alertType) || indicator.toLowerCase().includes(alertType.toLowerCase())
    );
    
    if (isDuplicateAlert) {
      // Check for existing recent alert of the same type for this ticker
      const indicatorType = trigger.includes('VWAP') ? 'VWAP' : 
                           trigger.includes('RSI') ? 'RSI' : 
                           trigger.includes('ADX') ? 'ADX' : null;
      
      if (indicatorType) {
        logger.info(`Processing ${indicatorType} alert for duplicate detection (JSON)`, {
          ticker: ticker.toUpperCase(),
          trigger,
          indicatorType
        });
        
        // Delete existing alerts of the same type for this ticker (keep only the newest)
        const { error: deleteError } = await supabase
          .from('alerts')
          .delete()
          .eq('ticker', ticker.toUpperCase())
          .like('trigger', `%${indicatorType}%`);
          
        if (deleteError) {
          logger.warn('Failed to delete duplicate alert (JSON)', { 
            error: deleteError.message,
            ticker: ticker.toUpperCase(),
            indicatorType 
          });
        } else {
          logger.info(`Removed previous ${indicatorType} alerts for ${ticker.toUpperCase()} (JSON)`);
        }
      }
    }

    // Insert alert into database
    const alertData = {
      ticker: ticker.toUpperCase(),
      indicator,
      trigger,
      timestamp: time ? 
        (typeof time === 'string' && time.length === 13 ? 
          new Date(parseInt(time)).toISOString() : 
          new Date(time).toISOString()) : 
        new Date().toISOString()
    };
    
    // Add HTF field if it exists (after database migration)
    if (htf) {
      alertData.htf = htf;
    }
    
    const { data: newAlert, error: insertError } = await supabase
      .from('alerts')
      .insert(alertData)
      .select()
      .single();
    
    if (insertError) {
      logger.error('Failed to insert alert', {
        error: insertError.message,
        ticker,
        indicator,
        trigger
      });
      return res.status(500).json({ 
        error: 'Failed to save alert',
        details: insertError.message 
      });
    }
    
    logger.info('Alert saved successfully', {
      alertId: newAlert.id,
      ticker: newAlert.ticker,
      indicator: newAlert.indicator,
      trigger: newAlert.trigger
    });
    
    // Evaluate strategies for this ticker
    await strategyEvaluator.evaluateStrategiesForTicker(ticker.toUpperCase(), newAlert);
    
    res.status(200).json({
      success: true,
      alert: newAlert,
      message: 'Alert processed successfully'
    });
    
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error.message,
      stack: error.stack,
      ticker,
      indicator,
      trigger
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}));

/**
 * POST /webhook - Receive TradingView alerts (Primary endpoint)
 * Standard format: "TICKER|TIMEFRAME|INDICATOR|TRIGGER" or "TICKER|TIMEFRAME|INDICATOR|TRIGGER|PRICE"
 * User format: "TICKER|PRICE|TIMEFRAME|INDICATOR|TRIGGER" (price in 2nd position)
 * Extended formats: "TICKER|TIMEFRAME|INDICATOR|TRIGGER|PRICE|TIME" or "TICKER|INTERVAL|Extreme|TRIGGER|HTF|PRICE"
 */
app.post('/webhook', webhookAuth, express.text({ type: '*/*' }), asyncHandler(async (req, res) => {
  const body = req.body.toString().trim();
  
  logger.info('Webhook received', {
    contentType: req.get('Content-Type'),
    body: body
  });

  // Parse text format: "TICKER|TIMEFRAME|INDICATOR|TRIGGER" or "TICKER|TIMEFRAME|INDICATOR|TRIGGER|PRICE"
  // Extended formats: "TICKER|TIMEFRAME|INDICATOR|TRIGGER|PRICE|TIME" or "TICKER|INTERVAL|Extreme|TRIGGER|HTF|PRICE"
  // Handle spaces around pipes: "TICKER | PRICE | TIMEFRAME | INDICATOR | TRIGGER"
  const parts = body.split('|').map(part => part.trim());
  
  // Detect format based on 2nd position - if it's numeric, it's price-first format
  const secondPart = parts[1] || '';
  const isSecondPartNumeric = /^\d+\.?\d*$/.test(secondPart);
  
  // Validate minimum parts based on format
  if (isSecondPartNumeric && parts.length < 5) {
    return res.status(400).json({ 
      error: 'Invalid price-first format. Expected: TICKER|PRICE|TIMEFRAME|INDICATOR|TRIGGER',
      received: body 
    });
  } else if (!isSecondPartNumeric && parts.length < 4) {
    return res.status(400).json({ 
      error: 'Invalid standard format. Expected: TICKER|TIMEFRAME|INDICATOR|TRIGGER',
      received: body 
    });
  }
  
  let ticker, timeframe, indicator, trigger, price = null;
  
  if (isSecondPartNumeric && parts.length >= 5) {
    // User format: TICKER|PRICE|TIMEFRAME|INDICATOR|TRIGGER
    ticker = parts[0];
    price = parseFloat(secondPart);
    timeframe = parts[2];
    indicator = parts[3];
    trigger = parts[4];
  } else {
    // Standard format: TICKER|TIMEFRAME|INDICATOR|TRIGGER
    ticker = parts[0];
    timeframe = parts[1];
    indicator = parts[2];
    trigger = parts[3];
  }
  
  // Handle additional parameters for standard format (5th position = price)
  if (!isSecondPartNumeric && parts.length >= 5) {
    const fifthPart = parts[4];
    const isNumeric = /^\d+\.?\d*$/.test(fifthPart);
    
    if (isNumeric) {
      // It's a price: TICKER|TIMEFRAME|INDICATOR|TRIGGER|PRICE
      price = parseFloat(fifthPart);
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

  logger.info('Webhook parsed', {
    format: isSecondPartNumeric ? 'price-first' : 'standard',
    raw_parts: parts,
    parsed: {
      ticker,
      timeframe,
      indicator: normalizedIndicator,
      trigger,
      price: price || null
    }
  });

  try {
      // Handle Extreme Indicator alerts with new format
    if (normalizedIndicator === 'Extreme Zones' || normalizedIndicator.toLowerCase() === 'extreme') {
      // Parse technical indicators from the trigger text
      // Format: "Premium Zone Touch | VWAP: 0.75% | RSI: 68.5 (OB) | ADX: 32.1 (Strong Bullish) | HTF: Reversal Bullish"
      const extractedIndicators = parseExtremeIndicators(trigger);
      
      if (extractedIndicators) {
        // Update ticker indicators table with latest values
        await updateTickerIndicators(ticker.toUpperCase(), extractedIndicators);
        
        logger.info('Updated ticker indicators from Extreme alert', {
          ticker: ticker.toUpperCase(),
          indicators: extractedIndicators
        });
      }
    }

    // Handle duplicate detection for specific indicators
    const isDuplicateAlert = ['VWAP', 'RSI', 'ADX'].some(indicator => 
      trigger.includes(indicator) || normalizedIndicator.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (isDuplicateAlert) {
      // Check for existing recent alert of the same type for this ticker
      const indicatorType = trigger.includes('VWAP') ? 'VWAP' : 
                           trigger.includes('RSI') ? 'RSI' : 
                           trigger.includes('ADX') ? 'ADX' : null;
      
      if (indicatorType) {
        logger.info(`Processing ${indicatorType} alert for duplicate detection`, {
          ticker: ticker.toUpperCase(),
          trigger,
          indicatorType
        });
        
        // Delete existing alerts of the same type for this ticker (keep only the newest)
        const { error: deleteError } = await supabase
          .from('alerts')
          .delete()
          .eq('ticker', ticker.toUpperCase())
          .like('trigger', `%${indicatorType}%`);
          
        if (deleteError) {
          logger.warn('Failed to delete duplicate alert', { 
            error: deleteError.message,
            ticker: ticker.toUpperCase(),
            indicatorType 
          });
        } else {
          logger.info(`Removed previous ${indicatorType} alerts for ${ticker.toUpperCase()}`);
        }
      }
    }

    // Insert alert into database
    const alertData = {
      ticker: ticker.toUpperCase(),
      timeframe,
      indicator: normalizedIndicator,
      trigger,
      timestamp: new Date().toISOString()
    };
    
    // Add price field if it exists
    if (price !== null && !isNaN(price)) {
      alertData.price = price;
    }
    
    const { data: newAlert, error: insertError } = await supabase
      .from('alerts')
      .insert(alertData)
      .select()
      .single();
    
    if (insertError) {
      logger.error('Failed to insert webhook alert', {
        error: insertError.message,
        alertData
      });
      return res.status(500).json({
        error: 'Database error',
        message: insertError.message
      });
    }

    logger.info('Webhook alert inserted successfully', {
      id: newAlert.id,
      ticker: newAlert.ticker,
      price: newAlert.price || null,
      timeframe: newAlert.timeframe,
      indicator: newAlert.indicator,
      trigger: newAlert.trigger
    });

    // Evaluate strategies for this ticker
    await strategyEvaluator.evaluateStrategiesForTicker(ticker.toUpperCase(), newAlert);

    res.status(200).json({
      success: true,
      alert: newAlert,
      message: 'Webhook processed successfully'
    });
    
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error.message,
      stack: error.stack,
      ticker,
      indicator,
      trigger
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}));

/**
 * POST /webhook-text - Receive TradingView alerts (Text format)
 * Expected payload: "TICKER|TIMEFRAME|INDICATOR|TRIGGER" or "TICKER|TIMEFRAME|INDICATOR|TRIGGER|TIME"
 */
app.post('/webhook-text', webhookAuth, express.text({ type: '*/*' }), asyncHandler(async (req, res) => {
  const body = req.body.toString().trim();
  
  logger.info('Text webhook received', {
    contentType: req.get('Content-Type'),
    body: body
  });

  // Parse text format: "TICKER|TIMEFRAME|INDICATOR|TRIGGER" or "TICKER|TIMEFRAME|INDICATOR|TRIGGER|TIME"
  const parts = body.split('|');
  
  if (parts.length < 4) {
    return res.status(400).json({ 
      error: 'Invalid text format. Expected: TICKER|TIMEFRAME|INDICATOR|TRIGGER or TICKER|TIMEFRAME|INDICATOR|TRIGGER|TIME',
      received: body 
    });
  }

  const ticker = parts[0].trim();
  const timeframe = parts[1].trim();
  const indicator = parts[2].trim();
  const trigger = parts[3].trim();
  const time = parts[4] ? parts[4].trim() : null;

  // Validate required fields
  if (!ticker || !timeframe || !indicator || !trigger) {
    return res.status(400).json({
      error: 'Missing required fields after parsing',
      required: ['ticker', 'timeframe', 'indicator', 'trigger'],
      parsed: { ticker, timeframe, indicator, trigger }
    });
  }

  logger.info('Text webhook parsed', {
    ticker,
    timeframe,
    indicator,
    trigger,
    timestamp: time || new Date().toISOString()
  });

  try {
    // Handle duplicate detection for specific indicators
    const isDuplicateAlert = ['VWAP', 'RSI', 'ADX'].some(alertType => 
      trigger.includes(alertType) || indicator.toLowerCase().includes(alertType.toLowerCase())
    );
    
    if (isDuplicateAlert) {
      // Check for existing recent alert of the same type for this ticker
      const indicatorType = trigger.includes('VWAP') ? 'VWAP' : 
                           trigger.includes('RSI') ? 'RSI' : 
                           trigger.includes('ADX') ? 'ADX' : null;
      
      if (indicatorType) {
        logger.info(`Processing ${indicatorType} alert for duplicate detection (TEXT)`, {
          ticker: ticker.toUpperCase(),
          trigger,
          indicatorType
        });
        
        // Delete existing alerts of the same type for this ticker (keep only the newest)
        const { error: deleteError } = await supabase
          .from('alerts')
          .delete()
          .eq('ticker', ticker.toUpperCase())
          .like('trigger', `%${indicatorType}%`);
          
        if (deleteError) {
          logger.warn('Failed to delete duplicate alert (TEXT)', { 
            error: deleteError.message,
            ticker: ticker.toUpperCase(),
            indicatorType 
          });
        } else {
          logger.info(`Removed previous ${indicatorType} alerts for ${ticker.toUpperCase()} (TEXT)`);
        }
      }
    }

    // Insert alert into database
    const alertData = {
      ticker: ticker.toUpperCase(),
      timeframe,
      indicator,
      trigger,
      timestamp: time ? 
        (typeof time === 'string' && time.length === 13 ? 
          new Date(parseInt(time)).toISOString() : 
          new Date(time).toISOString()) : 
        new Date().toISOString()
    };
    
    const { data: newAlert, error: insertError } = await supabase
      .from('alerts')
      .insert(alertData)
      .select()
      .single();
    
    if (insertError) {
      logger.error('Failed to insert text alert', {
        error: insertError.message,
        alertData
      });
      return res.status(500).json({
        error: 'Database error',
        message: insertError.message
      });
    }

    logger.info('Text alert inserted successfully', {
      id: newAlert.id,
      ticker: newAlert.ticker
    });

    // Evaluate strategies for this ticker
    await strategyEvaluator.evaluateStrategiesForTicker(ticker.toUpperCase(), newAlert);

    res.status(200).json({
      success: true,
      alert: newAlert,
      message: 'Text alert processed successfully'
    });
    
  } catch (error) {
    logger.error('Text webhook processing error', {
      error: error.message,
      stack: error.stack,
      ticker,
      indicator,
      trigger
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}));

/**
 * POST /migrate-settings - Initialize default settings
 */
app.post('/migrate-settings', asyncHandler(async (req, res) => {
  logger.info('Initializing default settings');

  try {
    // Insert or update default settings directly
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        user_id: 'default',
        settings: {
          ui: {
            showAlertsTable: true,
            showScoreMeter: true,
            showStrategyPanel: true,
            showWeights: true
          },
          scoring: {
            timeWindowMinutes: 60
          }
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (error) {
      logger.error('Failed to initialize settings', { error: error.message });
      return res.status(500).json({ 
        error: 'Failed to initialize settings',
        details: error.message
      });
    }

    logger.info('Settings initialized successfully');
    
    res.json({ 
      success: true, 
      message: 'Default settings initialized successfully',
      data: data
    });
    
  } catch (error) {
    logger.error('Settings initialization failed', { error: error.message });
    res.status(500).json({ 
      error: 'Initialization failed', 
      message: error.message 
    });
  }
}));

/**
 * POST /migrate-timeframe - Add timeframe column to alerts table
 */
app.post('/migrate-timeframe', asyncHandler(async (req, res) => {
  logger.info('Adding timeframe column to alerts table');

  try {
    // Add timeframe column if it doesn't exist
    const { error: alterError } = await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE alerts ADD COLUMN IF NOT EXISTS timeframe VARCHAR(10);'
    });

    if (alterError) {
      logger.error('Failed to add timeframe column', { error: alterError.message });
      return res.status(500).json({ 
        error: 'Failed to add timeframe column',
        details: alterError.message
      });
    }

    // Add index for better performance
    const { error: indexError } = await supabase.rpc('execute_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_timeframe ON alerts(timeframe);'
    });

    if (indexError) {
      logger.warn('Failed to create timeframe index', { error: indexError.message });
    }

    // Update existing alerts to have default timeframe
    const { data: updateResult, error: updateError } = await supabase
      .from('alerts')
      .update({ timeframe: '15m' })
      .is('timeframe', null);

    if (updateError) {
      logger.error('Failed to update existing alerts with default timeframe', { error: updateError.message });
      return res.status(500).json({ 
        error: 'Failed to update existing alerts',
        details: updateError.message
      });
    }

    logger.info('Timeframe migration completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Timeframe column added and existing alerts updated',
      updatedRows: updateResult?.length || 0
    });
    
  } catch (error) {
    logger.error('Timeframe migration failed', { error: error.message });
    res.status(500).json({ 
      error: 'Migration failed', 
      message: error.message 
    });
  }
}));

/**
 * POST /migrate-indicators - Update indicator names in database
 */
app.post('/migrate-indicators', asyncHandler(async (req, res) => {
  logger.info('Migrating indicator names in database');

  const migrations = [
    { from: 'Nautilus™', to: 'Oscillator' },
    { from: 'Nautilus™ Oscillator', to: 'Oscillator' },
    { from: 'Nautilus', to: 'Oscillator' },
    { from: 'Nautilus Core', to: 'Oscillator' },
    { from: 'Market Core Pro™', to: 'SMC' },
    { from: 'Market Waves Pro™', to: 'Waves' }
  ];

  let totalUpdated = 0;

  try {
    for (const migration of migrations) {
      const { data, error } = await supabase
        .from('alerts')
        .update({ indicator: migration.to })
        .eq('indicator', migration.from)
        .select('id');

      if (error) {
        logger.error('Migration error', { error: error.message, migration });
        continue;
      }

      const updated = data?.length || 0;
      totalUpdated += updated;
      
      if (updated > 0) {
        logger.info('Migrated indicator', {
          from: migration.from,
          to: migration.to,
          count: updated
        });
      }
    }

    res.json({
      success: true,
      message: 'Indicator migration completed',
      totalUpdated,
      migrations: migrations.map(m => `${m.from} → ${m.to}`)
    });

  } catch (error) {
    logger.error('Migration failed', { error: error.message });
    res.status(500).json({
      error: 'Migration failed',
      message: error.message
    });
  }
}));

// ============================================================================
// SETTINGS ENDPOINTS
// ============================================================================

/**
 * GET /api/settings - Get user settings from database
 */
app.get('/api/settings', asyncHandler(async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', 'default') // Using 'default' for single user setup
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      logger.error('Error fetching settings', { error: error.message });
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
      
      logger.info('No settings found, returning defaults');
      return res.json(defaultSettings);
    }

    logger.info('Settings retrieved successfully');
    res.json(data.settings);

  } catch (error) {
    logger.error('Failed to get settings', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
}));

/**
 * POST /api/settings - Save user settings to database
 */
app.post('/api/settings', asyncHandler(async (req, res) => {
  const settings = req.body;

  try {
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
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        logger.error('Error inserting settings', { error: insertError.message, settings });
        return res.status(500).json({ error: insertError.message });
      }

      logger.info('Settings inserted successfully', { 
        showWeights: settings.ui?.showWeights,
        settingsKeys: Object.keys(settings)
      });
      
      return res.json({ 
        success: true, 
        message: 'Settings saved successfully',
        settings: insertData.settings
      });
    } else if (updateError) {
      logger.error('Error updating settings', { error: updateError.message, settings });
      return res.status(500).json({ error: updateError.message });
    }

    logger.info('Settings updated successfully', { 
      showWeights: settings.ui?.showWeights,
      settingsKeys: Object.keys(settings)
    });
    
    res.json({ 
      success: true, 
      message: 'Settings saved successfully',
      settings: updateData.settings
    });

  } catch (error) {
    logger.error('Failed to save settings', { error: error.message });
    res.status(500).json({ error: 'Failed to save settings' });
  }
}));

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

/**
 * POST /api/auth/login - User login
 */
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const result = await authService.authenticate(username, password, ipAddress);

  if (!result.success) {
    return res.status(result.statusCode || 401).json({ 
      error: result.error,
      remainingAttempts: result.remainingAttempts 
    });
  }

  // Set httpOnly cookie with token
  res.cookie('authToken', result.token, {
    httpOnly: true,
    secure: true, // Always use secure in production
    sameSite: 'none', // Required for cross-domain cookies
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/' // Cookie available on all paths
  });

  res.json({ 
    success: true, 
    message: 'Login successful',
    token: result.token, // Include token for frontend localStorage
    expiresIn: result.expiresIn 
  });
}));

/**
 * POST /api/auth/logout - User logout
 */
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/auth/verify - Verify authentication status
 */
app.get('/api/auth/verify', authService.requireAuth(), (req, res) => {
  res.json({ 
    authenticated: true, 
    user: {
      username: req.user.username,
      isAdmin: req.user.isAdmin
    }
  });
});

// ============================================================================
// PUBLIC TICKER INDICATORS ENDPOINTS (UNPROTECTED)
// ============================================================================

/**
 * GET /ticker-indicators - Get current indicator values for all tickers (public access)
 */
app.get('/ticker-indicators', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('ticker_indicators')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

/**
 * GET /ticker-indicators/:ticker - Get current indicator values for specific ticker (public access)
 */
app.get('/ticker-indicators/:ticker', asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  
  const { data, error } = await supabase
    .from('ticker_indicators')
    .select('*')
    .eq('ticker', ticker.toUpperCase())
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    return res.status(500).json({ error: error.message });
  }
  
  // Return null if no indicators found for this ticker
  res.json(data || null);
}));

// ============================================================================
// API ENDPOINTS (PROTECTED)
// ============================================================================

// Apply authentication to all API routes except auth endpoints
app.use('/api', (req, res, next) => {
  // Skip auth for authentication endpoints
  if (req.path.startsWith('/auth/')) {
    return next();
  }
  
  // Skip auth for health endpoint
  if (req.path === '/health') {
    return next();
  }
  
  // Skip auth for ticker-indicators endpoints (needed for real-time data)
  if (req.path.startsWith('/ticker-indicators') || req.path.includes('ticker-indicators')) {
    return next();
  }
  
  // Require authentication for all other API routes
  authService.requireAuth()(req, res, next);
});

/**
 * GET /api/alerts - Get recent alerts with optional time window filtering
 */
app.get('/api/alerts', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 500); // Max 500 alerts for time window support
  const timeWindowMinutes = parseInt(req.query.timeWindow) || null; // Optional time window in minutes
  
  let query = supabase
    .from('alerts')
    .select('*')
    .order('timestamp', { ascending: false });
    
  // Apply time window filter if specified
  if (timeWindowMinutes && timeWindowMinutes > 0) {
    const cutoffTime = new Date(Date.now() - (timeWindowMinutes * 60 * 1000)).toISOString();
    query = query.gte('timestamp', cutoffTime);
    logger.info(`Filtering alerts to last ${timeWindowMinutes} minutes (since ${cutoffTime})`);
  }
  
  const { data, error } = await query.limit(limit);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  // DEBUG: Log BTCUSDT.P alerts being returned
  const btcAlerts = (data || []).filter(alert => alert.ticker === 'BTCUSDT.P');
  if (btcAlerts.length > 0) {
    console.log('🎯 *** BACKEND RETURNING BTCUSDT.P ALERTS ***');
    console.log('🎯 Total alerts returned:', data?.length || 0);
    console.log('🎯 BTCUSDT.P alerts returned:', btcAlerts.length);
    btcAlerts.forEach((alert, i) => {
      console.log(`🎯 [${i+1}] ${alert.timestamp} - ${alert.indicator}:${alert.trigger}`);
    });
  } else {
    console.log('🎯 *** NO BTCUSDT.P ALERTS RETURNED BY BACKEND ***');
    console.log('🎯 Total alerts returned:', data?.length || 0);
    console.log('🎯 All tickers returned:', [...new Set((data || []).map(a => a.ticker))]);
  }
  
  res.json(data);
}));

/**
 * GET /api/alerts/count - Get total count of all alerts
 */
app.get('/api/alerts/count', asyncHandler(async (req, res) => {
  const { count, error } = await supabase
    .from('alerts')
    .select('id', { count: 'exact' });
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json({ count });
}));

/**
 * DELETE /api/alerts - Clear all alerts
 */
app.delete('/api/alerts', asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('alerts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
  
  if (error) {
    logger.error('Failed to clear alerts', {
      error: error.message
    });
    return res.status(500).json({ error: error.message });
  }
  
  logger.info('All alerts cleared successfully');
  res.json({ 
    success: true, 
    message: 'All alerts cleared successfully' 
  });
}));

/**
 * GET /api/ticker-indicators - Get current indicator values for all tickers
 */
app.get('/api/ticker-indicators', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('ticker_indicators')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

/**
 * GET /api/ticker-indicators/:ticker - Get current indicator values for specific ticker
 */
app.get('/api/ticker-indicators/:ticker', asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  
  const { data, error } = await supabase
    .from('ticker_indicators')
    .select('*')
    .eq('ticker', ticker.toUpperCase())
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    return res.status(500).json({ error: error.message });
  }
  
  // Return null if no indicators found for this ticker
  res.json(data || null);
}));

/**
 * GET /api/strategies - Get all strategies
 */
app.get('/api/strategies', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

/**
 * GET /api/score - Get latest action and ticker scores
 */
app.get('/api/score', asyncHandler(async (req, res) => {
  try {
    // Get time window from query parameter (default: 60 minutes)
    const timeWindowMinutes = Math.min(parseInt(req.query.timeWindow) || 60, 1440); // Max 24 hours
    
    // Get latest action
    const latestAction = await strategyEvaluator.getLatestAction();
    
    // Get ticker scores with custom time window
    const tickerScores = await strategyEvaluator.getTickerScores(timeWindowMinutes);
    
    res.json({
      lastAction: latestAction ? {
        strategy_id: latestAction.strategy_id,
        ticker: latestAction.ticker,
        action: latestAction.action,
        timestamp: latestAction.timestamp,
        timeframe: latestAction.strategies?.timeframe || '15m',
        strategy_name: latestAction.strategies?.name || 'Unknown'
      } : null,
      scores: tickerScores
    });
    
  } catch (error) {
    console.error('❌ Error getting scores:', error.message);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * GET /api/actions - Get recent actions
 */
app.get('/api/actions', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  
  const { data, error } = await supabase
    .from('actions')
    .select(`
      *,
      strategies:strategy_id (
        name,
        timeframe
      )
    `)
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

// ============================================================================
// STRATEGY CRUD ENDPOINTS
// ============================================================================

/**
 * POST /api/strategies - Create new strategy
 */
app.post('/api/strategies', asyncHandler(async (req, res) => {
  const { name, timeframe, rules, threshold, enabled = true, ruleGroups } = req.body;
  
  // Validation - check for undefined, not falsy (0 is valid for timeframe)
  if (!name || timeframe === undefined || !rules) {
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
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.status(201).json(data);
}));

/**
 * PUT /api/strategies/:id - Update strategy
 */
app.put('/api/strategies/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, timeframe, rules, threshold, enabled, ruleGroups } = req.body;
  
  const updateData = {};
  
  if (name !== undefined) updateData.name = name;
  if (timeframe !== undefined) updateData.timeframe = parseInt(timeframe);
  if (rules !== undefined) updateData.rules = JSON.stringify(rules);
  if (threshold !== undefined) updateData.threshold = parseFloat(threshold);
  if (enabled !== undefined) updateData.enabled = enabled;
  
  // Add rule_groups if provided (preserves UI group structure)
  if (ruleGroups !== undefined) {
    updateData.rule_groups = ruleGroups ? JSON.stringify(ruleGroups) : null;
  }
  
  const { data, error } = await supabase
    .from('strategies')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  if (!data) {
    return res.status(404).json({ error: 'Strategy not found' });
  }
  
  res.json(data);
}));

/**
 * DELETE /api/strategies/:id - Delete strategy
 */
app.delete('/api/strategies/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', id);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.status(204).send();
}));

// ============================================================================
// AVAILABLE ALERTS CRUD
// ============================================================================

/**
 * GET /api/available-alerts - Get all available alerts with weights
 */
app.get('/api/available-alerts', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('available_alerts')
    .select('*')
    .order('indicator', { ascending: true });
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

/**
 * PUT /api/available-alerts/:id - Update alert weight/enabled status
 */
app.put('/api/available-alerts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { weight, enabled } = req.body;
  
  const updateData = {};
  if (weight !== undefined) updateData.weight = parseFloat(weight);
  if (enabled !== undefined) updateData.enabled = enabled;
  
  const { data, error } = await supabase
    .from('available_alerts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

// ============================================================================
// INDICATORS MANAGEMENT API
// ============================================================================

/**
 * GET /api/indicators - Get all indicators
 */
app.get('/api/indicators', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('indicators')
    .select('*')
    .order('name');
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

/**
 * POST /api/indicators - Create new indicator
 */
app.post('/api/indicators', asyncHandler(async (req, res) => {
  const { name, display_name, description, category } = req.body;
  
  if (!name || !display_name) {
    return res.status(400).json({ 
      error: 'Missing required fields', 
      required: ['name', 'display_name'] 
    });
  }
  
  const { data, error } = await supabase
    .from('indicators')
    .insert({
      name: name.toLowerCase(),
      display_name,
      description,
      category: category || 'general',
      enabled: true
    })
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

/**
 * PUT /api/indicators/:id - Update indicator
 */
app.put('/api/indicators/:id', asyncHandler(async (req, res) => {
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
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

/**
 * DELETE /api/indicators/:id - Delete indicator
 */
app.delete('/api/indicators/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if indicator has associated alerts
  const { data: alerts, error: alertsError } = await supabase
    .from('available_alerts')
    .select('id')
    .eq('indicator_id', id);
  
  if (alertsError) {
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
    return res.status(500).json({ error: error.message });
  }
  
  res.json({ success: true });
}));

// ============================================================================
// ENHANCED ALERTS MANAGEMENT API
// ============================================================================

/**
 * POST /api/available-alerts - Create new alert (Admin Panel)
 */
app.post('/api/available-alerts', asyncHandler(async (req, res) => {
  const { indicator, trigger, weight, enabled, tooltip, indicator_id } = req.body;
  
  if (!indicator || !trigger) {
    return res.status(400).json({ 
      error: 'Missing required fields', 
      required: ['indicator', 'trigger'] 
    });
  }
  
  const { data, error } = await supabase
    .from('available_alerts')
    .insert({
      indicator,
      trigger,
      weight: parseFloat(weight) || 0,
      enabled: enabled !== undefined ? enabled : true,
      tooltip: tooltip || null,
      indicator_id: indicator_id || null
    })
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

/**
 * PUT /api/available-alerts/:id - Enhanced update for available alerts
 */
app.put('/api/available-alerts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { weight, enabled, tooltip, trigger, indicator, indicator_id } = req.body;
  
  const updateData = {};
  if (weight !== undefined) updateData.weight = parseFloat(weight);
  if (enabled !== undefined) updateData.enabled = enabled;
  if (tooltip !== undefined) updateData.tooltip = tooltip;
  if (trigger !== undefined) updateData.trigger = trigger;
  if (indicator !== undefined) updateData.indicator = indicator;
  if (indicator_id !== undefined) updateData.indicator_id = indicator_id;
  
  const { data, error } = await supabase
    .from('available_alerts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
}));

/**
 * DELETE /api/available-alerts/:id - Delete alert
 */
app.delete('/api/available-alerts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { error } = await supabase
    .from('available_alerts')
    .delete()
    .eq('id', id);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json({ success: true });
}));

// ============================================================================
// TELEGRAM NOTIFICATION ENDPOINTS
// ============================================================================

const telegramNotifier = require('./services/telegramNotifier');
const discordNotifier = require('./services/discordNotifier');

/**
 * POST /api/telegram/test - Test Telegram connection
 */
app.post('/api/telegram/test', asyncHandler(async (req, res) => {
  let { botToken, chatId } = req.body;
  
  // If credentials not provided, try to use saved ones
  if (!botToken || !chatId) {
    const savedConfig = await telegramNotifier.getTelegramConfig('default');
    botToken = botToken || savedConfig.botToken;
    chatId = chatId || savedConfig.chatId;
    
    if (!botToken || !chatId) {
      return res.status(400).json({ 
        error: 'Bot token and chat ID are required',
        message: 'Please enter your Telegram credentials'
      });
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
 * POST /api/telegram/test-alert - Send a test trading alert
 */
app.post('/api/telegram/test-alert', asyncHandler(async (req, res) => {
  const { action = 'BUY', botToken, chatId } = req.body;
  
  // Get saved Telegram config
  const telegramConfig = await telegramNotifier.getTelegramConfig('default');
  
  // Use provided credentials if available, otherwise use saved ones
  const finalBotToken = botToken || telegramConfig.botToken;
  const finalChatId = chatId || telegramConfig.chatId;
  
  if (!finalBotToken || !finalChatId) {
    return res.status(400).json({ 
      error: 'Telegram not configured', 
      message: 'Please save your Telegram settings first' 
    });
  }
  
  // Create realistic test data
  const testData = {
    action: action,
    ticker: action === 'BUY' ? 'BTC' : 'ETH',
    strategy: action === 'BUY' ? 'Buy on discount zone' : 'Sell on premium zone',
    triggers: action === 'BUY' 
      ? ['Discount Zone', 'Normal Bullish Divergence', 'Bullish OB Break'] 
      : ['Premium Zone', 'Normal Bearish Divergence', 'Bearish OB Break'],
    score: action === 'BUY' ? 4.2 : -4.3
  };
  
  // Send the test alert with the appropriate credentials
  const result = await telegramNotifier.sendNotification(testData, {
    ...telegramConfig,
    botToken: finalBotToken,
    chatId: finalChatId
  });
  
  if (result.success) {
    res.json({ 
      success: true, 
      message: `Test ${action} alert sent successfully!`,
      data: testData
    });
  } else {
    res.status(400).json({ 
      error: 'Failed to send test alert', 
      message: result.message 
    });
  }
}));

/**
 * POST /api/telegram/settings - Save Telegram settings
 */
app.post('/api/telegram/settings', asyncHandler(async (req, res) => {
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
 * GET /api/telegram/settings - Get current Telegram settings
 */
app.get('/api/telegram/settings', asyncHandler(async (req, res) => {
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

// ============================================================================
// DISCORD NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * POST /api/discord/test - Test Discord webhook connection
 */
app.post('/api/discord/test', asyncHandler(async (req, res) => {
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
app.post('/api/discord/test-alert', asyncHandler(async (req, res) => {
  const { action = 'BUY', webhookUrl } = req.body;
  
  // Get saved Discord config
  const discordConfig = await discordNotifier.getDiscordConfig('default');
  
  // Use webhook URL from request if provided, otherwise use saved one
  const finalWebhookUrl = webhookUrl || discordConfig.webhookUrl;
  
  if (!finalWebhookUrl) {
    return res.status(400).json({ 
      error: 'Discord not configured', 
      message: 'Please save your Discord webhook URL first' 
    });
  }
  
  // Create realistic test data (same as Telegram)
  const testData = {
    action: action,
    ticker: action === 'BUY' ? 'BTC' : 'ETH',
    strategy: action === 'BUY' ? 'Buy on discount zone' : 'Sell on premium zone',
    triggers: action === 'BUY' 
      ? ['Discount Zone', 'Normal Bullish Divergence', 'Bullish OB Break'] 
      : ['Premium Zone', 'Normal Bearish Divergence', 'Bearish OB Break'],
    score: action === 'BUY' ? 4.2 : -4.3
  };
  
  // Send test notification with the appropriate webhook URL
  const result = await discordNotifier.sendNotification(testData, {
    ...discordConfig,
    webhookUrl: finalWebhookUrl
  });
  
  if (result.success) {
    res.json({ 
      success: true, 
      message: `Test ${action} alert sent to Discord!` 
    });
  } else {
    res.status(400).json({ 
      error: 'Failed to send test alert', 
      message: result.message 
    });
  }
}));

/**
 * POST /api/discord/settings - Save Discord settings
 */
app.post('/api/discord/settings', asyncHandler(async (req, res) => {
  const { webhookUrl, messageTemplate } = req.body;
  
  if (!webhookUrl) {
    return res.status(400).json({ error: 'Webhook URL is required' });
  }
  
  // Save to database
  const result = await discordNotifier.saveDiscordConfig('default', {
    webhookUrl,
    messageTemplate
  });
  
  if (result.success) {
    res.json({ 
      success: true, 
      message: 'Discord settings saved successfully' 
    });
  } else {
    res.status(500).json({ 
      error: 'Failed to save settings', 
      message: result.error 
    });
  }
}));

/**
 * GET /api/discord/settings - Get current Discord settings
 */
app.get('/api/discord/settings', asyncHandler(async (req, res) => {
  const config = await discordNotifier.getDiscordConfig('default');
  
  // Check if actually configured (has a real webhook URL)
  const isConfigured = !!(config.webhookUrl && config.webhookUrl.length > 0);
  
  res.json({
    configured: isConfigured,
    webhookUrl: isConfigured ? '***' : null, // Don't return the actual URL for security
    messageTemplate: config.messageTemplate
  });
}));

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * GET /api/health - Health check (Backend Restore Fix)
 */
app.get('/api/health', (req, res) => {
  // Simple synchronous health check for Railway
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'stockagent-backend'
  });
});

/**
 * GET /api/stats - Get system statistics
 */
app.get('/api/stats', asyncHandler(async (req, res) => {
  try {
    // Get counts from each table
    const [alertsResult, strategiesResult, actionsResult] = await Promise.all([
      supabase.from('alerts').select('id', { count: 'exact', head: true }),
      supabase.from('strategies').select('id', { count: 'exact', head: true }),
      supabase.from('actions').select('id', { count: 'exact', head: true })
    ]);
    
    // Get recent activity (last 24 hours)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [recentAlertsResult, recentActionsResult] = await Promise.all([
      supabase.from('alerts').select('id', { count: 'exact', head: true }).gte('timestamp', dayAgo),
      supabase.from('actions').select('id', { count: 'exact', head: true }).gte('timestamp', dayAgo)
    ]);
    
    res.json({
      total: {
        alerts: alertsResult.count || 0,
        strategies: strategiesResult.count || 0,
        actions: actionsResult.count || 0
      },
      last24h: {
        alerts: recentAlertsResult.count || 0,
        actions: recentActionsResult.count || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting stats', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
}));

/**
 * POST /api/client-errors - Log frontend errors
 */
app.post('/api/client-errors', asyncHandler(async (req, res) => {
  const { message, stack, componentStack, timestamp, userAgent, url } = req.body;
  
  logger.error('Frontend error reported', {
    type: 'client-error',
    message,
    stack,
    componentStack,
    timestamp,
    userAgent,
    url,
    ip: req.ip
  });
  
  res.status(200).json({ 
    success: true, 
    message: 'Error logged successfully' 
  });
}));

/**
 * POST /api/client-metrics - Log frontend performance metrics
 */
app.post('/api/client-metrics', asyncHandler(async (req, res) => {
  const { name, value, unit, timestamp, userAgent, url } = req.body;
  
  logger.info('Frontend metric reported', {
    type: 'client-metric',
    name,
    value,
    unit,
    timestamp,
    userAgent,
    url,
    ip: req.ip
  });
  
  res.status(200).json({ 
    success: true, 
    message: 'Metric logged successfully' 
  });
}));

/**
 * POST /api/user-actions - Log user actions for analytics
 */
app.post('/api/user-actions', asyncHandler(async (req, res) => {
  const { type, target, details, timestamp, url } = req.body;
  
  logger.info('User action logged', {
    type: 'user-action',
    actionType: type,
    target,
    details,
    timestamp,
    url,
    ip: req.ip
  });
  
  res.status(200).json({ 
    success: true, 
    message: 'Action logged successfully' 
  });
}));

/**
 * GET /api/monitoring - Detailed monitoring endpoint
 */
app.get('/api/monitoring', asyncHandler(async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const startTime = Date.now();
    
    // Test database response time
    const dbTest = await supabase.from('alerts').select('id').limit(1);
    const dbResponseTime = Date.now() - startTime;
    
    // Get recent error rates (last hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const monitoring = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      system: {
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      database: {
        connected: !dbTest.error,
        responseTime: dbResponseTime,
        status: dbTest.error ? 'error' : 'healthy',
        error: dbTest.error?.message || null
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: PORT,
        logLevel: process.env.LOG_LEVEL || 'info'
      }
    };
    
    res.json(monitoring);
    
  } catch (error) {
    logger.error('Error getting monitoring data', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to get monitoring data',
      timestamp: new Date().toISOString()
    });
  }
}));

// ============================================================================
// TEST ENDPOINTS (Development only)
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  /**
   * POST /api/test/alerts - Create test alert data
   */
  app.post('/api/test/alerts', asyncHandler(async (req, res) => {
    const testAlerts = [
      { ticker: 'BTC', indicator: 'Nautilus™', trigger: 'Normal Bullish Divergence' },
      { ticker: 'BTC', indicator: 'Extreme Zones', trigger: 'Discount Zone' },
      { ticker: 'ETH', indicator: 'Market Waves Pro™', trigger: 'Buy+' },
      { ticker: 'SOL', indicator: 'Market Core Pro™', trigger: 'Bullish BoS' }
    ];
    
    const { data, error } = await supabase
      .from('alerts')
      .insert(testAlerts)
      .select();
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ message: 'Test alerts created', alerts: data });
  }));
}

// ============================================================================
// WEBHOOK TESTING INTERFACE
// ============================================================================

/**
 * GET /monitoring - System monitoring dashboard
 */
app.get('/monitoring', (req, res) => {
  res.sendFile(__dirname + '/public/monitoring.html');
});

/**
 * GET /test-webhook - Dynamic HTML form synced with Available Alerts database
 */
app.get('/test-webhook', asyncHandler(async (req, res) => {
  try {
    // Fetch available alerts from database
    const { data: availableAlerts, error } = await supabase
      .from('available_alerts')
      .select('*')
      .eq('enabled', true)
      .order('indicator', { ascending: true });

    if (error) {
      logger.error('Failed to fetch available alerts for test webhook', { error: error.message });
      // Fallback to basic form if database fails
      return res.status(500).send('<h1>Database Error</h1><p>Could not load available alerts.</p>');
    }

    // Group alerts by indicator
    const alertsByIndicator = {};
    availableAlerts.forEach(alert => {
      if (!alertsByIndicator[alert.indicator]) {
        alertsByIndicator[alert.indicator] = [];
      }
      alertsByIndicator[alert.indicator].push(alert.trigger);
    });

    // Get unique indicators for dropdown
    const indicators = Object.keys(alertsByIndicator);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StockAgent Webhook Tester</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #0f0f23;
            color: #E0E6ED;
        }
        .container {
            background: #1e2538;
            padding: 30px;
            border-radius: 12px;
            border: 1px solid #2d3748;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        h1 {
            color: #4ade80;
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5rem;
        }
        .subtitle {
            text-align: center;
            color: #A3A9B8;
            margin-bottom: 30px;
            font-style: italic;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #E0E6ED;
            font-weight: 500;
        }
        select, input {
            width: 100%;
            padding: 12px;
            border: 1px solid #4a5568;
            border-radius: 8px;
            background: #2d3748;
            color: #E0E6ED;
            font-size: 14px;
            box-sizing: border-box;
        }
        select:focus, input:focus {
            outline: none;
            border-color: #4ade80;
            box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.1);
        }
        button {
            width: 100%;
            padding: 15px;
            background: #4ade80;
            color: #0f0f23;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        button:hover {
            background: #22c55e;
            transform: translateY(-1px);
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            display: none;
        }
        .success {
            background: rgba(74, 222, 128, 0.1);
            border: 1px solid #4ade80;
            color: #4ade80;
        }
        .error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            color: #ef4444;
        }
        .info {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid #3b82f6;
            color: #3b82f6;
            margin-bottom: 25px;
            border-radius: 8px;
            padding: 15px;
        }
        .sync-indicator {
            background: rgba(74, 222, 128, 0.1);
            border: 1px solid #4ade80;
            color: #4ade80;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 20px;
            text-align: center;
            font-size: 0.9rem;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 StockAgent Webhook Tester</h1>
        <p class="subtitle">Turn Every Alert into Automated Success</p>
        
        <div class="sync-indicator">
            ✅ Synced with Available Alerts Database (${availableAlerts.length} active alerts)
        </div>
        
        <div class="info">
            <strong>ℹ️ Test your webhook integration:</strong><br>
            • Select from ${indicators.length} available indicators<br>
            • Choose appropriate timeframe and trigger<br>
            • Click "Send Alert" to test webhook<br>
            • Verify alert appears in dashboard and database<br>
            ${process.env.WEBHOOK_SECRET ? '<br><strong>🔐 Webhook authentication is enabled</strong>' : '<br><strong>⚠️ Warning: WEBHOOK_SECRET not configured - webhooks are unprotected!</strong>'}
        </div>

        <form id="webhookForm">
            <div class="form-row">
                <div class="form-group">
                    <label for="ticker">Ticker Symbol:</label>
                    <input type="text" id="ticker" name="ticker" value="BTC" required>
                </div>
                
                <div class="form-group">
                    <label for="timeframe">Timeframe:</label>
                    <select id="timeframe" name="timeframe" required>
                        <option value="1m">1 Minute</option>
                        <option value="5m">5 Minutes</option>
                        <option value="15m" selected>15 Minutes</option>
                        <option value="30m">30 Minutes</option>
                        <option value="1h">1 Hour</option>
                        <option value="4h">4 Hours</option>
                        <option value="1d">1 Day</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label for="indicator">Indicator:</label>
                <select id="indicator" name="indicator" required>
                    ${indicators.map(indicator => 
                        `<option value="${indicator}">${indicator}</option>`
                    ).join('')}
                </select>
            </div>

            <div class="form-group">
                <label for="triggerMode">Trigger/Signal Source:</label>
                <select id="triggerMode" name="triggerMode" required>
                    <option value="database">From Database (Available Alerts)</option>
                    <option value="custom">Custom Alert (Enter Manually)</option>
                </select>
            </div>

            <div class="form-group" id="databaseTriggerGroup">
                <label for="trigger">Available Triggers:</label>
                <select id="trigger" name="trigger">
                    ${alertsByIndicator[indicators[0]] ? 
                        alertsByIndicator[indicators[0]].map(trigger => 
                            `<option value="${trigger}">${trigger}</option>`
                        ).join('') : 
                        '<option value="Test Signal">Test Signal</option>'
                    }
                </select>
            </div>

            <div class="form-group" id="customTriggerGroup" style="display: none;">
                <label for="customTrigger">Custom Trigger/Signal:</label>
                <input type="text" id="customTrigger" name="customTrigger" placeholder="Enter custom alert trigger (e.g., Premium Zone Reversed)">
                <small style="color: #A3A9B8; font-size: 0.85rem; margin-top: 5px; display: block;">
                    💡 Use this to test new alerts not yet in the database
                </small>
            </div>

            <button type="submit">🚀 Send Alert to Webhook</button>
        </form>

        <div id="result" class="result"></div>
    </div>

    <script>
        // Dynamic alert data from database
        const alertsByIndicator = ${JSON.stringify(alertsByIndicator)};
        
        document.getElementById('webhookForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const triggerMode = formData.get('triggerMode');
            const finalTrigger = triggerMode === 'custom' ? 
                formData.get('customTrigger') : 
                formData.get('trigger');
            
            if (!finalTrigger || finalTrigger.trim() === '') {
                alert('Please enter a trigger/signal');
                return;
            }
            
            const data = {
                ticker: formData.get('ticker').toUpperCase(),
                timeframe: formData.get('timeframe'),
                indicator: formData.get('indicator'),
                trigger: finalTrigger.trim(),
                time: new Date().toISOString()
            };

            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.className = 'result';
            resultDiv.innerHTML = '⏳ Sending webhook...';

            try {
                // Format as text: TICKER|TIMEFRAME|INDICATOR|TRIGGER
                const textPayload = data.ticker + '|' + data.timeframe + '|' + data.indicator + '|' + data.trigger;
                // Check if webhook secret is configured
                const webhookSecret = '${process.env.WEBHOOK_SECRET || ''}';
                const webhookUrl = webhookSecret ? '/webhook?secret=' + webhookSecret : '/webhook';
                
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                    body: textPayload
                });

                const result = await response.json();

                if (response.ok) {
                    resultDiv.className = 'result success';
                    resultDiv.innerHTML = '<strong>✅ Webhook sent successfully!</strong><br>' +
                        '<strong>Alert ID:</strong> ' + result.alert.id + '<br>' +
                        '<strong>Ticker:</strong> ' + result.alert.ticker + '<br>' +
                        '<strong>Timeframe:</strong> ' + result.alert.timeframe + '<br>' +
                        '<strong>Signal:</strong> ' + result.alert.indicator + ' - ' + result.alert.trigger + '<br>' +
                        '<br>ℹ️ Check your frontend dashboard and Supabase database!';
                } else {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = '<strong>❌ Error:</strong> ' + (result.error || 'Unknown error') + '<br>' +
                        '<strong>Details:</strong> ' + (result.message || 'No details available');
                }
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = '<strong>❌ Network Error:</strong><br>' + error.message;
            }
        });

        // Handle trigger mode switching
        document.getElementById('triggerMode').addEventListener('change', function() {
            const databaseGroup = document.getElementById('databaseTriggerGroup');
            const customGroup = document.getElementById('customTriggerGroup');
            const triggerSelect = document.getElementById('trigger');
            const customInput = document.getElementById('customTrigger');
            
            if (this.value === 'custom') {
                databaseGroup.style.display = 'none';
                customGroup.style.display = 'block';
                triggerSelect.removeAttribute('required');
                customInput.setAttribute('required', 'required');
            } else {
                databaseGroup.style.display = 'block';
                customGroup.style.display = 'none';
                triggerSelect.setAttribute('required', 'required');
                customInput.removeAttribute('required');
            }
        });

        // Auto-update trigger options based on indicator selection
        document.getElementById('indicator').addEventListener('change', function() {
            const trigger = document.getElementById('trigger');
            const indicator = this.value;
            
            // Clear current options
            trigger.innerHTML = '';
            
            const options = alertsByIndicator[indicator] || ['Test Signal'];
            
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                trigger.appendChild(option);
            });
        });
    </script>
</body>
</html>`;

    res.send(html);
    
  } catch (error) {
    logger.error('Test webhook page error', { error: error.message });
    res.status(500).send('<h1>Server Error</h1><p>Could not load test webhook page.</p>');
  }
}));

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use((error, req, res, next) => {
  // Error already logged by errorLogger middleware
  
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Start server immediately for health checks
    app.listen(PORT, () => {
      console.log('StockAgent Backend started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        healthCheck: `http://localhost:${PORT}/api/health`,
        webhookUrl: `http://localhost:${PORT}/webhook`,
        timestamp: new Date().toISOString()
      });
      
      // Test database connection after server starts
      if (testConnection) {
        console.log('Testing database connection...');
        testConnection().then(dbConnected => {
          if (!dbConnected) {
            console.error('Failed to connect to database. Server running in degraded mode.');
            // Don't exit - let the server run without database
          } else {
            console.log('Database connection established successfully');
          }
        }).catch(err => {
          console.error('Error testing database connection:', err.message);
        });
      } else {
        console.log('Database module not loaded - running without database');
      }
    });
    
  } catch (error) {
    console.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
});

// Start the server
startServer();