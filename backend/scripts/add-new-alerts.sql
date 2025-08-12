-- Add new SMC and Waves alerts to available_alerts table
-- Run this in Supabase SQL editor

-- SMC (Market Core Pro™) alerts
INSERT INTO available_alerts (indicator, trigger, weight, enabled, tooltip) VALUES
('Market Core Pro™', 'Bearish Liquidity Grab Created', -1, true, 'A bearish liquidity grab has been created - potential selling opportunity'),
('Market Core Pro™', 'Bullish Liquidity Grab Created', 1, true, 'A bullish liquidity grab has been created - potential buying opportunity'),
('Market Core Pro™', 'Support Level Break', -1, true, 'Support level has been broken - bearish signal indicating potential downward move'),
('Market Core Pro™', 'Resistance Level Break', 1, true, 'Resistance level has been broken - bullish signal indicating potential upward move')
ON CONFLICT (indicator, trigger) DO NOTHING;

-- Waves (Market Waves Pro™) alerts  
INSERT INTO available_alerts (indicator, trigger, weight, enabled, tooltip) VALUES
('Market Waves Pro™', 'FlowTrend Bearish Retest', -1, true, 'FlowTrend bearish retest detected - potential continuation of downtrend'),
('Market Waves Pro™', 'FlowTrend Bullish Retest', 1, true, 'FlowTrend bullish retest detected - potential continuation of uptrend'),
('Market Waves Pro™', 'Bullish TrendMagnet Signal', 1, true, 'TrendMagnet bullish signal detected - strong upward momentum indicated'),
('Market Waves Pro™', 'Bearish TrendMagnet Signal', -1, true, 'TrendMagnet bearish signal detected - strong downward momentum indicated')
ON CONFLICT (indicator, trigger) DO NOTHING;

-- Verify the new alerts were added
SELECT indicator, trigger, weight, enabled 
FROM available_alerts 
WHERE trigger IN (
    'Bearish Liquidity Grab Created',
    'Bullish Liquidity Grab Created', 
    'Support Level Break',
    'Resistance Level Break',
    'FlowTrend Bearish Retest',
    'FlowTrend Bullish Retest',
    'Bullish TrendMagnet Signal',
    'Bearish TrendMagnet Signal'
)
ORDER BY indicator, trigger;