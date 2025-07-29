-- Add timeframe column to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS timeframe VARCHAR(10);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_alerts_timeframe ON alerts(timeframe);

-- Update existing alerts to have a default timeframe (you can adjust this as needed)
UPDATE alerts SET timeframe = '15m' WHERE timeframe IS NULL;