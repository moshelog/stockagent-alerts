-- Create user_settings table for storing UI preferences and configuration
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY DEFAULT 1, -- Single row for settings
  ui JSONB DEFAULT '{"showAlertsTable": true, "showScoreMeter": true, "showStrategyPanel": true, "showWeights": true}'::jsonb,
  scoring JSONB DEFAULT '{"timeWindowMinutes": 60}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE
    ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings if not exists
INSERT INTO user_settings (id, ui, scoring)
VALUES (
  1,
  '{"showAlertsTable": true, "showScoreMeter": true, "showStrategyPanel": true, "showWeights": true}'::jsonb,
  '{"timeWindowMinutes": 60}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions (adjust RLS policies as needed)
GRANT ALL ON user_settings TO authenticated;
GRANT ALL ON user_settings TO anon;