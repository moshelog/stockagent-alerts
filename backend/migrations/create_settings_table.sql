-- Create settings table for storing user preferences
CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    settings JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Insert default settings for the 'default' user
INSERT INTO settings (user_id, settings) 
VALUES (
    'default',
    '{
        "ui": {
            "showAlertsTable": true,
            "showScoreMeter": true,
            "showStrategyPanel": true,
            "showWeights": true
        },
        "scoring": {
            "timeWindowMinutes": 60
        }
    }'::jsonb
) 
ON CONFLICT (user_id) DO NOTHING;