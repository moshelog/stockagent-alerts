// Debug IBIT parsing specifically

function parseExtremeIndicators(trigger) {
  console.log('🔍 IBIT DEBUG: Input trigger:', `"${trigger}"`);
  
  const indicators = {};
  
  // Extract Volume data: "Vol: 150.5K (+22%) HIGH"
  console.log('📊 VOLUME: Searching for volume in trigger...');
  const volumeMatch = trigger.match(/Vol:\s*([^|]+?)(?:\s*\||$)/i);
  console.log('📊 VOLUME: Regex result:', volumeMatch);
  
  if (volumeMatch) {
    const volumeInfo = volumeMatch[1].trim();
    console.log('📊 VOLUME: Info extracted:', `"${volumeInfo}"`);
    
    // Extract volume amount: "150.5K"
    const amountMatch = volumeInfo.match(/([\d.]+[KMB]?)/i);
    if (amountMatch) {
      indicators.volume_amount = amountMatch[1];
      console.log('✅ VOLUME: Amount found:', indicators.volume_amount);
    }
    
    // Extract percentage change: "(+22%)"
    const percentMatch = volumeInfo.match(/\(([+-]?\d+(?:\.\d+)?)%\)/i);
    if (percentMatch) {
      indicators.volume_change = parseFloat(percentMatch[1]);
      console.log('✅ VOLUME: Change found:', indicators.volume_change);
    }
    
    // Extract level indicator: "HIGH", "LOW", "NORMAL"
    const levelMatch = volumeInfo.match(/\b(HIGH|LOW|NORMAL)\b/i);
    if (levelMatch) {
      indicators.volume_level = levelMatch[1].toUpperCase();
      console.log('✅ VOLUME: Level found:', indicators.volume_level);
    }
  }
  
  return indicators;
}

// Test exact IBIT trigger
const ibitTrigger = "Discount Zone Wick Reversal | VWAP: -0.30% | RSI: 47 (NEUTRAL) | ADX: 25.7 (Strong Bearish) | HTF: Reversal Bullish | Vol: 150.5K (+22%) HIGH";

console.log('🧪 Testing IBIT Volume Parsing');
console.log('='.repeat(60));

const result = parseExtremeIndicators(ibitTrigger);

console.log('');
console.log('📋 FINAL RESULT:');
console.log(JSON.stringify(result, null, 2));

if (result.volume_amount || result.volume_change) {
  console.log('🎉 SUCCESS! Volume data parsed');
} else {
  console.log('❌ FAILED - No volume data extracted');
}