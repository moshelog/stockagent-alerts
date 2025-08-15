-- Add volume fields to ticker_indicators table
-- This adds support for volume data in the format: "Vol: 12.49K (+149%) HIGH"

DO $$ 
BEGIN
    -- Add volume_amount field (e.g., "12.49K", "500M", "1.2B")
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ticker_indicators' AND column_name='volume_amount') THEN
        ALTER TABLE ticker_indicators ADD COLUMN volume_amount text;
    END IF;
    
    -- Add volume_change field (percentage change, e.g., +149, -25)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ticker_indicators' AND column_name='volume_change') THEN
        ALTER TABLE ticker_indicators ADD COLUMN volume_change decimal(8,2);
    END IF;
    
    -- Add volume_level field (e.g., "HIGH", "LOW", "NORMAL")
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ticker_indicators' AND column_name='volume_level') THEN
        ALTER TABLE ticker_indicators ADD COLUMN volume_level text;
    END IF;
END $$;