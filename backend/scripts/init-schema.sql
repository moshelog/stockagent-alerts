-- StockAgent Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add HTF column if it doesn't exist (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='alerts' AND column_name='htf') THEN
        ALTER TABLE alerts ADD COLUMN htf text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='alerts' AND column_name='timeframe') THEN
        ALTER TABLE alerts ADD COLUMN timeframe text;
    END IF;
END $$;

-- Incoming alerts from TradingView webhooks
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker text NOT NULL,
  timeframe text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  indicator text NOT NULL,
  trigger text NOT NULL,
  htf text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_alerts_ticker_timestamp ON alerts(ticker, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);

-- UI config for available alerts (weights + enabled flag)
CREATE TABLE IF NOT EXISTS available_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  indicator text NOT NULL,
  trigger text NOT NULL,
  weight float NOT NULL DEFAULT 0,
  enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(indicator, trigger)
);

-- User strategies
CREATE TABLE IF NOT EXISTS strategies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  timeframe integer NOT NULL, -- minutes
  rules jsonb NOT NULL,       -- [{indicator, trigger}]
  threshold float DEFAULT 0,  -- for future scoring
  is_manual boolean DEFAULT true,
  enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Executed buy/sell actions
CREATE TABLE IF NOT EXISTS actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  action text NOT NULL CHECK (action IN ('BUY', 'SELL')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  found jsonb NOT NULL,     -- triggers that fired
  missing jsonb NOT NULL,   -- triggers not seen (should be empty for completed strategies)
  score float DEFAULT 0,    -- calculated score
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient action queries
CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON actions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_actions_ticker ON actions(ticker, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_actions_strategy ON actions(strategy_id, timestamp DESC);

-- Insert some default available alerts to match the frontend
INSERT INTO available_alerts (indicator, trigger, weight, enabled) VALUES
-- Nautilus alerts
('Nautilus™', 'Normal Bearish Divergence', -2.5, true),
('Nautilus™', 'Normal Bullish Divergence', 2.3, true),
('Nautilus™', 'Hidden Bearish Divergence', -2.8, true),
('Nautilus™', 'Hidden Bullish Divergence', 2.6, true),
('Nautilus™', 'Multiple Bullish Divergence', 3.2, true),
('Nautilus™', 'Multiple Bearish Divergence', -3.0, true),
('Nautilus™', 'Bullish DipX', 2.1, true),
('Nautilus™', 'Bearish DipX', -2.0, true),
('Nautilus™', 'Buy Signal', 2.4, true),
('Nautilus™', 'Sell Signal', -2.2, true),
('Nautilus™', 'Oscillator Oversold', 1.8, true),
('Nautilus™', 'Oscillator Overbought', -1.9, true),
('Nautilus™', 'Bullish Volume Cross', 1.5, true),
('Nautilus™', 'Bearish Volume Cross', -1.4, true),
('Nautilus™', 'Bullish Peak', 2.0, true),
('Nautilus™', 'Bearish Peak', -2.1, true),

-- Market Core Pro alerts
('Market Core Pro™', 'Bullish OB Break', 2.2, true),
('Market Core Pro™', 'Bearish OB Break', -2.0, true),
('Market Core Pro™', 'Touching Bearish OB', -1.5, true),
('Market Core Pro™', 'Touching Bullish OB', 1.6, true),
('Market Core Pro™', 'Bullish BoS', 2.1, true),
('Market Core Pro™', 'Bearish BoS', -1.9, true),
('Market Core Pro™', 'Bullish ChoCH', 1.8, true),
('Market Core Pro™', 'Bearish ChoCH', -1.7, true),
('Market Core Pro™', 'Bullish FVG Created', 1.4, true),
('Market Core Pro™', 'Bearish FVG Created', -1.3, true),
('Market Core Pro™', 'Bullish FVG Break', 2.0, true),
('Market Core Pro™', 'Bearish FVG Break', -1.8, true),

-- Market Waves Pro alerts
('Market Waves Pro™', 'Buy', 2.5, true),
('Market Waves Pro™', 'Buy+', 3.0, true),
('Market Waves Pro™', 'Any Buy', 2.2, true),
('Market Waves Pro™', 'Sell', -2.3, true),
('Market Waves Pro™', 'Sell+', -2.8, true),
('Market Waves Pro™', 'Any Sell', -2.0, true),
('Market Waves Pro™', 'Bullish FlowTrend', 2.2, true),
('Market Waves Pro™', 'Bearish FlowTrend', -2.0, true),

-- Extreme Zones alerts
('Extreme Zones', 'Premium Zone', -1.8, true),
('Extreme Zones', 'Discount Zone', 1.9, true),
('Extreme Zones', 'Equilibrium Zone', 0.0, true)

ON CONFLICT (indicator, trigger) DO NOTHING;

-- Insert default strategies to match the frontend config
INSERT INTO strategies (name, timeframe, rules, threshold, enabled) VALUES
(
  'Buy on discount zone',
  15,
  '[{"indicator": "Extreme Zones", "trigger": "Discount Zone"}, {"indicator": "Nautilus™", "trigger": "Normal Bullish Divergence"}]',
  3.0,
  true
),
(
  'Sell on Premium zone',
  15,
  '[{"indicator": "Extreme Zones", "trigger": "Premium Zone"}, {"indicator": "Nautilus™", "trigger": "Normal Bearish Divergence"}]',
  -4.0,
  true
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on strategies
CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();