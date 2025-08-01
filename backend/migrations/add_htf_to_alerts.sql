-- Add HTF (Higher Timeframe) column to alerts table
-- This column stores higher timeframe data for alerts

BEGIN;

-- Add htf column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='alerts' AND column_name='htf') THEN
        ALTER TABLE alerts ADD COLUMN htf text;
    END IF;
END
$$;

-- Add index for better performance on htf queries
CREATE INDEX IF NOT EXISTS idx_alerts_htf ON alerts(htf) WHERE htf IS NOT NULL;

COMMIT;