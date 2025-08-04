-- Add price column to alerts table
-- Run this in your Supabase SQL editor to add the price column to existing installations

-- Add price column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='alerts' AND column_name='price') THEN
        ALTER TABLE alerts ADD COLUMN price decimal(20,8);
        RAISE NOTICE 'Price column added to alerts table';
    ELSE
        RAISE NOTICE 'Price column already exists in alerts table';
    END IF;
END $$;