// Verify the parsing fix works correctly

const testWebhook = "TESTTICKER | 100.00 | 5M | Extreme | RSI: Bearish | VWAP: -0.32% | RSI: 44.5 (BEAR) | ADX: 18.3 (Weak Bearish) | HTF: Reversal Bullish | Vol: 20.49K (-48%)";

console.log('🧪 Testing Webhook Parsing Fix');
console.log('📨 Original webhook:', testWebhook);
console.log('');

// Simulate the parsing logic
const parts = testWebhook.split('|').map(part => part.trim());
console.log('📋 Split parts:', parts);
console.log('📊 Parts count:', parts.length);

// Check if second part is numeric (price-first format)
const secondPart = parts[1] || '';
const isSecondPartNumeric = /^\d+\.?\d*$/.test(secondPart);
console.log('💰 Second part numeric:', isSecondPartNumeric, '(value:', secondPart + ')');

let ticker, timeframe, indicator, trigger;

if (isSecondPartNumeric && parts.length >= 5) {
  // User format: TICKER|PRICE|TIMEFRAME|INDICATOR|TRIGGER (and potentially more parts)
  ticker = parts[0];
  timeframe = parts[2];
  indicator = parts[3];
  // Join all remaining parts as trigger to handle multi-part triggers with volume data
  trigger = parts.slice(4).join(' | ');
} else {
  // Standard format: TICKER|TIMEFRAME|INDICATOR|TRIGGER (and potentially more parts)
  ticker = parts[0];
  timeframe = parts[1];
  indicator = parts[2];
  // Join all remaining parts as trigger to handle multi-part triggers with volume data
  trigger = parts.slice(3).join(' | ');
}

console.log('');
console.log('🎯 Parsed result:');
console.log('  Ticker:', ticker);
console.log('  Timeframe:', timeframe);
console.log('  Indicator:', indicator);
console.log('  Trigger:', trigger);

console.log('');
console.log('🔍 Volume search in trigger:');
const hasVolume = trigger.includes('Vol:');
console.log('  Contains "Vol:":', hasVolume);

if (hasVolume) {
  const volumeMatch = trigger.match(/Vol:\s*([^|]+?)(?:\s*\||$)/i);
  if (volumeMatch) {
    console.log('  Volume match:', volumeMatch[1]);
    console.log('✅ SUCCESS: Volume data will be parsed!');
  } else {
    console.log('❌ FAILED: Volume regex did not match');
  }
} else {
  console.log('❌ FAILED: No "Vol:" found in trigger');
}