#!/bin/bash

echo "🧪 Testing IBIT Volume Webhook..."
echo ""

# Test with IBIT and volume data to see if it works
WEBHOOK_DATA="IBIT | 66.58 | 5M | Extreme | Discount Zone Wick Reversal | VWAP: -0.30% | RSI: 47 (NEUTRAL) | ADX: 25.7 (Strong Bearish) | HTF: Reversal Bullish | Vol: 150.5K (+22%) HIGH"

echo "📨 Sending IBIT webhook with volume data:"
echo "$WEBHOOK_DATA"
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
echo "🔍 Checking IBIT volume data..."
curl "https://api.stockagent.app/ticker-indicators" 2>/dev/null | \
  jq '.[] | select(.ticker=="IBIT") | {ticker, volume_amount, volume_change, volume_level, updated_at}' | \
  head -10

echo ""
echo "✅ Test completed!"