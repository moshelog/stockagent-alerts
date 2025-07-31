-- Add tooltip field to available_alerts table
ALTER TABLE available_alerts 
ADD COLUMN IF NOT EXISTS tooltip text;

-- Update existing alerts with tooltip values
UPDATE available_alerts SET tooltip = 
CASE 
  -- Oscillator Alerts (Nautilus™)
  WHEN indicator = 'Nautilus™' AND trigger = 'Bullish Peak' THEN 'Signals a momentum low or exhaustion at the bottom — potential for an upward move (bullish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Bearish Peak' THEN 'Signals a momentum high or exhaustion at the top — potential for a downward move (bearish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Bullish DipX' THEN 'Diamond below oscillator — indicates oversold conditions and a possible bullish reversal (bullish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Bearish DipX' THEN 'Diamond above oscillator — indicates overbought conditions and a possible bearish reversal (bearish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Normal Bullish Divergence' THEN 'Oscillator forms higher low while price makes lower low — potential for bullish reversal (bullish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Normal Bearish Divergence' THEN 'Oscillator forms lower high while price makes higher high — potential for bearish reversal (bearish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Hidden Bullish Divergence' THEN 'Oscillator makes higher low while price makes higher low — suggests uptrend continuation (bullish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Hidden Bearish Divergence' THEN 'Oscillator makes lower high while price makes lower high — suggests downtrend continuation (bearish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Oscillator Overbought' THEN 'Oscillator reaches overbought zone — warns of possible exhaustion or start of a drop (bearish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Oscillator Oversold' THEN 'Oscillator reaches oversold zone — warns of possible exhaustion or start of a bounce (bullish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Buy Signal' THEN 'Green triple lines below oscillator — signals potential buying opportunity (bullish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Sell Signal' THEN 'Red triple lines above oscillator — signals potential selling opportunity (bearish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Bullish Volume Cross' THEN 'Bullish volume overtakes bearish — shift toward buying pressure (bullish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Bearish Volume Cross' THEN 'Bearish volume overtakes bullish — shift toward selling pressure (bearish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Multiple Bullish Divergence' THEN 'Multiple bullish divergence signals detected — strong bullish reversal potential (bullish).'
  WHEN indicator = 'Nautilus™' AND trigger = 'Multiple Bearish Divergence' THEN 'Multiple bearish divergence signals detected — strong bearish reversal potential (bearish).'
  
  -- SMC Alerts (Market Core Pro™)
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Bullish FVG Created' THEN 'A new bullish fair value gap is formed — marks a price imbalance likely to attract buyers (bullish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Bearish FVG Created' THEN 'A new bearish fair value gap is formed — marks a price imbalance likely to attract sellers (bearish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Bullish FVG Break' THEN 'Price breaks above a bullish fair value gap — signals confirmation of upward momentum (bullish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Bearish FVG Break' THEN 'Price breaks below a bearish fair value gap — signals confirmation of downward momentum (bearish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Touching Bullish OB' THEN 'Price touches a bullish order block — potential support zone and possible upward bounce (bullish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Touching Bearish OB' THEN 'Price touches a bearish order block — potential resistance zone and possible downward rejection (bearish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Bullish OB Break' THEN 'Price breaks above a bullish order block — confirms buyer strength, supporting a move up (bullish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Bearish OB Break' THEN 'Price breaks below a bearish order block — confirms seller strength, supporting a move down (bearish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Bullish BoS' THEN 'Price breaks the previous high — confirms a bullish trend continuation (bullish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Bearish BoS' THEN 'Price breaks the previous low — confirms a bearish trend continuation (bearish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Bullish ChoCH' THEN 'A key level breaks upward, signaling a potential bullish trend reversal (bullish).'
  WHEN indicator = 'Market Core Pro™' AND trigger = 'Bearish ChoCH' THEN 'A key level breaks downward, signaling a potential bearish trend reversal (bearish).'
  
  -- Market Waves Pro™ Alerts
  WHEN indicator = 'Market Waves Pro™' AND trigger = 'Buy' THEN 'Buy signal detected — indicates potential upward price movement (bullish).'
  WHEN indicator = 'Market Waves Pro™' AND trigger = 'Buy+' THEN 'Strong buy signal detected — indicates high confidence upward price movement (bullish).'
  WHEN indicator = 'Market Waves Pro™' AND trigger = 'Any Buy' THEN 'General buy signal detected — indicates potential buying opportunity (bullish).'
  WHEN indicator = 'Market Waves Pro™' AND trigger = 'Sell' THEN 'Sell signal detected — indicates potential downward price movement (bearish).'
  WHEN indicator = 'Market Waves Pro™' AND trigger = 'Sell+' THEN 'Strong sell signal detected — indicates high confidence downward price movement (bearish).'
  WHEN indicator = 'Market Waves Pro™' AND trigger = 'Any Sell' THEN 'General sell signal detected — indicates potential selling opportunity (bearish).'
  WHEN indicator = 'Market Waves Pro™' AND trigger = 'Bullish FlowTrend' THEN 'Bullish trend flow detected — suggests sustained upward momentum (bullish).'
  WHEN indicator = 'Market Waves Pro™' AND trigger = 'Bearish FlowTrend' THEN 'Bearish trend flow detected — suggests sustained downward momentum (bearish).'
  
  -- Extreme Zones Alerts
  WHEN indicator = 'Extreme Zones' AND trigger = 'Premium Zone' THEN 'Price is in premium zone — potential area for selling or shorting (bearish).'
  WHEN indicator = 'Extreme Zones' AND trigger = 'Discount Zone' THEN 'Price is in discount zone — potential area for buying (bullish).'
  WHEN indicator = 'Extreme Zones' AND trigger = 'Equilibrium Zone' THEN 'Price is in equilibrium zone — neutral area with balanced forces (neutral).'
  
  ELSE 'Alert trigger for ' || indicator
END
WHERE tooltip IS NULL;