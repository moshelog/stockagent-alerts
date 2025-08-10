# Alert System Debugger Subagent

## Purpose
Specialized AI subagent for debugging webhook integration issues, tracing alert flow, and troubleshooting the alert pipeline in the StockAgent platform. This subagent focuses on ensuring reliable webhook processing and data flow from TradingView to the dashboard.

## Core Capabilities

### Webhook Integration Debugging
- **Connection Testing**: Verify TradingView webhook endpoints and connectivity
- **Payload Validation**: Debug malformed or missing webhook payloads
- **Authentication Issues**: Troubleshoot webhook authentication and security
- **Rate Limiting**: Identify and resolve webhook rate limiting issues

### Alert Flow Tracing
- **End-to-End Tracking**: Trace alerts from TradingView through database to frontend
- **Bottleneck Identification**: Identify processing delays in the alert pipeline
- **Data Transformation**: Debug alert data transformation and mapping
- **State Synchronization**: Ensure consistency across system components

### Pipeline Troubleshooting
- **Processing Failures**: Debug failed alert processing and strategy evaluation
- **Database Issues**: Troubleshoot database connection and query problems  
- **Real-time Updates**: Debug WebSocket and real-time synchronization issues
- **Cache Problems**: Identify and resolve caching inconsistencies

## Integration Points

### StockAgent Alert Pipeline
```typescript
// Alert flow monitoring points
interface AlertFlowTrace {
  webhookReceived: {
    timestamp: string;
    payload: any;
    headers: Record<string, string>;
    sourceIP: string;
  };
  
  validation: {
    timestamp: string;
    isValid: boolean;
    errors: ValidationError[];
    sanitizedPayload?: any;
  };
  
  databaseWrite: {
    timestamp: string;
    success: boolean;
    insertId?: number;
    error?: string;
    executionTime: number;
  };
  
  strategyEvaluation: {
    timestamp: string;
    strategiesTriggered: string[];
    evaluationTime: number;
    results: StrategyResult[];
  };
  
  frontendUpdate: {
    timestamp: string;
    updateSent: boolean;
    clientsNotified: number;
    propagationTime: number;
  };
}
```

### Monitoring Infrastructure
- **Webhook Endpoint**: `/webhook` monitoring and debugging
- **Database Layer**: Supabase query monitoring and error tracking
- **Real-time Layer**: WebSocket connection health and message delivery
- **Frontend Layer**: Component update tracking and error detection

## Key Features

### Webhook Debugging Tools
```typescript
// Webhook debugging utilities
class WebhookDebugger {
  async testWebhookConnectivity(webhookUrl: string): Promise<ConnectivityTest> {
    const testPayload = this.generateTestPayload();
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TradingView-Webhook'
        },
        body: JSON.stringify(testPayload),
        timeout: 10000
      });
      
      return {
        success: response.ok,
        status: response.status,
        responseTime: performance.now(),
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        type: this.categorizeError(error)
      };
    }
  }
  
  analyzeWebhookPayload(payload: any): PayloadAnalysis {
    const analysis: PayloadAnalysis = {
      isValid: true,
      issues: [],
      recommendations: []
    };
    
    // Required fields validation
    const requiredFields = ['ticker', 'alert_name', 'timestamp'];
    for (const field of requiredFields) {
      if (!payload[field]) {
        analysis.issues.push({
          type: 'missing_field',
          field,
          severity: 'critical',
          message: `Required field '${field}' is missing`
        });
        analysis.isValid = false;
      }
    }
    
    // Data type validation
    if (payload.price && typeof payload.price !== 'number') {
      analysis.issues.push({
        type: 'invalid_type',
        field: 'price',
        severity: 'error',
        message: 'Price must be a number',
        currentValue: payload.price,
        expectedType: 'number'
      });
    }
    
    // Timestamp validation
    if (payload.timestamp) {
      const timestamp = new Date(payload.timestamp);
      if (isNaN(timestamp.getTime())) {
        analysis.issues.push({
          type: 'invalid_format',
          field: 'timestamp',
          severity: 'error',
          message: 'Invalid timestamp format',
          recommendation: 'Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)'
        });
      }
    }
    
    return analysis;
  }
}
```

### Alert Flow Monitoring
```typescript
// Real-time alert flow monitoring
class AlertFlowMonitor {
  private flowTraces = new Map<string, AlertFlowTrace>();
  
  async traceAlert(alertId: string): Promise<AlertFlowTrace | null> {
    return this.flowTraces.get(alertId) || null;
  }
  
  async startTrace(webhookPayload: any): Promise<string> {
    const traceId = this.generateTraceId(webhookPayload);
    
    const trace: AlertFlowTrace = {
      traceId,
      startTime: Date.now(),
      webhookReceived: {
        timestamp: new Date().toISOString(),
        payload: webhookPayload,
        headers: this.extractHeaders(),
        sourceIP: this.extractSourceIP()
      },
      steps: []
    };
    
    this.flowTraces.set(traceId, trace);
    return traceId;
  }
  
  async recordStep(traceId: string, step: FlowStep): Promise<void> {
    const trace = this.flowTraces.get(traceId);
    if (!trace) return;
    
    trace.steps.push({
      ...step,
      timestamp: new Date().toISOString(),
      duration: Date.now() - trace.startTime
    });
    
    // Check for anomalies
    if (step.duration > this.getThreshold(step.type)) {
      await this.flagAnomaly(traceId, step);
    }
  }
  
  async analyzeFlowPerformance(): Promise<FlowAnalysis> {
    const recentTraces = this.getRecentTraces(3600000); // Last hour
    
    return {
      totalAlerts: recentTraces.length,
      averageProcessingTime: this.calculateAverageTime(recentTraces),
      bottlenecks: this.identifyBottlenecks(recentTraces),
      errorRate: this.calculateErrorRate(recentTraces),
      recommendations: this.generateRecommendations(recentTraces)
    };
  }
}
```

### Error Detection & Classification
```typescript
// Comprehensive error detection system
interface ErrorClassification {
  category: 'webhook' | 'database' | 'validation' | 'network' | 'authentication';
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: string;
  frequency: number;
  impact: string;
  resolution: string;
  prevention: string;
}

class ErrorDetector {
  private errorPatterns: Map<string, ErrorClassification> = new Map([
    ['ECONNREFUSED', {
      category: 'network',
      severity: 'high',
      pattern: 'Connection refused',
      frequency: 0,
      impact: 'Webhooks cannot be received',
      resolution: 'Check server status and firewall settings',
      prevention: 'Implement health checks and monitoring'
    }],
    
    ['TIMEOUT', {
      category: 'network',
      severity: 'medium',
      pattern: 'Request timeout',
      frequency: 0,
      impact: 'Slow webhook processing',
      resolution: 'Optimize webhook handler performance',
      prevention: 'Set appropriate timeout values and optimize code'
    }],
    
    ['DUPLICATE_KEY', {
      category: 'database',
      severity: 'low',
      pattern: 'Duplicate key violation',
      frequency: 0,
      impact: 'Duplicate alerts rejected',
      resolution: 'Review deduplication logic',
      prevention: 'Implement proper unique constraints'
    }],
    
    ['INVALID_JSON', {
      category: 'webhook',
      severity: 'medium',
      pattern: 'Invalid JSON payload',
      frequency: 0,
      impact: 'Alert processing fails',
      resolution: 'Validate TradingView webhook configuration',
      prevention: 'Implement robust JSON parsing with fallbacks'
    }]
  ]);
  
  classifyError(error: Error, context: any): ErrorClassification {
    const errorMessage = error.message.toLowerCase();
    
    for (const [pattern, classification] of this.errorPatterns) {
      if (errorMessage.includes(pattern.toLowerCase())) {
        classification.frequency++;
        return classification;
      }
    }
    
    // Unknown error - create new classification
    return {
      category: 'unknown',
      severity: 'medium',
      pattern: error.message,
      frequency: 1,
      impact: 'Unknown impact on alert processing',
      resolution: 'Investigate error details and context',
      prevention: 'Add error handling for this scenario'
    };
  }
  
  generateErrorReport(): ErrorReport {
    const errors = Array.from(this.errorPatterns.values());
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    const frequentErrors = errors.filter(e => e.frequency > 10);
    
    return {
      summary: {
        totalErrors: errors.reduce((sum, e) => sum + e.frequency, 0),
        uniqueErrors: errors.length,
        criticalErrors: criticalErrors.length,
        frequentErrors: frequentErrors.length
      },
      topIssues: errors
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10),
      recommendations: this.generateErrorRecommendations(errors)
    };
  }
}
```

## Diagnostic Tools

### Webhook Testing Suite
```typescript
// Comprehensive webhook testing
class WebhookTestSuite {
  async runDiagnostics(): Promise<DiagnosticReport> {
    const tests = [
      this.testConnectivity(),
      this.testPayloadFormats(),
      this.testRateLimiting(),
      this.testAuthentication(),
      this.testErrorHandling()
    ];
    
    const results = await Promise.all(tests);
    
    return {
      timestamp: new Date().toISOString(),
      overallStatus: results.every(r => r.passed) ? 'PASS' : 'FAIL',
      tests: results,
      recommendations: this.generateRecommendations(results)
    };
  }
  
  private async testPayloadFormats(): Promise<TestResult> {
    const testPayloads = [
      // Valid payload
      {
        ticker: 'AAPL',
        alert_name: 'Bullish Divergence',
        timestamp: new Date().toISOString(),
        price: 150.25
      },
      
      // Missing required fields
      {
        ticker: 'AAPL'
        // Missing alert_name and timestamp
      },
      
      // Invalid data types
      {
        ticker: 'AAPL',
        alert_name: 'Test Alert',
        timestamp: new Date().toISOString(),
        price: 'invalid' // Should be number
      },
      
      // Invalid JSON
      '{"ticker": "AAPL", "invalid": json}'
    ];
    
    const results = [];
    for (const payload of testPayloads) {
      try {
        const response = await this.sendTestWebhook(payload);
        results.push({
          payload,
          response: response.status,
          success: response.ok
        });
      } catch (error) {
        results.push({
          payload,
          error: error.message,
          success: false
        });
      }
    }
    
    return {
      testName: 'Payload Format Validation',
      passed: results[0].success && !results[1].success && !results[2].success,
      details: results,
      message: 'Webhook should accept valid payloads and reject invalid ones'
    };
  }
}
```

### Database Connection Diagnostics
```typescript
// Database health monitoring
class DatabaseDiagnostics {
  async checkDatabaseHealth(): Promise<DatabaseHealthReport> {
    const checks = await Promise.all([
      this.testConnection(),
      this.testQueryPerformance(),
      this.checkIndexUsage(),
      this.analyzeTableStatistics(),
      this.checkReplicationLag()
    ]);
    
    return {
      timestamp: new Date().toISOString(),
      status: checks.every(c => c.healthy) ? 'healthy' : 'unhealthy',
      checks,
      recommendations: this.generateDBRecommendations(checks)
    };
  }
  
  private async testQueryPerformance(): Promise<HealthCheck> {
    const testQueries = [
      {
        name: 'Recent Alerts Query',
        query: 'SELECT * FROM alerts WHERE timestamp >= NOW() - INTERVAL \'1 hour\' LIMIT 100',
        maxDuration: 100 // ms
      },
      {
        name: 'Strategy Evaluation Query', 
        query: 'SELECT COUNT(*) FROM alerts WHERE ticker = $1 AND timestamp >= $2',
        maxDuration: 50 // ms
      }
    ];
    
    const results = [];
    for (const test of testQueries) {
      const startTime = Date.now();
      try {
        await this.executeQuery(test.query, ['AAPL', new Date(Date.now() - 3600000)]);
        const duration = Date.now() - startTime;
        
        results.push({
          name: test.name,
          duration,
          passed: duration <= test.maxDuration,
          threshold: test.maxDuration
        });
      } catch (error) {
        results.push({
          name: test.name,
          error: error.message,
          passed: false
        });
      }
    }
    
    return {
      name: 'Query Performance',
      healthy: results.every(r => r.passed),
      details: results,
      metrics: {
        averageQueryTime: results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
      }
    };
  }
}
```

## Real-time Monitoring

### Alert Pipeline Dashboard
```typescript
// Real-time pipeline monitoring
interface PipelineMetrics {
  throughput: {
    webhooksPerMinute: number;
    alertsProcessed: number;
    strategiesEvaluated: number;
    errorsEncountered: number;
  };
  
  latency: {
    averageProcessingTime: number;
    p95ProcessingTime: number;
    webhookToDatabase: number;
    databaseToFrontend: number;
  };
  
  errors: {
    webhookErrors: number;
    validationErrors: number;
    databaseErrors: number;
    networkErrors: number;
  };
  
  health: {
    webhookEndpointStatus: 'up' | 'down' | 'degraded';
    databaseStatus: 'up' | 'down' | 'degraded';
    realtimeStatus: 'up' | 'down' | 'degraded';
    overallStatus: 'healthy' | 'warning' | 'critical';
  };
}

class PipelineMonitor {
  private metrics: PipelineMetrics;
  private alerts: AlertRule[] = [
    {
      name: 'High Error Rate',
      condition: (metrics) => metrics.errors.webhookErrors > 10,
      severity: 'critical',
      action: 'investigate webhook configuration'
    },
    {
      name: 'High Latency',
      condition: (metrics) => metrics.latency.averageProcessingTime > 1000,
      severity: 'warning', 
      action: 'check database performance'
    },
    {
      name: 'Low Throughput',
      condition: (metrics) => metrics.throughput.webhooksPerMinute < 1,
      severity: 'warning',
      action: 'verify TradingView integration'
    }
  ];
  
  async updateMetrics(): Promise<void> {
    this.metrics = await this.collectMetrics();
    await this.checkAlertRules();
    await this.publishMetrics();
  }
  
  private async checkAlertRules(): Promise<void> {
    for (const rule of this.alerts) {
      if (rule.condition(this.metrics)) {
        await this.triggerAlert(rule);
      }
    }
  }
}
```

## Troubleshooting Workflows

### Common Issue Resolution
```typescript
// Automated troubleshooting workflows
class TroubleshootingWorkflows {
  async diagnoseWebhookIssues(): Promise<TroubleshootingReport> {
    const issues: Issue[] = [];
    
    // Check webhook connectivity
    const connectivity = await this.testWebhookConnectivity();
    if (!connectivity.success) {
      issues.push({
        type: 'connectivity',
        severity: 'high',
        description: 'Cannot reach webhook endpoint',
        resolution: 'Check server status and network configuration',
        automated: false
      });
    }
    
    // Check recent error patterns
    const errorAnalysis = await this.analyzeRecentErrors();
    if (errorAnalysis.criticalErrors > 0) {
      issues.push({
        type: 'errors',
        severity: 'critical',
        description: `${errorAnalysis.criticalErrors} critical errors detected`,
        resolution: 'Review error logs and fix underlying issues',
        automated: false
      });
    }
    
    // Check database performance
    const dbHealth = await this.checkDatabaseHealth();
    if (!dbHealth.healthy) {
      issues.push({
        type: 'database',
        severity: 'medium',
        description: 'Database performance degraded',
        resolution: 'Optimize queries or increase database resources',
        automated: true, // Can auto-optimize some queries
        autoFix: this.optimizeDatabaseQueries
      });
    }
    
    return {
      timestamp: new Date().toISOString(),
      issuesFound: issues.length,
      issues,
      overallHealth: issues.length === 0 ? 'healthy' : 'degraded',
      nextSteps: this.generateNextSteps(issues)
    };
  }
  
  async autoFixIssues(report: TroubleshootingReport): Promise<AutoFixResults> {
    const results: AutoFixResult[] = [];
    
    for (const issue of report.issues) {
      if (issue.automated && issue.autoFix) {
        try {
          await issue.autoFix();
          results.push({
            issue: issue.type,
            success: true,
            message: 'Issue automatically resolved'
          });
        } catch (error) {
          results.push({
            issue: issue.type,
            success: false,
            error: error.message,
            message: 'Auto-fix failed, manual intervention required'
          });
        }
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      fixesAttempted: results.length,
      successfulFixes: results.filter(r => r.success).length,
      results
    };
  }
}
```

This alert system debugger subagent provides comprehensive debugging and troubleshooting capabilities for the StockAgent webhook and alert processing pipeline, ensuring reliable data flow from TradingView to the trading dashboard.