-- SQL queries to check if ticker_indicators table was created and populated

-- 1. Check if the table exists
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ticker_indicators'
ORDER BY ordinal_position;

-- 2. Check table structure and constraints
SELECT 
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.column_default,
    c.is_nullable,
    tc.constraint_type
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu 
    ON c.table_name = kcu.table_name 
    AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc 
    ON kcu.constraint_name = tc.constraint_name
WHERE c.table_name = 'ticker_indicators'
ORDER BY c.ordinal_position;

-- 3. Check if any data exists in the table
SELECT COUNT(*) as total_records FROM ticker_indicators;

-- 4. Show all stored indicator data (if any)
SELECT 
    ticker,
    vwap_value,
    rsi_value,
    rsi_status,
    adx_value,
    adx_strength,
    adx_direction,
    htf_status,
    updated_at,
    created_at
FROM ticker_indicators 
ORDER BY updated_at DESC
LIMIT 10;

-- 5. Check for specific test tickers we sent
SELECT * FROM ticker_indicators 
WHERE ticker IN ('BTCUSDT.P', 'TEST', 'TESTCOIN')
ORDER BY updated_at DESC;

-- 6. Show latest indicators for each ticker
SELECT 
    ticker,
    CONCAT('VWAP: ', COALESCE(vwap_value::text, 'NULL'), '%') as vwap,
    CONCAT('RSI: ', COALESCE(rsi_value::text, 'NULL'), ' (', COALESCE(rsi_status, 'NULL'), ')') as rsi,
    CONCAT('ADX: ', COALESCE(adx_value::text, 'NULL'), ' (', COALESCE(adx_strength, 'NULL'), ' ', COALESCE(adx_direction, 'NULL'), ')') as adx,
    CONCAT('HTF: ', COALESCE(htf_status, 'NULL')) as htf,
    updated_at
FROM ticker_indicators 
ORDER BY updated_at DESC;