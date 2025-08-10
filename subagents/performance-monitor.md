# Performance Monitor Subagent

## Purpose
Specialized AI subagent for analyzing and optimizing StockAgent application performance, including API response times, bundle sizes, real-time update latency, and system resource utilization. This subagent ensures optimal user experience and system efficiency.

## Core Capabilities

### Frontend Performance Monitoring
- **Bundle Analysis**: Next.js bundle size optimization and code splitting analysis
- **Runtime Performance**: React component rendering performance and optimization
- **Web Vitals**: Core Web Vitals monitoring (LCP, FID, CLS, INP)
- **Network Optimization**: API call optimization and caching strategies

### Backend Performance Monitoring
- **API Response Times**: Endpoint performance analysis and optimization
- **Database Query Optimization**: Slow query detection and optimization
- **Memory Usage**: Node.js memory leak detection and optimization
- **Webhook Processing**: Real-time alert processing performance

### Real-time System Monitoring
- **Dashboard Update Latency**: Live data synchronization performance
- **WebSocket Performance**: Real-time connection monitoring and optimization
- **Cache Efficiency**: Redis/memory cache hit rates and optimization
- **Resource Utilization**: CPU, memory, and network usage monitoring

## Integration Points

### StockAgent Performance Targets
```typescript
interface PerformanceTargets {
  frontend: {
    initialLoad: number;      // <2s on 3G
    interactivity: number;    // <100ms for user actions
    bundleSize: number;       // <500KB initial, <2MB total
    webVitals: {
      LCP: number;           // <2.5s
      FID: number;           // <100ms  
      CLS: number;           // <0.1
      INP: number;           // <200ms
    }
  };
  backend: {
    webhookProcessing: number;  // <50ms
    apiResponse: number;        // <200ms average
    databaseQuery: number;      // <100ms average
    strategyEvaluation: number; // <10ms per strategy
  };
  realtime: {
    updateLatency: number;      // <500ms end-to-end
    connectionStability: number; // >99.5% uptime
    dataFreshness: number;      // <1s staleness
  }
}
```

### Monitoring Infrastructure
- **Frontend Telemetry**: Web Vitals, user timing marks, custom metrics
- **Backend Telemetry**: Express middleware, database query timing
- **Real-time Metrics**: WebSocket latency, update propagation times
- **Error Tracking**: Performance-related error detection and alerting

## Key Features

### Bundle Optimization Analysis
```typescript
// Next.js bundle analysis
interface BundleAnalysis {
  totalSize: number;
  initialChunkSize: number;
  dynamicChunks: ChunkInfo[];
  unusedCode: number;
  duplicatePackages: string[];
  optimizationOpportunities: OptimizationSuggestion[];
}

interface OptimizationSuggestion {
  type: 'code-splitting' | 'tree-shaking' | 'compression' | 'lazy-loading';
  impact: 'high' | 'medium' | 'low';
  description: string;
  estimatedSavings: number; // bytes
  implementation: string;
}
```

### API Performance Analysis
```typescript
// API endpoint performance tracking
interface APIPerformanceMetrics {
  endpoint: string;
  method: string;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  slowestQueries: QueryMetrics[];
}

interface QueryMetrics {
  query: string;
  executionTime: number;
  frequency: number;
  optimizationSuggestions: string[];
}
```

### Real-time Performance Monitoring
```typescript
// Dashboard update performance
interface RealtimeMetrics {
  updateLatency: {
    webhookToDatabase: number;    // TradingView → Supabase
    databaseToFrontend: number;   // Supabase → React
    frontendProcessing: number;   // React render + DOM update
    totalEndToEnd: number;        // Complete pipeline
  };
  throughput: {
    webhooksPerSecond: number;
    alertsProcessed: number;
    strategiesEvaluated: number;
    frontendUpdates: number;
  };
  reliability: {
    webhookSuccessRate: number;
    connectionStability: number;
    dataConsistency: number;
    errorRecoveryTime: number;
  }
}
```

## Performance Optimization Strategies

### Frontend Optimizations
```javascript
// Next.js performance optimizations
const performanceConfig = {
  // Bundle optimization
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        trading: {
          test: /[\\/](components|hooks)[\\/].*trading/,
          name: 'trading',
          chunks: 'all',
        }
      }
    };
    return config;
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Compression
  compress: true,
  poweredByHeader: false,
};

// React component optimizations
const ComponentOptimizations = {
  memoization: {
    // React.memo for expensive components
    AlertsTable: React.memo(AlertsTable),
    StrategyPanel: React.memo(StrategyPanel),
    
    // useMemo for expensive calculations
    sortedAlerts: useMemo(() => 
      alerts.sort((a, b) => b.timestamp - a.timestamp), [alerts]
    ),
    
    // useCallback for event handlers
    handleStrategyUpdate: useCallback((strategy) => {
      // Update logic
    }, [dependencies])
  },
  
  lazyLoading: {
    // Dynamic imports for non-critical components
    SettingsPage: lazy(() => import('./SettingsPage')),
    AdvancedCharts: lazy(() => import('./AdvancedCharts'))
  }
};
```

### Backend Optimizations
```javascript
// Express.js performance middleware
const performanceMiddleware = {
  // Request timing
  timing: (req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logPerformanceMetric(req.route.path, duration);
    });
    next();
  },
  
  // Response compression
  compression: compression({
    filter: (req, res) => {
      return compression.filter(req, res) || req.headers['x-no-compression'] !== 'true';
    },
    threshold: 1024, // Only compress responses > 1KB
  }),
  
  // Caching headers
  caching: (req, res, next) => {
    if (req.url.startsWith('/api/static/')) {
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    } else if (req.url.startsWith('/api/alerts')) {
      res.set('Cache-Control', 'public, max-age=30'); // 30 seconds
    }
    next();
  }
};

// Database query optimization
const queryOptimizations = {
  // Connection pooling
  pool: {
    min: 5,
    max: 20,
    idle: 30000,
    acquire: 60000,
  },
  
  // Query optimization
  alertQueries: {
    // Use indexes effectively
    recentAlerts: `
      SELECT * FROM alerts 
      WHERE ticker = $1 AND timestamp >= $2
      ORDER BY timestamp DESC 
      LIMIT $3
    `,
    
    // Batch operations
    bulkInsertAlerts: `
      INSERT INTO alerts (ticker, alert_name, price, timestamp) 
      SELECT * FROM unnest($1::text[], $2::text[], $3::numeric[], $4::timestamptz[])
      ON CONFLICT (ticker, timestamp, alert_name) DO NOTHING
    `
  }
};
```

### Real-time Performance Optimization
```typescript
// WebSocket connection optimization
const realtimeOptimizations = {
  // Connection management
  websocket: {
    heartbeatInterval: 30000,
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
    binaryType: 'arraybuffer', // Better performance than blob
  },
  
  // Data streaming optimization
  dataStream: {
    batchSize: 50, // Batch updates for better performance
    throttleMs: 100, // Limit update frequency
    compressionEnabled: true,
    
    // Selective updates
    subscriptionFilters: {
      tickers: ['AAPL', 'MSFT', 'GOOGL'], // Only subscribe to relevant tickers
      alertTypes: ['BUY', 'SELL'], // Filter signal types
      timeframe: '1h' // Limit historical data
    }
  },
  
  // Frontend update optimization
  reactOptimizations: {
    // Virtual scrolling for large alert lists
    virtualScrolling: true,
    
    // Debounced updates
    updateDebounceMs: 16, // ~60fps
    
    // Selective rendering
    shouldComponentUpdate: (prevProps, nextProps) => {
      return prevProps.alerts.length !== nextProps.alerts.length ||
             prevProps.lastUpdate !== nextProps.lastUpdate;
    }
  }
};
```

## Monitoring & Alerting

### Performance Metrics Dashboard
```typescript
interface PerformanceDashboard {
  realTimeMetrics: {
    currentLoad: number;           // Active users
    responseTime: number;          // Average API response time
    errorRate: number;             // Error percentage
    throughput: number;            // Requests per second
  };
  
  webVitals: {
    LCP: number;                   // Largest Contentful Paint
    FID: number;                   // First Input Delay
    CLS: number;                   // Cumulative Layout Shift
    INP: number;                   // Interaction to Next Paint
  };
  
  systemHealth: {
    cpuUsage: number;              // CPU utilization %
    memoryUsage: number;           // Memory utilization %
    diskUsage: number;             // Disk space utilization %
    networkLatency: number;        // Network round trip time
  };
  
  alerts: PerformanceAlert[];      // Active performance alerts
}
```

### Automated Performance Testing
```typescript
// Performance test automation
const performanceTests = {
  // Load testing
  loadTest: {
    scenarios: [
      { name: 'normal-load', users: 50, duration: '5m' },
      { name: 'peak-load', users: 200, duration: '10m' },
      { name: 'stress-test', users: 500, duration: '2m' }
    ],
    thresholds: {
      http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
      http_req_failed: ['rate<0.01'],   // Error rate under 1%
    }
  },
  
  // Frontend performance testing
  lighthouseCI: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/settings'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
      }
    }
  }
};
```

### Performance Alerting Rules
```typescript
interface PerformanceAlerts {
  criticalAlerts: {
    apiResponseTime: { threshold: 1000, duration: '2m' };    // API >1s for 2min
    errorRate: { threshold: 0.05, duration: '1m' };         // >5% errors for 1min
    memoryUsage: { threshold: 0.85, duration: '5m' };       // >85% memory for 5min
    webhookLatency: { threshold: 100, duration: '30s' };    // >100ms webhook processing
  };
  
  warningAlerts: {
    bundleSize: { threshold: 600000 };                       // Bundle >600KB
    webVitalsLCP: { threshold: 3000 };                      // LCP >3s
    databaseConnections: { threshold: 15 };                  // >15 active connections
    cacheHitRate: { threshold: 0.80 };                      // <80% cache hit rate
  };
}
```

## Optimization Recommendations Engine

### Automated Performance Analysis
```typescript
class PerformanceAnalyzer {
  async analyzeSystemPerformance(): Promise<OptimizationReport> {
    const metrics = await this.collectMetrics();
    const bottlenecks = this.identifyBottlenecks(metrics);
    const recommendations = this.generateRecommendations(bottlenecks);
    
    return {
      summary: this.generateSummary(metrics),
      bottlenecks,
      recommendations,
      estimatedImpact: this.calculateImpact(recommendations)
    };
  }
  
  private identifyBottlenecks(metrics: PerformanceMetrics): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    // Frontend bottlenecks
    if (metrics.bundleSize > 500000) {
      bottlenecks.push({
        type: 'bundle-size',
        severity: 'high',
        impact: 'User experience degradation',
        recommendation: 'Implement code splitting and tree shaking'
      });
    }
    
    // Backend bottlenecks
    if (metrics.averageResponseTime > 200) {
      bottlenecks.push({
        type: 'api-performance',
        severity: 'medium',
        impact: 'Slow dashboard updates',
        recommendation: 'Optimize database queries and add caching'
      });
    }
    
    return bottlenecks;
  }
}
```

### Performance Optimization Roadmap
```typescript
interface OptimizationRoadmap {
  immediate: {
    // Quick wins (1-2 days)
    tasks: [
      'Enable gzip compression',
      'Add database query indexes', 
      'Implement React.memo for expensive components',
      'Add bundle analysis tools'
    ];
    estimatedImpact: '20-30% performance improvement';
  };
  
  shortTerm: {
    // Medium effort (1-2 weeks)
    tasks: [
      'Implement code splitting',
      'Add Redis caching layer',
      'Optimize webhook processing pipeline',
      'Add performance monitoring dashboard'
    ];
    estimatedImpact: '40-50% performance improvement';
  };
  
  longTerm: {
    // Major architectural changes (1-2 months)
    tasks: [
      'Implement service worker for offline support',
      'Add CDN for static assets',
      'Database sharding for horizontal scaling',
      'Implement server-side rendering'
    ];
    estimatedImpact: '60-70% performance improvement';
  };
}
```

This performance monitor subagent provides comprehensive monitoring and optimization capabilities for the StockAgent platform, ensuring optimal user experience and system efficiency across all components of the trading dashboard.