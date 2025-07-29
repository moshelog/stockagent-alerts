-- ==================================================================
-- SUPABASE MIGRATION: Simple step-by-step approach
-- ==================================================================
-- Run each step separately to avoid complex parsing issues
-- ==================================================================

-- Step 1: Add the rule_groups column
ALTER TABLE strategies 
ADD COLUMN IF NOT EXISTS rule_groups JSONB;

-- Step 2: Let's see what we're working with
SELECT 
  id,
  name,
  rules,
  pg_typeof(rules) as rules_postgres_type,
  jsonb_typeof(rules) as rules_jsonb_type
FROM strategies 
LIMIT 5;

-- Step 3: Simple approach - just add empty rule_groups for now
-- We'll let the frontend handle the conversion when users edit strategies
UPDATE strategies 
SET rule_groups = '[]'::jsonb
WHERE rule_groups IS NULL;

-- Step 4: For strategies that have simple rules, try to convert them
-- This will only work for properly formatted JSON arrays
UPDATE strategies 
SET rule_groups = jsonb_build_array(
  jsonb_build_object(
    'id', 'group-1',
    'operator', 'AND',
    'alerts', '[]'::jsonb
  )
)
WHERE rule_groups = '[]'::jsonb
  AND rules IS NOT NULL
  AND jsonb_typeof(rules) = 'array';

-- Step 5: Verify what we have now
SELECT 
  id,
  name,
  rules,
  rule_groups,
  CASE 
    WHEN rule_groups IS NULL THEN 'NULL'
    WHEN rule_groups = '[]'::jsonb THEN 'EMPTY ARRAY'
    ELSE 'HAS GROUPS'
  END as migration_status
FROM strategies 
ORDER BY created_at DESC;