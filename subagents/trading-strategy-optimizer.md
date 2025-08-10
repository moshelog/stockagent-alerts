# Trading Strategy Optimizer Subagent

## Purpose
Specialized AI subagent for analyzing, optimizing, and validating trading strategies in the StockAgent platform. This subagent focuses on strategy performance analysis, risk assessment, and systematic improvement of trading logic.

## Core Capabilities

### Strategy Analysis
- **Performance Metrics**: Win rate, net P&L, max drawdown, Sharpe ratio analysis
- **Risk Assessment**: Position sizing, volatility analysis, correlation analysis
- **Backtesting**: Historical performance validation across market conditions
- **Alert Combination Analysis**: Optimal weight distribution and threshold tuning

### Strategy Optimization
- **Weight Optimization**: Mathematical optimization of alert weights using historical data
- **Threshold Tuning**: Dynamic threshold adjustment based on market volatility
- **Timeframe Analysis**: Optimal timeframe selection for strategy components
- **Risk-Adjusted Returns**: Maximize risk-adjusted performance metrics

### Strategy Validation
- **Overfitting Detection**: Statistical tests for strategy robustness
- **Market Regime Analysis**: Performance across different market conditions
- **Correlation Analysis**: Strategy independence and diversification benefits
- **Live Performance Monitoring**: Real-time strategy health checks

## Integration Points

### StockAgent Components
- **Strategy Interface**: Direct integration with `hooks/useConfig.ts` strategy definitions
- **Alert System**: Analysis of 70 alert types across 4 indicator categories
- **Scoring System**: Optimization of ticker scoring algorithms
- **Performance Tracking**: Enhanced metrics for strategy evaluation

### Database Integration
- **Historical Data**: Analysis of past alert patterns and strategy performance
- **Performance Metrics**: Storage and tracking of optimization results
- **A/B Testing**: Systematic testing of strategy modifications

### API Endpoints
- **Strategy Analysis**: `POST /api/analyze-strategy`
- **Optimization Results**: `GET /api/strategy-optimization/{id}`
- **Performance Reports**: `GET /api/strategy-performance/{id}`

## Key Features

### Mathematical Optimization
```typescript
interface OptimizationConfig {
  strategy: Strategy
  historicalData: AlertData[]
  objectives: {
    maximizeReturn: boolean
    minimizeDrawdown: boolean
    minimizeVolatility: boolean
  }
  constraints: {
    maxWeight: number
    minThreshold: number
    maxThreshold: number
  }
}
```

### Risk Management
- **Position Sizing**: Kelly Criterion and risk parity approaches
- **Drawdown Control**: Dynamic threshold adjustment during losing streaks
- **Correlation Monitoring**: Alert combination correlation analysis
- **Volatility Adjustment**: Market volatility-based strategy scaling

### Performance Attribution
- **Alert Contribution**: Individual alert performance within strategies
- **Market Condition Analysis**: Bull/bear/sideways market performance
- **Time-Based Analysis**: Intraday, weekly, monthly performance patterns
- **Sector Rotation**: Strategy performance across different market sectors

## Activation Triggers

### Automatic Activation
- Strategy performance degradation (>20% drawdown)
- New strategy creation requests
- Alert weight modification requests
- Performance analysis queries

### Manual Activation
- `/optimize-strategy [strategy-name]` command
- Strategy backtest requests
- Risk assessment requirements
- Performance improvement projects

## Quality Standards

### Optimization Criteria
- **Statistical Significance**: Minimum 100 trades for strategy validation
- **Risk Metrics**: Sharpe ratio >1.5, max drawdown <15%
- **Consistency**: Positive returns in >60% of rolling 30-day periods
- **Robustness**: Performance stability across parameter variations

### Validation Requirements
- **Out-of-Sample Testing**: 30% of data reserved for validation
- **Walk-Forward Analysis**: Rolling optimization windows
- **Monte Carlo Testing**: 1000+ simulation runs for robustness
- **Regime Testing**: Performance across market regimes

## Example Usage

```typescript
// Strategy optimization request
const optimizationRequest = {
  strategyId: "nautilus-divergence-combo",
  objectives: {
    maximizeReturn: true,
    minimizeDrawdown: true,
    targetSharpe: 2.0
  },
  historicalPeriod: "6months",
  optimizationMethod: "genetic_algorithm"
}

// Expected optimization results
const optimizationResults = {
  originalPerformance: {
    winRate: 0.65,
    netPL: 15.2,
    maxDrawdown: -8.5,
    sharpeRatio: 1.8
  },
  optimizedPerformance: {
    winRate: 0.72,
    netPL: 22.8,
    maxDrawdown: -6.2,
    sharpeRatio: 2.4
  },
  optimizedWeights: {
    "nautilus-bullish-divergence": 0.35,
    "nautilus-volume-spike": 0.25,
    "market-core-order-block": 0.40
  },
  confidence: 0.87
}
```

## Implementation Notes

### Technology Stack
- **Optimization Libraries**: SciPy, NumPy for mathematical optimization
- **Statistical Analysis**: Pandas, Statsmodels for performance analysis
- **Backtesting**: Custom backtesting engine integrated with StockAgent data
- **Visualization**: Integration with Recharts for performance reporting

### Performance Considerations
- **Caching**: Optimization results cached for 24 hours
- **Async Processing**: Long-running optimizations handled via job queues
- **Resource Management**: Memory-efficient batch processing for large datasets
- **API Rate Limiting**: Optimization requests limited to prevent resource exhaustion

### Security & Compliance
- **Data Privacy**: No PII storage, only aggregated performance metrics
- **Access Control**: Strategy optimization limited to authenticated users
- **Audit Trail**: All optimization activities logged for compliance
- **Risk Limits**: Built-in safeguards against excessive leverage or risk