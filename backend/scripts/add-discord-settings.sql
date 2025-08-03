-- Add Discord notification columns to user_settings table
-- Run this in your Supabase SQL editor

-- Add Discord webhook URL column
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS discord_webhook_url text;

-- Add Discord message template column
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS discord_message_template jsonb DEFAULT '{
  "showTimestamp": true,
  "showTicker": true,
  "showStrategy": true,
  "showTriggers": true,
  "showScore": true,
  "format": "detailed"
}'::jsonb;

-- Add Discord enabled flag
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS discord_enabled boolean DEFAULT true;

-- Ensure default user exists
INSERT INTO user_settings (user_id)
VALUES ('default')
ON CONFLICT (user_id) DO NOTHING;