-- Add ticker_indicators table to store current indicator values
-- This stores the latest VWAP, RSI, ADX, and HTF values for each ticker

CREATE TABLE IF NOT EXISTS ticker_indicators (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker text NOT NULL,
  vwap_value decimal(10,4),           -- VWAP percentage distance (e.g., 0.75 for 0.75%)
  rsi_value decimal(6,2),             -- RSI value (e.g., 68.5)
  rsi_status text,                    -- RSI status (e.g., "OB", "OS", "Neutral")
  adx_value decimal(6,2),             -- ADX value (e.g., 32.1)
  adx_strength text,                  -- ADX strength (e.g., "Strong", "Weak")
  adx_direction text,                 -- ADX direction (e.g., "Bullish", "Bearish")
  htf_status text,                    -- HTF synergy status (e.g., "Reversal Bullish")
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure only one record per ticker
  UNIQUE(ticker)
);

-- Index for efficient ticker lookups
CREATE INDEX IF NOT EXISTS idx_ticker_indicators_ticker ON ticker_indicators(ticker);
CREATE INDEX IF NOT EXISTS idx_ticker_indicators_updated_at ON ticker_indicators(updated_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticker_indicators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on ticker_indicators
CREATE TRIGGER update_ticker_indicators_updated_at BEFORE UPDATE ON ticker_indicators
    FOR EACH ROW EXECUTE FUNCTION update_ticker_indicators_updated_at();

-- Grant permissions
GRANT ALL ON ticker_indicators TO authenticated;
GRANT ALL ON ticker_indicators TO anon;