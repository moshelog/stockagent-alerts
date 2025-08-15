#!/bin/bash

echo "🔍 Testing StockAgent Extreme Indicators System"
echo "=============================================="

# Test 1: Send webhook
echo "1. Testing webhook processing..."
WEBHOOK_RESPONSE=$(curl -s -X POST "https://api.stockagent.app/webhook" \
  -H "Content-Type: text/plain" \
  -d "TEST | 100.0 | 5M | Extreme | Premium Zone | VWAP: 1.5% | RSI: 75.2 (OB) | ADX: 28.5 (Strong Bullish) | HTF: Reversal Signal")

echo "   Webhook response: $WEBHOOK_RESPONSE"

# Test 2: Check public endpoint
echo "2. Testing public ticker-indicators endpoint..."
sleep 2
PUBLIC_RESPONSE=$(curl -s "https://api.stockagent.app/ticker-indicators" || echo "ENDPOINT_NOT_FOUND")
echo "   Public endpoint response: $PUBLIC_RESPONSE"

# Test 3: Check specific ticker
echo "3. Testing specific ticker endpoint..."
TICKER_RESPONSE=$(curl -s "https://api.stockagent.app/ticker-indicators/TEST" || echo "ENDPOINT_NOT_FOUND")
echo "   Ticker endpoint response: $TICKER_RESPONSE"

# Test 4: Check if old API endpoint works (with auth)
echo "4. Testing protected API endpoint..."
API_RESPONSE=$(curl -s "https://api.stockagent.app/api/ticker-indicators" || echo "AUTH_ERROR")
echo "   Protected API response: $API_RESPONSE"

echo ""
echo "📊 System Status Summary:"
if [[ $WEBHOOK_RESPONSE == *"success"* ]]; then
  echo "   ✅ Webhook processing: WORKING"
else
  echo "   ❌ Webhook processing: FAILED"
fi

if [[ $PUBLIC_RESPONSE == "ENDPOINT_NOT_FOUND" ]] || [[ $PUBLIC_RESPONSE == *"Cannot GET"* ]]; then
  echo "   ❌ Public endpoint: NOT DEPLOYED"
else
  echo "   ✅ Public endpoint: WORKING"
fi

if [[ $API_RESPONSE == *"Unauthorized"* ]]; then
  echo "   ⚠️  Protected API: Authentication blocking (expected)"
else
  echo "   ❓ Protected API: Unexpected response"
fi

echo ""
echo "🎯 Next Steps:"
if [[ $PUBLIC_RESPONSE == "ENDPOINT_NOT_FOUND" ]] || [[ $PUBLIC_RESPONSE == *"Cannot GET"* ]]; then
  echo "   • Backend deployment incomplete - public endpoints missing"
  echo "   • Need to verify server.js changes deployed correctly"
  echo "   • May need manual Railway service restart"
else
  echo "   • System should be working end-to-end"
  echo "   • Frontend should now display real-time indicator values"
fi