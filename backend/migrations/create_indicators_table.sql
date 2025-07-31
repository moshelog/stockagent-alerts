-- Create indicators table to manage indicator information
CREATE TABLE IF NOT EXISTS indicators (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add trigger for updated_at
CREATE TRIGGER update_indicators_updated_at BEFORE UPDATE ON indicators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert existing indicators
INSERT INTO indicators (name, display_name, description, category, enabled) VALUES
('nautilus', 'Nautilus™', 'Advanced oscillator with divergence detection and volume analysis', 'oscillator', true),
('market_core', 'Market Core Pro™', 'Smart Money Concepts (SMC) with order blocks, FVG, and structure breaks', 'smc', true),
('market_waves', 'Market Waves Pro™', 'Trend analysis with flow detection and wave patterns', 'trend', true),
('extreme_zones', 'Extreme Zones', 'Premium, discount, and equilibrium zone analysis', 'zones', true)
ON CONFLICT (name) DO NOTHING;

-- Add indicator_id reference to available_alerts (optional, for future use)
ALTER TABLE available_alerts 
ADD COLUMN IF NOT EXISTS indicator_id uuid REFERENCES indicators(id);

-- Update available_alerts with indicator_id references
UPDATE available_alerts SET indicator_id = (
  SELECT id FROM indicators WHERE 
    (indicators.display_name = available_alerts.indicator) OR
    (indicators.name = LOWER(REPLACE(REPLACE(available_alerts.indicator, '™', ''), ' ', '_')))
);