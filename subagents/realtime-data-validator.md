# Realtime Data Validator Subagent

## Purpose
Specialized AI subagent for validating webhook payloads, ensuring data integrity, and monitoring real-time data synchronization in the StockAgent platform. This subagent acts as a quality gate for all incoming trading data.

## Core Capabilities

### Webhook Validation
- **Payload Structure**: Validate TradingView webhook JSON structure and required fields
- **Data Type Validation**: Ensure proper data types (timestamps, prices, volumes)
- **Schema Compliance**: Validate against predefined alert schemas
- **Signature Verification**: Cryptographic validation of webhook authenticity

### Data Integrity Checks
- **Duplicate Detection**: Identify and handle duplicate alerts within timeframes
- **Temporal Validation**: Ensure alert timestamps are logical and sequential
- **Price Validation**: Cross-reference prices against market data ranges
- **Volume Validation**: Validate volume data against historical patterns

### Real-time Synchronization
- **Database Consistency**: Ensure data consistency between frontend and backend
- **Cache Validation**: Validate cached data against source of truth
- **Race Condition Detection**: Identify and resolve concurrent data updates
- **State Synchronization**: Ensure UI state matches backend data

## Integration Points

### StockAgent Components
- **Webhook Endpoint**: Direct integration with `POST /webhook` processing
- **Alert Storage**: Validation before Supabase database insertion
- **Frontend Updates**: Data validation for real-time UI updates
- **Strategy Evaluation**: Ensure clean data for strategy calculations

### Database Integration
- **Write Validation**: Pre-write data validation and sanitization
- **Consistency Checks**: Cross-table data consistency validation
- **Constraint Enforcement**: Ensure database constraints are met
- **Transaction Integrity**: Validate multi-table transaction consistency

### API Endpoints
- **Validation Reports**: `GET /api/data-validation/status`
- **Error Tracking**: `GET /api/data-validation/errors`
- **Health Checks**: `GET /api/data-validation/health`

## Key Features

### Webhook Processing Pipeline
```typescript
interface WebhookValidationResult {
  isValid: boolean
  errors: ValidationError[]
  sanitizedData?: AlertData
  confidence: number
  processingTime: number
}

interface ValidationError {
  field: string
  error: string
  severity: 'warning' | 'error' | 'critical'
  recommendation?: string
}
```

### Data Quality Metrics
- **Completeness**: Percentage of required fields present
- **Accuracy**: Data accuracy against expected ranges
- **Consistency**: Cross-field data consistency validation
- **Timeliness**: Alert arrival time vs. market time validation

### Real-time Monitoring
- **Alert Flow Tracking**: Monitor alert flow from TradingView to database
- **Processing Latency**: Track end-to-end processing times
- **Error Rate Monitoring**: Track validation failure rates
- **Data Loss Detection**: Identify missing or corrupted alerts

## Validation Rules

### TradingView Webhook Validation
```typescript
const webhookSchema = {
  ticker: { type: 'string', required: true, pattern: /^[A-Z]{2,5}$/ },
  timestamp: { type: 'string', required: true, format: 'iso8601' },
  price: { type: 'number', required: true, min: 0.01, max: 999999 },
  volume: { type: 'number', required: false, min: 0 },
  alert_name: { type: 'string', required: true, maxLength: 100 },
  indicator: { type: 'string', required: true, enum: VALID_INDICATORS },
  signal_type: { type: 'string', required: true, enum: ['BUY', 'SELL', 'NEUTRAL'] },
  timeframe: { type: 'string', required: false, enum: ['1m', '5m', '15m', '1h', '4h', '1d'] }
}
```

### Data Consistency Rules
- **Price Validation**: Price within 10% of recent market range
- **Volume Validation**: Volume within 3 standard deviations of average
- **Timestamp Validation**: Alert timestamp within 5 minutes of current time
- **Indicator Validation**: Alert name matches configured indicator patterns

### Business Logic Validation
- **Strategy Constraints**: Validate alerts against active strategy requirements
- **Market Hours**: Validate alerts during appropriate trading hours
- **Symbol Validation**: Ensure ticker symbols are actively traded
- **Duplicate Prevention**: Block duplicate alerts within 60-second windows

## Quality Gates

### Severity Levels
- **Critical**: Invalid data that could corrupt strategies or calculations
- **Error**: Invalid data that should be rejected but won't corrupt system
- **Warning**: Questionable data that should be flagged but not rejected
- **Info**: Data anomalies for monitoring but not blocking

### Auto-Correction Rules
```typescript
interface AutoCorrectionRule {
  condition: (data: any) => boolean
  correction: (data: any) => any
  confidence: number
  description: string
}

// Example auto-corrections
const corrections = [
  {
    condition: (data) => !data.timeframe && data.alert_name.includes('1H'),
    correction: (data) => ({ ...data, timeframe: '1h' }),
    confidence: 0.95,
    description: 'Infer timeframe from alert name'
  },
  {
    condition: (data) => data.price && data.price > 10000 && data.ticker === 'BTC',
    correction: (data) => data, // Accept high BTC prices
    confidence: 1.0,
    description: 'Accept high cryptocurrency prices'
  }
]
```

## Monitoring & Alerting

### Performance Metrics
- **Processing Latency**: <50ms for webhook validation
- **Accuracy Rate**: >99.5% for valid webhook classification
- **False Positive Rate**: <0.1% for incorrectly rejected valid data
- **Data Loss Rate**: <0.01% for missing alerts

### Alert Conditions
- **High Error Rate**: >1% validation failures in 5-minute window
- **Processing Delays**: Average latency >100ms
- **Data Inconsistencies**: Mismatched data between systems
- **Critical Validation Failures**: Any critical severity errors

### Reporting Dashboard
- **Real-time Status**: Live validation statistics and error rates
- **Historical Trends**: Long-term data quality trends
- **Error Analysis**: Detailed breakdown of validation failures
- **Performance Metrics**: System performance and SLA compliance

## Implementation Features

### Caching Strategy
- **Validation Rules**: Cache compiled validation rules for 1 hour
- **Reference Data**: Cache market data ranges for validation
- **Error Patterns**: Cache common error patterns for faster detection
- **Performance Metrics**: Cache aggregated metrics for dashboard

### Error Handling
- **Graceful Degradation**: Continue processing valid alerts when some fail
- **Retry Logic**: Automatic retry for transient validation failures
- **Fallback Processing**: Bypass validation for critical system alerts
- **Error Recovery**: Automatic recovery from validation service failures

### Integration Patterns
```typescript
// Validation middleware for webhook processing
const validateWebhook = async (req, res, next) => {
  const validation = await realtimeValidator.validate(req.body)
  
  if (!validation.isValid) {
    await logValidationErrors(validation.errors)
    return res.status(400).json({ errors: validation.errors })
  }
  
  req.validatedData = validation.sanitizedData
  next()
}

// Real-time data synchronization
const syncValidation = {
  validateStateConsistency: async (frontendState, backendState) => {
    // Cross-validate frontend and backend state
  },
  validateCacheConsistency: async () => {
    // Ensure cached data matches database
  },
  validateStrategyData: async (strategyId) => {
    // Validate strategy calculation inputs
  }
}
```

## Security Features

### Data Sanitization
- **XSS Prevention**: Strip potentially malicious content from alerts
- **SQL Injection Protection**: Validate data before database operations
- **Input Validation**: Strict validation of all incoming data fields
- **Output Encoding**: Proper encoding for API responses

### Access Control
- **Webhook Authentication**: Validate webhook source authenticity
- **API Security**: Secure access to validation endpoints
- **Audit Logging**: Log all validation activities for security analysis
- **Rate Limiting**: Prevent validation service abuse

### Compliance
- **Data Privacy**: No sensitive data logging or storage
- **Audit Trail**: Complete audit trail for validation decisions
- **Retention Policy**: Automatic cleanup of validation logs
- **Regulatory Compliance**: Meet financial data handling requirements