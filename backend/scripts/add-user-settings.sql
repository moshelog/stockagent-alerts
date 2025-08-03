-- Add user_settings table for storing notification preferences
-- Run this in your Supabase SQL editor

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL DEFAULT 'default', -- For future multi-user support
  telegram_bot_token text,
  telegram_chat_id text,
  telegram_message_template jsonb DEFAULT '{
    "showTimestamp": true,
    "showTicker": true,
    "showStrategy": true,
    "showTriggers": true,
    "showScore": true,
    "format": "detailed"
  }'::jsonb,
  telegram_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create or update the default user settings
INSERT INTO user_settings (user_id)
VALUES ('default')
ON CONFLICT (user_id) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE
    ON user_settings FOR EACH ROW EXECUTE PROCEDURE 
    update_updated_at_column();