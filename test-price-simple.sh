#!/bin/bash

# Simple test script for price field
echo "🧪 Testing Price Field Implementation"
echo "===================================="

# Test 1: With price (new format)
echo -e "\n📤 Test 1: Webhook with price..."
curl -X POST https://api.stockagent.app/webhook \
  -H "Content-Type: text/plain" \
  -d "BTCUSDT.P|98765.50|15m|SMC|Bullish OB Break" \
  -w "\nStatus: %{http_code}\n"

sleep 2

# Test 2: Without price (legacy format)
echo -e "\n📤 Test 2: Webhook without price (legacy)..."
curl -X POST https://api.stockagent.app/webhook \
  -H "Content-Type: text/plain" \
  -d "ETHUSDT.P|15m|Oscillator|Buy Signal" \
  -w "\nStatus: %{http_code}\n"

sleep 2

# Test 3: With price including dollar sign
echo -e "\n📤 Test 3: Webhook with $ price..."
curl -X POST https://api.stockagent.app/webhook \
  -H "Content-Type: text/plain" \
  -d "SOLUSDT.P|\$234.56|5m|Wave|Sell+" \
  -w "\nStatus: %{http_code}\n"

sleep 2

# Test 4: Price with many decimals
echo -e "\n📤 Test 4: Webhook with decimal price..."
curl -X POST https://api.stockagent.app/webhook \
  -H "Content-Type: text/plain" \
  -d "XRPUSDT.P|0.5678|15m|Extreme|Discount Zone" \
  -w "\nStatus: %{http_code}\n"

echo -e "\n\n✅ Tests sent!"
echo "📌 Next steps:"
echo "1. Go to https://stockagent-alerts-production.up.railway.app"
echo "2. Check the Recent Alerts table"
echo "3. Verify price column shows:"
echo "   - BTCUSDT.P → \$98,766"
echo "   - ETHUSDT.P → —"
echo "   - SOLUSDT.P → \$235"
echo "   - XRPUSDT.P → \$0.5678"