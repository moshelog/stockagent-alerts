const winston = require('winston');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'stockagent-backend' },
  transports: [
    // Write all logs to console (Railway will capture these)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Production logging to file (if running locally)
if (process.env.NODE_ENV === 'production' && process.env.LOG_TO_FILE === 'true') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log' 
  }));
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: data ? data.length : 0,
      timestamp: new Date().toISOString()
    });

    // Log errors for 4xx/5xx responses
    if (res.statusCode >= 400) {
      logger.warn('Request error', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        response: data ? JSON.parse(data) : null,
        timestamp: new Date().toISOString()
      });
    }

    originalSend.call(this, data);
  };

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  next(err);
};

// System metrics logging
const logSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  logger.info('System metrics', {
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    },
    uptime: `${Math.round(process.uptime())}s`,
    timestamp: new Date().toISOString()
  });
};

// Log system metrics every 5 minutes
setInterval(logSystemMetrics, 5 * 60 * 1000);

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  logSystemMetrics
};