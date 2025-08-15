#!/bin/bash

echo "🧪 Testing specific ticker with unique volume data..."
echo ""

# Test with a brand new ticker to avoid any caching issues
WEBHOOK_DATA="TESTVOLUME | 100.00 | 5M | Extreme | Test Alert | Vol: 999.9K (+77%) ULTRA"

echo "📨 Sending test webhook:"
echo "$WEBHOOK_DATA"
echo ""

curl -X POST "https://api.stockagent.app/webhook" \
  -H "Content-Type: text/plain" \
  -d "$WEBHOOK_DATA" \
  -w "\n🎯 HTTP Status: %{http_code}\n" \
  -s

echo ""
echo "⏳ Waiting 3 seconds for processing..."
sleep 3

echo ""
echo "🔍 Checking TESTVOLUME ticker data:"
curl "https://api.stockagent.app/ticker-indicators" 2>/dev/null | \
  jq '.[] | select(.ticker=="TESTVOLUME") | {ticker, volume_amount, volume_change, volume_level, updated_at}' | \
  head -10

echo ""
echo "✅ Test completed!"