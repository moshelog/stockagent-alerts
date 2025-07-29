# 📊 StockAgent Monitoring & Error Tracking

Comprehensive monitoring system for StockAgent production environment.

## 🔍 Monitoring Dashboard

**URL**: `https://stockagent-backend-production.up.railway.app/monitoring`

### Features
- **Real-time System Health** - CPU, memory, uptime monitoring
- **Database Status** - Connection health and response times  
- **Data Metrics** - Alert, strategy, and action counts
- **Auto-refresh** - Updates every 30 seconds
- **Error Handling** - Displays connection issues clearly

### Key Metrics Tracked
- System uptime and environment info
- Memory usage (RSS, heap usage %)
- Database connectivity and response time
- Total alerts, strategies, and actions in system

## 🛠️ API Endpoints

### Health Check
- **GET** `/api/health` - Basic system health with counts
- **GET** `/api/monitoring` - Detailed system metrics
- **GET** `/api/stats` - Historical statistics

### Error Reporting
- **POST** `/api/client-errors` - Frontend error logging
- **POST** `/api/client-metrics` - Performance metrics
- **POST** `/api/user-actions` - User behavior analytics

## 📝 Logging System

### Winston Logger Features
- **Structured JSON logging** for easy parsing
- **Request/response logging** with timing
- **Error tracking** with stack traces
- **System metrics** logged every 5 minutes
- **Production-ready** with console output for Railway

### Log Categories
- `info` - Normal operations, requests, system metrics
- `warn` - Non-critical issues, 4xx responses
- `error` - Critical errors, exceptions, database failures

### Sample Log Entry
```json
{
  "level": "info",
  "message": "Request completed",
  "method": "POST",
  "url": "/api/strategies",
  "statusCode": 201,
  "duration": "45ms",
  "timestamp": "2025-07-28T11:20:00.000Z"
}
```

## 🚨 Error Handling

### Frontend Error Boundary
- **React Error Boundary** catches unhandled errors
- **User-friendly fallback UI** with retry options
- **Automatic error reporting** to backend
- **Development details** shown in dev mode only

### Backend Error Handling
- **Structured error logging** with context
- **Graceful degradation** for API failures
- **Database error recovery** with retry logic
- **Uncaught exception handling** prevents crashes

## 🔧 Monitoring Integration

### Frontend Hook: `useMonitoring`
```typescript
const { health, logPerformanceMetric, logUserAction } = useMonitoring()

// Log performance metrics
logPerformanceMetric({
  name: 'page_load_time',
  value: 1250,
  unit: 'ms'
})

// Track user actions
logUserAction({
  type: 'strategy_created',
  target: 'manual_strategy',
  details: { groupCount: 2 }
})
```

### Health Check Response
```json
{
  "status": "healthy",
  "uptime": 3600,
  "database": {
    "connected": true,
    "status": "operational"
  },
  "system": {
    "memory": { "rss": 70, "heapUsed": 15, "unit": "MB" },
    "nodeVersion": "v18.20.5",
    "environment": "production"
  },
  "data": {
    "alerts": 15,
    "actions": 0,
    "strategies": 2
  }
}
```

## 🎯 Production Benefits

### Proactive Monitoring
- **Early warning system** for performance issues
- **Database health tracking** prevents outages
- **Memory leak detection** through heap monitoring
- **Response time tracking** for performance optimization

### Debugging Support
- **Detailed error logging** with full context
- **Request tracing** for issue reproduction
- **Performance metrics** for bottleneck identification
- **User behavior tracking** for UX improvements

### System Reliability
- **Graceful error handling** prevents crashes
- **Health check endpoints** for load balancer integration
- **Structured logging** for log analysis tools
- **Recovery mechanisms** for transient failures

## 🚀 Next Steps (Optional)

1. **External Monitoring** - Integrate with services like DataDog or New Relic
2. **Alerting** - Email/Slack notifications for critical errors
3. **Log Analysis** - ELK stack or similar for log analysis
4. **Performance Tracking** - APM tools for detailed performance insights
5. **Uptime Monitoring** - External services like Pingdom or UptimeRobot

---

## 📞 Quick Access

- **Main Dashboard**: https://amused-growth-production.up.railway.app/
- **Monitoring Dashboard**: https://stockagent-backend-production.up.railway.app/monitoring
- **Health Check**: https://stockagent-backend-production.up.railway.app/api/health
- **Webhook Tester**: https://stockagent-backend-production.up.railway.app/test-webhook

The monitoring system is now live and actively tracking your StockAgent deployment! 🎉