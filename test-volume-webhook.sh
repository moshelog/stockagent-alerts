#!/bin/bash

# Test webhook with the exact format from your notification
# This tests the complete webhook processing pipeline

echo "🧪 Testing Volume Webhook Processing..."
echo "📨 Sending webhook with volume data: Vol: 20.49K (-48%)"
echo ""

# The exact webhook format from your notification
WEBHOOK_DATA="AAPL | 231.09 | 5M | Extreme | RSI: Bearish | VWAP: -0.32% | RSI: 44.5 (BEAR) | ADX: 18.3 (Weak Bearish) | HTF: Reversal Bullish | Vol: 20.49K (-48%)"

echo "📡 Sending to production webhook endpoint..."
curl -X POST "https://api.stockagent.app/webhook" \
  -H "Content-Type: text/plain" \
  -d "$WEBHOOK_DATA" \
  -w "\n🎯 HTTP Status: %{http_code}\n" \
  -s

echo ""
echo "⏳ Waiting 3 seconds for processing..."
sleep 3

echo ""
echo "🔍 Checking if volume data was saved..."
curl "https://api.stockagent.app/ticker-indicators" 2>/dev/null | \
  jq '.[] | select(.ticker=="AAPL") | {ticker, volume_amount, volume_change, volume_level, updated_at}' | \
  head -10

echo ""
echo "✅ Test completed!"