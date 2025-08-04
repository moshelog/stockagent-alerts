# Database Migration Instructions

## Add Price Column to Production Database

To complete the price column implementation, run this SQL script in your Supabase SQL editor:

```sql
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
```

## Verification

After running the migration, you can verify the price column was added by running:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'alerts' 
ORDER BY ordinal_position;
```

You should see the `price` column listed with type `numeric` (decimal).

## Next Steps

1. Run the migration SQL in Supabase
2. Test webhook with price format: `TICKER|PRICE|TIMEFRAME|INDICATOR|TRIGGER`  
3. Verify price column appears in alerts table in frontend
4. Test backward compatibility with legacy format: `TICKER|TIMEFRAME|INDICATOR|TRIGGER`