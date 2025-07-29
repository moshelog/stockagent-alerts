-- Migration: Add rule_groups field to strategies table
-- This preserves the UI group structure with AND/OR operators and group boundaries
-- Run this in your Supabase SQL editor

-- Add the rule_groups column to store the full UI group structure
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS rule_groups JSONB;

-- Add a comment explaining the structure
COMMENT ON COLUMN strategies.rule_groups IS 'Stores UI group structure: [{"id": "group-1", "operator": "AND", "alerts": [{"id": "alert1", "indicator": "...", "name": "...", "weight": 0}]}]';

-- Update existing strategies to have a default rule_groups structure based on their rules
-- This converts the flat rules array to a single AND group for backward compatibility
UPDATE strategies 
SET rule_groups = jsonb_build_array(
  jsonb_build_object(
    'id', 'group-1',
    'operator', 'AND',
    'alerts', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', LOWER(REPLACE(REPLACE(r->>'trigger', ' ', '_'), '''', '')),
          'indicator', CASE 
            WHEN r->>'indicator' = 'Nautilus™' THEN 'nautilus'
            WHEN r->>'indicator' = 'Market Core Pro™' THEN 'market_core'
            WHEN r->>'indicator' = 'Market Waves Pro™' THEN 'market_waves'
            WHEN r->>'indicator' = 'Extreme Zones' THEN 'extreme_zones'
            ELSE LOWER(r->>'indicator')
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
        CASE 
          WHEN jsonb_typeof(rules) = 'string' THEN rules::text::jsonb
          ELSE rules
        END
      ) r
    )
  )
)
WHERE rule_groups IS NULL;

-- Ensure all strategies have both rules and rule_groups for backward compatibility
-- The rules field will continue to be used by the strategy evaluator
-- The rule_groups field will be used by the UI for group structure