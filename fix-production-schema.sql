-- Fix production database schema to match reverted code
-- Run this in your Supabase SQL editor

-- Remove the action column that was added during buy/sell modifications
ALTER TABLE strategies DROP COLUMN IF EXISTS action;

-- Ensure the original schema is intact
-- No need to recreate - just make sure we don't have conflicting columns