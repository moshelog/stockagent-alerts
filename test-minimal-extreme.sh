#!/bin/bash

echo "🧪 Testing minimal Extreme webhook..."
echo ""

# Simplest possible Extreme webhook with volume
WEBHOOK_DATA="TEST | 100 | 5M | Extreme | Vol: 1.0K (+10%)"

echo "📨 Sending minimal webhook:"
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
echo "🔍 Checking TEST ticker data:"
curl "https://api.stockagent.app/ticker-indicators" 2>/dev/null | \
  jq '.[] | select(.ticker=="TEST") | {ticker, volume_amount, volume_change, volume_level, updated_at}' | \
  head -5

echo ""
echo "✅ Test completed!"