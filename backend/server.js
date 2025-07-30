const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { supabase, testConnection } = require('./config/database');
const strategyEvaluator = require('./services/strategyEvaluator');
const { logger, requestLogger, errorLogger } = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(cors());
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
// WEBHOOK ENDPOINTS
// ============================================================================

/**
 * POST /webhook-json - Receive TradingView alerts (JSON format)
 * Expected payload: { ticker, time?, indicator, trigger }
 */
app.post('/webhook-json', validateAlertPayload, asyncHandler(async (req, res) => {
  const { ticker, time, indicator, trigger } = req.body;
  
  logger.info('Webhook received', {
    ticker,
    indicator,
    trigger,
    timestamp: time || new Date().toISOString()
  });
  
  try {
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
 * Expected payload: "TICKER|TIMEFRAME|INDICATOR|TRIGGER" or "TICKER|TIMEFRAME|INDICATOR|TRIGGER|TIME"
 */
app.post('/webhook', express.text({ type: '*/*' }), asyncHandler(async (req, res) => {
  const body = req.body.toString().trim();
  
  logger.info('Webhook received', {
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

  logger.info('Webhook parsed', {
    ticker,
    timeframe,
    indicator,
    trigger,
    timestamp: time || new Date().toISOString()
  });

  try {
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
      ticker: newAlert.ticker
    });

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
app.post('/webhook-text', express.text({ type: '*/*' }), asyncHandler(async (req, res) => {
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
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/alerts - Get recent alerts
 */
app.get('/api/alerts', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200); // Max 200 alerts
  
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error) {
    return res.status(500).json({ error: error.message });
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
// UTILITY ENDPOINTS
// ============================================================================

/**
 * GET /api/health - Health check
 */
app.get('/api/health', asyncHandler(async (req, res) => {
  const dbConnected = await testConnection();
  const memUsage = process.memoryUsage();
  
  // Get recent activity counts
  let recentActivity = { alerts: 0, actions: 0, strategies: 0 };
  try {
    const [alertsResult, actionsResult, strategiesResult] = await Promise.all([
      supabase.from('alerts').select('id', { count: 'exact', head: true }),
      supabase.from('actions').select('id', { count: 'exact', head: true }),
      supabase.from('strategies').select('id', { count: 'exact', head: true })
    ]);
    
    recentActivity = {
      alerts: alertsResult.count || 0,
      actions: actionsResult.count || 0,
      strategies: strategiesResult.count || 0
    };
  } catch (err) {
    // Don't fail health check if counts fail
    logger.warn('Failed to get activity counts for health check', { error: err.message });
  }
  
  const healthData = {
    status: dbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    database: {
      connected: dbConnected,
      status: dbConnected ? 'operational' : 'disconnected'
    },
    system: {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        unit: 'MB'
      },
      uptime: `${Math.round(process.uptime())}s`,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    },
    data: recentActivity,
    version: '1.0.0'
  };
  
  // Return 503 if database is down
  const statusCode = dbConnected ? 200 : 503;
  res.status(statusCode).json(healthData);
}));

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
            • Verify alert appears in dashboard and database
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
                <label for="trigger">Trigger/Signal:</label>
                <select id="trigger" name="trigger" required>
                    ${alertsByIndicator[indicators[0]] ? 
                        alertsByIndicator[indicators[0]].map(trigger => 
                            `<option value="${trigger}">${trigger}</option>`
                        ).join('') : 
                        '<option value="Test Signal">Test Signal</option>'
                    }
                </select>
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
            const data = {
                ticker: formData.get('ticker').toUpperCase(),
                timeframe: formData.get('timeframe'),
                indicator: formData.get('indicator'),
                trigger: formData.get('trigger'),
                time: new Date().toISOString()
            };

            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.className = 'result';
            resultDiv.innerHTML = '⏳ Sending webhook...';

            try {
                // Format as text: TICKER|TIMEFRAME|INDICATOR|TRIGGER
                const textPayload = data.ticker + '|' + data.timeframe + '|' + data.indicator + '|' + data.trigger;
                const response = await fetch('/webhook', {
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
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    // Start server
    app.listen(PORT, () => {
      logger.info('StockAgent Backend started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        healthCheck: `http://localhost:${PORT}/api/health`,
        webhookUrl: `http://localhost:${PORT}/webhook`,
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
});

// Start the server
startServer();