#!/bin/bash

# Test webhook with a fresh ticker to avoid any caching issues

echo "🧪 Testing Volume Webhook with Fresh Ticker..."

# Use TESTTICKER to avoid any existing data conflicts
WEBHOOK_DATA="TESTTICKER | 100.00 | 5M | Extreme | RSI: Bearish | VWAP: -0.32% | RSI: 44.5 (BEAR) | ADX: 18.3 (Weak Bearish) | HTF: Reversal Bullish | Vol: 20.49K (-48%)"

echo "📨 Sending webhook: $WEBHOOK_DATA"
echo ""

curl -X POST "https://api.stockagent.app/webhook" \
  -H "Content-Type: text/plain" \
  -d "$WEBHOOK_DATA" \
  -w "\n🎯 HTTP Status: %{http_code}\n" \
  -s

echo ""
echo "⏳ Waiting 5 seconds for processing..."
sleep 5

echo ""
echo "🔍 Checking if TESTTICKER volume data was saved..."
curl "https://api.stockagent.app/ticker-indicators" 2>/dev/null | \
  jq '.[] | select(.ticker=="TESTTICKER") | {ticker, volume_amount, volume_change, volume_level, updated_at}'

echo ""
echo "✅ Fresh ticker test completed!"