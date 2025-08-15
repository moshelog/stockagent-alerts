// Test parsing with exact XRPUSDT.P format from notification

function parseExtremeIndicators(trigger) {
  try {
    const indicators = {};
    
    console.log('🔍 TESTING: Input trigger:', trigger);
    
    // Extract VWAP value and percentage: "VWAP: -1.49%"
    const vwapMatch = trigger.match(/VWAP:\s*([\d.-]+)%?/i);
    if (vwapMatch) {
      indicators.vwap_value = parseFloat(vwapMatch[1]);
      console.log('✅ VWAP found:', indicators.vwap_value);
    }
    
    // Extract RSI value and status: "RSI: 50.3 (NEUTRAL)"
    const rsiMatch = trigger.match(/RSI:\s*([\d.-]+)\s*\(([^)]+)\)/i);
    if (rsiMatch) {
      indicators.rsi_value = parseFloat(rsiMatch[1]);
      indicators.rsi_status = rsiMatch[2].trim();
      console.log('✅ RSI found:', indicators.rsi_value, indicators.rsi_status);
    }
    
    // Extract ADX value, strength, and direction: "ADX: 33.7 (Strong Bearish)"
    const adxMatch = trigger.match(/ADX:\s*([\d.-]+)\s*\(([^)]+)\)/i);
    if (adxMatch) {
      indicators.adx_value = parseFloat(adxMatch[1]);
      const adxInfo = adxMatch[2].trim();
      
      const strengthMatch = adxInfo.match(/(Strong|Weak)\s+(Bullish|Bearish|Neutral)/i);
      if (strengthMatch) {
        indicators.adx_strength = strengthMatch[1];
        indicators.adx_direction = strengthMatch[2];
      }
      console.log('✅ ADX found:', indicators.adx_value, indicators.adx_strength, indicators.adx_direction);
    }
    
    // Extract HTF synergy status: "HTF: No Synergy"
    const htfMatch = trigger.match(/HTF:\s*([^|]+?)(?:\s*\||$)/i);
    if (htfMatch) {
      indicators.htf_status = htfMatch[1].trim();
      console.log('✅ HTF found:', indicators.htf_status);
    }
    
    // Extract Volume data: "Vol: 3.37M (-43%)"
    console.log('📊 VOLUME: Searching for volume in trigger...');
    const volumeMatch = trigger.match(/Vol:\s*([^|]+?)(?:\s*\||$)/i);
    console.log('📊 VOLUME: Regex result:', volumeMatch);
    
    if (volumeMatch) {
      const volumeInfo = volumeMatch[1].trim();
      console.log('📊 VOLUME: Info extracted:', `"${volumeInfo}"`);
      
      // Extract volume amount: "3.37M"
      const amountMatch = volumeInfo.match(/([\d.]+[KMB]?)/i);
      if (amountMatch) {
        indicators.volume_amount = amountMatch[1];
        console.log('✅ VOLUME: Amount found:', indicators.volume_amount);
      }
      
      // Extract percentage change: "(-43%)"
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
      } else {
        console.log('ℹ️ VOLUME: No level indicator (this is OK)');
      }
    } else {
      console.log('❌ VOLUME: No volume data found!');
    }
    
    return Object.keys(indicators).length > 0 ? indicators : null;
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return null;
  }
}

// Test with exact format from your XRPUSDT.P notification
const xrpTrigger = "RSI: Neutral | VWAP: -1.49% | RSI: 50.3 (NEUTRAL) | ADX: 33.7 (Strong Bearish) | HTF: No Synergy | Vol: 3.37M (-43%)";

console.log('🧪 Testing XRPUSDT.P Volume Parsing');
console.log('=' .repeat(60));

const result = parseExtremeIndicators(xrpTrigger);

console.log('');
console.log('📋 FINAL RESULT:');
console.log(JSON.stringify(result, null, 2));

if (result && (result.volume_amount || result.volume_change)) {
  console.log('');
  console.log('🎉 SUCCESS! Volume data will be parsed:');
  console.log(`   Amount: ${result.volume_amount || 'N/A'}`);
  console.log(`   Change: ${result.volume_change || 'N/A'}%`);
  console.log(`   Level: ${result.volume_level || 'N/A'}`);
  console.log(`   Expected tag: "Vol ${result.volume_amount} ${result.volume_change}%"`);
} else {
  console.log('');
  console.log('❌ FAILED - No volume data extracted');
}