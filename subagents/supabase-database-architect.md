# Supabase Database Architect Subagent

## Purpose
Specialized AI subagent for Supabase database design, query optimization, and schema management in the StockAgent platform. This subagent ensures optimal database performance, scalability, and data integrity.

## Core Capabilities

### Schema Design & Management
- **Table Structure**: Optimal schema design for trading data and time-series storage
- **Index Optimization**: Strategic indexing for high-frequency alert queries
- **Constraint Management**: Foreign keys, check constraints, and data integrity rules
- **Partitioning Strategy**: Time-based partitioning for large alert datasets

### Query Optimization
- **Performance Analysis**: Query execution plan analysis and optimization
- **Index Recommendations**: Automated index suggestions based on query patterns
- **Query Rewriting**: Optimize complex queries for better performance
- **Connection Pooling**: Optimize database connection management

### Real-time Features
- **Realtime Subscriptions**: Optimize Supabase realtime for live dashboard updates
- **Row Level Security**: Implement fine-grained access control
- **Trigger Optimization**: Efficient database triggers for strategy evaluation
- **Change Data Capture**: Track and respond to data changes efficiently

## Integration Points

### StockAgent Database Schema
```sql
-- Optimized alerts table with partitioning
CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  alert_name VARCHAR(100) NOT NULL,
  indicator VARCHAR(50) NOT NULL,
  signal_type VARCHAR(10) NOT NULL,
  price DECIMAL(10,4),
  volume BIGINT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Indexes for optimal query performance
CREATE INDEX CONCURRENTLY idx_alerts_ticker_timestamp 
  ON alerts (ticker, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_alerts_indicator_timestamp 
  ON alerts (indicator, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_alerts_signal_timestamp 
  ON alerts (signal_type, timestamp DESC);
```

### Performance Optimizations
- **Connection Pooling**: PgBouncer configuration for optimal connections
- **Query Caching**: Strategic use of Supabase query caching
- **Materialized Views**: Pre-computed aggregations for dashboard queries
- **Background Jobs**: pg_cron for automated maintenance tasks

## Key Features

### Time-Series Optimization
```sql
-- Automated partition management
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  start_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  end_date := start_date + INTERVAL '1 month';
  partition_name := 'alerts_' || TO_CHAR(start_date, 'YYYY_MM');
  
  EXECUTE format('CREATE TABLE %I PARTITION OF alerts 
                  FOR VALUES FROM (%L) TO (%L)',
                  partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Automated cleanup of old partitions
CREATE OR REPLACE FUNCTION cleanup_old_partitions()
RETURNS void AS $$
BEGIN
  -- Drop partitions older than 6 months
  PERFORM drop_partition(partition_name)
  FROM information_schema.tables
  WHERE table_name LIKE 'alerts_%'
  AND table_name < 'alerts_' || TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYY_MM');
END;
$$ LANGUAGE plpgsql;
```

### Strategy Performance Tables
```sql
-- Optimized strategy performance tracking
CREATE TABLE strategy_performance (
  id BIGSERIAL PRIMARY KEY,
  strategy_id UUID NOT NULL REFERENCES strategies(id),
  ticker VARCHAR(10) NOT NULL,
  entry_timestamp TIMESTAMPTZ NOT NULL,
  exit_timestamp TIMESTAMPTZ,
  entry_price DECIMAL(10,4) NOT NULL,
  exit_price DECIMAL(10,4),
  pnl DECIMAL(12,4),
  win BOOLEAN,
  holding_period INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance analysis
CREATE INDEX idx_strategy_performance_strategy_date 
  ON strategy_performance (strategy_id, entry_timestamp DESC);
CREATE INDEX idx_strategy_performance_ticker_date 
  ON strategy_performance (ticker, entry_timestamp DESC);
```

### Real-time Dashboard Views
```sql
-- Materialized view for dashboard performance
CREATE MATERIALIZED VIEW dashboard_summary AS
SELECT 
  ticker,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE signal_type = 'BUY') as buy_signals,
  COUNT(*) FILTER (WHERE signal_type = 'SELL') as sell_signals,
  AVG(price) as avg_price,
  MAX(timestamp) as last_alert
FROM alerts 
WHERE timestamp >= CURRENT_DATE - INTERVAL '24 hours'
GROUP BY ticker;

-- Refresh policy for real-time updates
CREATE OR REPLACE FUNCTION refresh_dashboard_summary()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_dashboard_trigger
  AFTER INSERT OR UPDATE OR DELETE ON alerts
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_summary();
```

## Database Optimization Strategies

### Query Performance Tuning
```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT ticker, alert_name, price, timestamp 
FROM alerts 
WHERE ticker = 'AAPL' 
  AND timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC 
LIMIT 50;

-- Optimize with covering index
CREATE INDEX idx_alerts_ticker_covering 
  ON alerts (ticker, timestamp DESC) 
  INCLUDE (alert_name, price);
```

### Connection Management
```javascript
// Optimized Supabase client configuration
const supabaseConfig = {
  auth: {
    persistSession: false, // For backend services
    autoRefreshToken: false
  },
  db: {
    schema: 'public',
    pooler: {
      enabled: true,
      poolSize: 10,
      maxConnections: 100,
      idleTimeout: 30000,
      connectionTimeout: 5000
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 100, // Throttle for high-frequency updates
      heartbeatIntervalMs: 30000
    }
  }
}
```

### Row Level Security
```sql
-- RLS policies for multi-tenant security
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategies" ON strategies
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own strategies" ON strategies
  FOR ALL USING (user_id = auth.uid());

-- Function-based RLS for complex rules
CREATE OR REPLACE FUNCTION user_can_access_ticker(ticker_symbol TEXT)
RETURNS boolean AS $$
BEGIN
  -- Custom logic for ticker access control
  RETURN EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = auth.uid() 
    AND (ticker_symbol = ANY(allowed_tickers) OR has_all_access = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Monitoring & Analytics

### Performance Metrics
```sql
-- Database performance monitoring views
CREATE VIEW db_performance_metrics AS
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables;

-- Query performance tracking
CREATE TABLE query_performance_log (
  id BIGSERIAL PRIMARY KEY,
  query_hash TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  rows_returned INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### Automated Maintenance
```sql
-- Automated vacuum and analyze scheduling
SELECT cron.schedule(
  'vacuum-analyze-alerts',
  '0 2 * * *', -- Daily at 2 AM
  'VACUUM ANALYZE alerts;'
);

-- Index maintenance
SELECT cron.schedule(
  'reindex-alerts',
  '0 3 * * 0', -- Weekly on Sunday at 3 AM
  'REINDEX TABLE alerts;'
);

-- Statistics update
SELECT cron.schedule(
  'update-statistics',
  '*/30 * * * *', -- Every 30 minutes
  'ANALYZE alerts;'
);
```

## Scalability Features

### Horizontal Scaling Preparation
```sql
-- Sharding preparation for future scaling
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shard-ready table design
CREATE TABLE alerts_sharded (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shard_key INTEGER NOT NULL DEFAULT (hashtext(ticker::text) % 16),
  ticker VARCHAR(10) NOT NULL,
  alert_name VARCHAR(100) NOT NULL,
  -- ... other fields
) PARTITION BY HASH (shard_key);

-- Create 16 hash partitions
DO $$
BEGIN
  FOR i IN 0..15 LOOP
    EXECUTE format('CREATE TABLE alerts_shard_%s PARTITION OF alerts_sharded 
                    FOR VALUES WITH (MODULUS 16, REMAINDER %s)', i, i);
  END LOOP;
END
$$;
```

### Backup & Recovery Optimization
```sql
-- Point-in-time recovery setup
CREATE TABLE backup_metadata (
  id SERIAL PRIMARY KEY,
  backup_type VARCHAR(20) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  size_bytes BIGINT,
  status VARCHAR(20) DEFAULT 'running'
);

-- Incremental backup tracking
CREATE OR REPLACE FUNCTION track_data_changes()
RETURNS trigger AS $$
BEGIN
  INSERT INTO data_change_log (table_name, operation, changed_at)
  VALUES (TG_TABLE_NAME, TG_OP, NOW());
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## API Integration Patterns

### Optimized Data Access Layer
```typescript
// Optimized Supabase queries for StockAgent
class DatabaseArchitect {
  // Efficient alert fetching with pagination
  async getRecentAlerts(ticker?: string, limit = 50, offset = 0) {
    let query = supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (ticker) {
      query = query.eq('ticker', ticker);
    }
    
    return query;
  }
  
  // Bulk insert optimization for high-frequency alerts
  async bulkInsertAlerts(alerts: Alert[]) {
    // Use batch insert with conflict handling
    return supabase
      .from('alerts')
      .upsert(alerts, { 
        onConflict: 'ticker,timestamp,alert_name',
        ignoreDuplicates: true 
      });
  }
  
  // Real-time subscription optimization
  setupRealtimeSubscription(callback: (payload: any) => void) {
    return supabase
      .channel('alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        filter: `timestamp=gte.${new Date(Date.now() - 3600000).toISOString()}`
      }, callback)
      .subscribe();
  }
}
```

## Troubleshooting Tools

### Query Analysis Tools
```sql
-- Slow query identification
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100 -- queries taking more than 100ms on average
ORDER BY mean_time DESC
LIMIT 10;

-- Index usage analysis
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Performance Diagnostics
- **Connection Analysis**: Monitor active connections and identify bottlenecks
- **Lock Detection**: Identify and resolve database locking issues
- **Query Plan Analysis**: Automated query plan optimization recommendations
- **Resource Usage**: Monitor CPU, memory, and I/O usage patterns