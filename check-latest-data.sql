-- Check if the debugging webhook stored any data
SELECT * FROM ticker_indicators 
WHERE ticker = 'BTCUSDT.P' 
ORDER BY updated_at DESC 
LIMIT 1;