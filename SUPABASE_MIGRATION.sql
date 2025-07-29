-- ==================================================================
-- SUPABASE MIGRATION: Add rule_groups field to preserve UI structure
-- ==================================================================
-- ⚠️  IMPORTANT: Run this manually in your Supabase SQL Editor
-- ⚠️  This MUST be run before the Group 2 fix will work properly
-- ==================================================================

-- Step 1: Add the rule_groups column to store UI group structure
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS rule_groups JSONB;

-- Step 2: Add documentation comment
COMMENT ON COLUMN strategies.rule_groups 
IS 'Stores UI group structure with AND/OR operators: [{"id": "group-1", "operator": "AND", "alerts": [{"id": "alert1", "indicator": "nautilus", "name": "Normal Bullish Divergence", "weight": 2.3}]}]';

-- Step 3: Migrate existing strategies to have rule_groups structure
-- This converts flat rules array to single AND group for backward compatibility
UPDATE strategies 
SET rule_groups = jsonb_build_array(
  jsonb_build_object(
    'id', 'group-1',
    'operator', 'AND',
    'alerts', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', LOWER(REPLACE(REPLACE(REPLACE(r->>'trigger', ' ', '_'), '''', ''), '+', '_plus')),
          'indicator', CASE 
            WHEN r->>'indicator' = 'Nautilus™' THEN 'nautilus'
            WHEN r->>'indicator' = 'Market Core Pro™' THEN 'market_core'
            WHEN r->>'indicator' = 'Market Waves Pro™' THEN 'market_waves'
            WHEN r->>'indicator' = 'Extreme Zones' THEN 'extreme_zones'
            ELSE LOWER(REPLACE(r->>'indicator', ' ', '_'))
          END,
          'name', r->>'trigger',
          'weight', COALESCE((
            SELECT weight 
            FROM available_alerts 
            WHERE indicator = r->>'indicator' 
            AND trigger = r->>'trigger'
          ), 0)
        )
      )
      FROM jsonb_array_elements(
        -- Handle both string and object formats
        CASE 
          WHEN jsonb_typeof(rules) = 'string' THEN rules::text::jsonb
          ELSE rules
        END
      ) r
    )
  )
)
WHERE rule_groups IS NULL 
AND rules IS NOT NULL;

-- Step 4: Verify the migration worked
SELECT 
  id,
  name,
  jsonb_array_length(rules) as rules_count,
  CASE 
    WHEN rule_groups IS NOT NULL THEN jsonb_array_length(rule_groups)
    ELSE 0 
  END as groups_count,
  rule_groups
FROM strategies 
ORDER BY created_at DESC;

-- ✅ If you see rule_groups populated, the migration was successful!
-- ✅ The frontend will now preserve Group 2, OR logic, and complex group structures