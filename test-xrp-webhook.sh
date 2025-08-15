#!/bin/bash

echo "🧪 Testing XRPUSDT.P Volume Webhook (Exact Format)..."
echo ""

# Use exact format from the TradingView notification  
WEBHOOK_DATA="XRPUSDT.P | 3.0379 | 5M | Extreme | RSI: Neutral | VWAP: -1.49% | RSI: 50.3 (NEUTRAL) | ADX: 33.7 (Strong Bearish) | HTF: No Synergy | Vol: 3.37M (-43%)"

echo "📨 Sending exact webhook format:"
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
echo "🔍 Checking XRPUSDT.P volume data..."
curl "https://api.stockagent.app/ticker-indicators" 2>/dev/null | \
  jq '.[] | select(.ticker=="XRPUSDT.P") | {ticker, volume_amount, volume_change, volume_level, vwap_value, rsi_value, updated_at}' | \
  head -15

echo ""
echo "✅ Test completed!"