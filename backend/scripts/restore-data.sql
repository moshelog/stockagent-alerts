-- Restore StockAgent Database Data Only
-- Run this in your Supabase SQL editor to restore missing available_alerts data

-- Insert available alerts (this is what's missing from your application)
INSERT INTO available_alerts (indicator, trigger, weight, enabled) VALUES
-- Nautilus alerts
('Nautilus™', 'Normal Bearish Divergence', -2.5, true),
('Nautilus™', 'Normal Bullish Divergence', 2.3, true),
('Nautilus™', 'Hidden Bearish Divergence', -2.8, true),
('Nautilus™', 'Hidden Bullish Divergence', 2.6, true),
('Nautilus™', 'Multiple Bullish Divergence', 3.2, true),
('Nautilus™', 'Multiple Bearish Divergence', -3.0, true),
('Nautilus™', 'Bullish DipX', 2.1, true),
('Nautilus™', 'Bearish DipX', -2.0, true),
('Nautilus™', 'Buy Signal', 2.4, true),
('Nautilus™', 'Sell Signal', -2.2, true),
('Nautilus™', 'Oscillator Oversold', 1.8, true),
('Nautilus™', 'Oscillator Overbought', -1.9, true),
('Nautilus™', 'Bullish Volume Cross', 1.5, true),
('Nautilus™', 'Bearish Volume Cross', -1.4, true),
('Nautilus™', 'Bullish Peak', 2.0, true),
('Nautilus™', 'Bearish Peak', -2.1, true),

-- Market Core Pro alerts
('Market Core Pro™', 'Bullish OB Break', 2.2, true),
('Market Core Pro™', 'Bearish OB Break', -2.0, true),
('Market Core Pro™', 'Touching Bearish OB', -1.5, true),
('Market Core Pro™', 'Touching Bullish OB', 1.6, true),
('Market Core Pro™', 'Bullish BoS', 2.1, true),
('Market Core Pro™', 'Bearish BoS', -1.9, true),
('Market Core Pro™', 'Bullish ChoCH', 1.8, true),
('Market Core Pro™', 'Bearish ChoCH', -1.7, true),
('Market Core Pro™', 'Bullish FVG Created', 1.4, true),
('Market Core Pro™', 'Bearish FVG Created', -1.3, true),
('Market Core Pro™', 'Bullish FVG Break', 2.0, true),
('Market Core Pro™', 'Bearish FVG Break', -1.8, true),

-- Market Waves Pro alerts
('Market Waves Pro™', 'Buy', 2.5, true),
('Market Waves Pro™', 'Buy+', 3.0, true),
('Market Waves Pro™', 'Any Buy', 2.2, true),
('Market Waves Pro™', 'Sell', -2.3, true),
('Market Waves Pro™', 'Sell+', -2.8, true),
('Market Waves Pro™', 'Any Sell', -2.0, true),
('Market Waves Pro™', 'Bullish FlowTrend', 2.2, true),
('Market Waves Pro™', 'Bearish FlowTrend', -2.0, true),

-- Extreme Zones alerts
('Extreme Zones', 'Premium Zone', -1.8, true),
('Extreme Zones', 'Discount Zone', 1.9, true),
('Extreme Zones', 'Equilibrium Zone', 0.0, true)

ON CONFLICT (indicator, trigger) DO NOTHING;

-- Insert default strategies if they don't exist
INSERT INTO strategies (name, timeframe, rules, threshold, enabled) VALUES
(
  'Buy on discount zone',
  15,
  '[{"indicator": "Extreme Zones", "trigger": "Discount Zone"}, {"indicator": "Nautilus™", "trigger": "Normal Bullish Divergence"}]',
  3.0,
  true
),
(
  'Sell on Premium zone',
  15,
  '[{"indicator": "Extreme Zones", "trigger": "Premium Zone"}, {"indicator": "Nautilus™", "trigger": "Normal Bearish Divergence"}]',
  -4.0,
  true
)
ON CONFLICT DO NOTHING;

-- Verify data was inserted
SELECT 'Available Alerts Count:' as info, COUNT(*) as count FROM available_alerts
UNION ALL
SELECT 'Strategies Count:' as info, COUNT(*) as count FROM strategies;