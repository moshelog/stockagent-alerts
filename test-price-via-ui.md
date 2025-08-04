# Test Price Field via Settings Page

Since the direct webhook is having issues with time format, let's test using the built-in webhook tester from the Settings page.

## Test Steps:

### 1. Go to Settings Page
Navigate to: https://stockagent-alerts-production.up.railway.app/settings

### 2. Use the Webhook Tester
In the "Webhook Configuration" section, use the webhook tester with these test payloads:

#### Test 1: With Price (New Format)
```
BTCUSDT.P|98765.50|15|SMC|Bullish OB Break
```

#### Test 2: Without Price (Legacy Format)
```
ETHUSDT.P|15|Oscillator|Buy Signal
```

#### Test 3: With Dollar Sign Price
```
SOLUSDT.P|$234.56|5|Wave|Sell+
```

#### Test 4: Decimal Price
```
XRPUSDT.P|0.5678|15|Extreme|Discount Zone
```

### 3. Send Each Test
1. Paste each payload into the webhook tester
2. Click "Send Test Webhook"
3. You should see a success message

### 4. Verify in Recent Alerts
Go back to the main dashboard: https://stockagent-alerts-production.up.railway.app

Check the "Recent Alerts" table - you should see:
- **BTCUSDT.P**: Price column shows `$98,766`
- **ETHUSDT.P**: Price column shows `—` (no price)
- **SOLUSDT.P**: Price column shows `$235`
- **XRPUSDT.P**: Price column shows `$0.5678`

### 5. Check Database Directly
To verify the data is saved in Supabase:
1. Go to your Supabase dashboard
2. Navigate to Table Editor → alerts table
3. Sort by created_at DESC
4. Verify the price column has the correct values

## Expected Results:

✅ **Price Parsing**: Webhooks with price should parse and save the price value
✅ **Price Display**: Frontend should show formatted prices (e.g., $98,766)
✅ **Legacy Support**: Webhooks without price should still work (price = null)
✅ **Column Position**: Price appears between Ticker and Timeframe columns

## Troubleshooting:

If prices aren't showing:
1. Check browser console for errors
2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Verify the database migration was run (price column exists)
4. Check that the backend is deployed with latest code