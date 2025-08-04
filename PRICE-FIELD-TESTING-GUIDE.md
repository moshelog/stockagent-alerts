# 📊 Complete Price Field Testing Guide

## ✅ Confirmed Working Format

Based on production logs, this webhook format works:
```
TICKER|PRICE|TIMEFRAME|INDICATOR|TRIGGER
```

Example that successfully saved:
```
XRPUSDT.P|2.1234|15|Extreme|Discount Zone
```

## 🧪 Testing Methods

### Method 1: Direct Webhook Test (Recommended)

Use these exact curl commands that match the working format:

```bash
# Test 1: With price - Extreme indicator (WORKS)
curl -X POST https://api.stockagent.app/webhook \
  -H "Content-Type: text/plain" \
  -d "BTCUSDT.P|98765.50|15|Extreme|Premium Zone"

# Test 2: With price - SMC indicator  
curl -X POST https://api.stockagent.app/webhook \
  -H "Content-Type: text/plain" \
  -d "ETHUSDT.P|3456.78|30|SMC|Bullish OB Break"

# Test 3: Without price - Legacy format
curl -X POST https://api.stockagent.app/webhook \
  -H "Content-Type: text/plain" \
  -d "SOLUSDT.P|15|Oscillator|Buy Signal"

# Test 4: With dollar sign price
curl -X POST https://api.stockagent.app/webhook \
  -H "Content-Type: text/plain" \
  -d "ADAUSDT.P|\$0.5678|5|Wave|Sell+"
```

### Method 2: Via Settings Page UI

1. Go to: https://stockagent-alerts-production.up.railway.app/settings
2. Find "Test Webhook Configuration" section
3. Use these test payloads:
   - `BTCUSDT.P|98765.50|15|Extreme|Premium Zone`
   - `ETHUSDT.P|3456.78|30|SMC|Bullish OB Break`
   - `SOLUSDT.P|15|Oscillator|Buy Signal`

### Method 3: TradingView Alert Format

For real TradingView alerts, use this format:
```
{{ticker}}|{{close}}|{{interval}}|Extreme|Premium Zone
```

## 🔍 Verification Steps

### 1. Check Frontend Display
- Go to: https://stockagent-alerts-production.up.railway.app
- Look at "Recent Alerts" table
- Verify price column shows between Ticker and Timeframe
- Prices should display as:
  - `$98,766` (with comma formatting)
  - `$3,457`
  - `—` (dash for no price)

### 2. Check Supabase Database
1. Go to your Supabase dashboard
2. Navigate to Table Editor → `alerts` table
3. Sort by `created_at DESC`
4. Check the `price` column has values:
   - BTCUSDT.P → 98765.50
   - ETHUSDT.P → 3456.78
   - SOLUSDT.P → NULL

### 3. Check API Response
```bash
# Note: This requires authentication
curl https://api.stockagent.app/api/alerts?limit=5
```

## 🐛 Troubleshooting

### "Invalid time value" Error
- The webhook parser has complex logic for different formats
- Use the exact formats shown above
- Don't include time field unless using legacy 5-part format

### Price Not Showing
1. Verify database migration was run (price column exists)
2. Check webhook format matches examples above
3. Hard refresh browser (Ctrl+Shift+R)
4. Check browser console for errors

### Webhook Format Rules
- **With Price**: `TICKER|PRICE|TIMEFRAME|INDICATOR|TRIGGER`
- **Without Price**: `TICKER|TIMEFRAME|INDICATOR|TRIGGER`
- Price can include `$` and commas - they'll be stripped
- Timeframe can be: `15`, `30`, `1H`, etc.

## ✅ Expected Results

1. **Database**: Price values saved as decimal numbers
2. **Frontend**: Prices formatted with $ and commas
3. **Legacy Support**: Webhooks without price still work
4. **Column Position**: Price appears between Ticker and Timeframe

## 🚀 Quick Test

Run this single command to test:
```bash
curl -X POST https://api.stockagent.app/webhook \
  -H "Content-Type: text/plain" \
  -d "TESTUSDT.P|12345.67|15|Extreme|Discount Zone" \
  && echo " ✅ Sent! Check https://stockagent-alerts-production.up.railway.app"
```

Then check the frontend - you should see TESTUSDT.P with price $12,346 in the Recent Alerts!