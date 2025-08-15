#!/bin/bash

# Test script for the new Extreme Indicator webhook format
# This script sends test webhooks to verify the complete flow works

echo "🧪 Testing Extreme Indicator Webhook Integration"
echo "==============================================="

# Backend URL (change for production)
BACKEND_URL="http://localhost:3001"

# Test webhook data in the new format
echo "📡 Sending test webhook with new Extreme format..."

# Test 1: Premium Zone with all indicators
echo "Test 1: Premium Zone with comprehensive indicators"
curl -X POST "${BACKEND_URL}/webhook" \
  -H "Content-Type: text/plain" \
  -d "BTC|15m|Extreme|Premium Zone Touch | VWAP: 0.75% | RSI: 68.5 (OB) | ADX: 32.1 (Strong Bullish) | HTF: Reversal Bullish"

echo -e "\n"

# Test 2: Discount Zone with different values
echo "Test 2: Discount Zone with bearish indicators"
curl -X POST "${BACKEND_URL}/webhook" \
  -H "Content-Type: text/plain" \
  -d "ETH|15m|Extreme|Discount Zone | VWAP: -2.15% | RSI: 28.3 (OS) | ADX: 18.7 (Weak Bearish) | HTF: Continuation Bearish"

echo -e "\n"

# Test 3: Equilibrium Zone with neutral values
echo "Test 3: Equilibrium Zone with neutral indicators"
curl -X POST "${BACKEND_URL}/webhook" \
  -H "Content-Type: text/plain" \
  -d "SOL|15m|Extreme|Equilibrium Zone | VWAP: 0.05% | RSI: 52.1 (Neutral) | ADX: 25.0 (Strong Neutral) | HTF: Ranging"

echo -e "\n"

# Wait a moment for processing
echo "⏳ Waiting for processing..."
sleep 2

# Check if indicators were stored
echo "📊 Checking stored indicator values..."

echo "BTC indicators:"
curl -s "${BACKEND_URL}/api/ticker-indicators/BTC" | jq '.'

echo -e "\nETH indicators:"
curl -s "${BACKEND_URL}/api/ticker-indicators/ETH" | jq '.'

echo -e "\nSOL indicators:"
curl -s "${BACKEND_URL}/api/ticker-indicators/SOL" | jq '.'

echo -e "\n✅ Test complete! Check the output above to verify:"
echo "1. Webhook processing succeeded"
echo "2. Indicator values were parsed correctly"
echo "3. Database was updated with latest values"
echo "4. Frontend will now show real-time indicator data"

echo -e "\n🎯 Next steps:"
echo "• Open frontend dashboard to see live indicator tags"
echo "• Send more Extreme alerts to see real-time updates"
echo "• Verify indicators update automatically every 5 seconds"