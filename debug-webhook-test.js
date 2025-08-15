// Debug test with the actual webhook data from the notification

function parseExtremeIndicators(trigger) {
  try {
    const indicators = {};
    
    // Extract VWAP value and percentage: "VWAP: 0.75%"
    const vwapMatch = trigger.match(/VWAP:\s*([\d.-]+)%?/i);
    if (vwapMatch) {
      indicators.vwap_value = parseFloat(vwapMatch[1]);
    }
    
    // Extract RSI value and status: "RSI: 68.5 (OB)" or "RSI: 45.2 (Neutral)"
    const rsiMatch = trigger.match(/RSI:\s*([\d.-]+)\s*\(([^)]+)\)/i);
    if (rsiMatch) {
      indicators.rsi_value = parseFloat(rsiMatch[1]);
      indicators.rsi_status = rsiMatch[2].trim();
    }
    
    // Extract ADX value, strength, and direction: "ADX: 32.1 (Strong Bullish)"
    const adxMatch = trigger.match(/ADX:\s*([\d.-]+)\s*\(([^)]+)\)/i);
    if (adxMatch) {
      indicators.adx_value = parseFloat(adxMatch[1]);
      const adxInfo = adxMatch[2].trim();
      
      // Parse strength and direction from "Strong Bullish", "Weak Bearish", or "Strong Neutral"
      const strengthMatch = adxInfo.match(/(Strong|Weak)\s+(Bullish|Bearish|Neutral)/i);
      if (strengthMatch) {
        indicators.adx_strength = strengthMatch[1];
        indicators.adx_direction = strengthMatch[2];
      } else {
        // Fallback for different formats
        indicators.adx_strength = adxInfo.includes('Strong') ? 'Strong' : 'Weak';
        if (adxInfo.includes('Bullish')) {
          indicators.adx_direction = 'Bullish';
        } else if (adxInfo.includes('Bearish')) {
          indicators.adx_direction = 'Bearish';
        } else {
          indicators.adx_direction = 'Neutral';
        }
      }
    }
    
    // Extract HTF synergy status: "HTF: Reversal Bullish"
    const htfMatch = trigger.match(/HTF:\s*([^|]+?)(?:\s*\||$)/i);
    if (htfMatch) {
      indicators.htf_status = htfMatch[1].trim();
    }
    
    // Extract Volume data: "Vol: 12.49K (+149%) HIGH"
    const volumeMatch = trigger.match(/Vol:\s*([^|]+?)(?:\s*\||$)/i);
    console.log('🔍 Looking for volume in:', trigger);
    console.log('📊 Volume regex result:', volumeMatch);
    
    if (volumeMatch) {
      const volumeInfo = volumeMatch[1].trim();
      console.log('💾 Volume info extracted:', volumeInfo);
      
      // Extract volume amount: "12.49K"
      const amountMatch = volumeInfo.match(/([\d.]+[KMB]?)/i);
      if (amountMatch) {
        indicators.volume_amount = amountMatch[1];
        console.log('📈 Volume amount:', indicators.volume_amount);
      }
      
      // Extract percentage change: "(+149%)" or "(-25%)"
      const percentMatch = volumeInfo.match(/\(([+-]?\d+(?:\.\d+)?)%\)/i);
      if (percentMatch) {
        indicators.volume_change = parseFloat(percentMatch[1]);
        console.log('📊 Volume change:', indicators.volume_change);
      }
      
      // Extract level indicator: "HIGH", "LOW", "NORMAL"
      const levelMatch = volumeInfo.match(/\b(HIGH|LOW|NORMAL)\b/i);
      if (levelMatch) {
        indicators.volume_level = levelMatch[1].toUpperCase();
        console.log('🎚️ Volume level:', indicators.volume_level);
      } else {
        console.log('❌ No volume level found in:', volumeInfo);
      }
    } else {
      console.log('❌ No volume data found in trigger');
    }
    
    // Return indicators if at least one was found
    return Object.keys(indicators).length > 0 ? indicators : null;
    
  } catch (error) {
    console.error('Error parsing extreme indicators:', error.message);
    return null;
  }
}

// Test with the actual webhook data
const actualWebhookData = "AAPL | 231.26 | 5M | Extreme | RSI: Neutral | VWAP: -0.26% | RSI: 46.9 (Neutral) | ADX: 20.5 (Strong Bearish) | HTF: Reversal Bullish | Vol: 25.32K (-38%)";

console.log("🧪 Testing with actual webhook data:");
console.log("📨 Webhook:", actualWebhookData);
console.log("\n" + "=".repeat(60));

const result = parseExtremeIndicators(actualWebhookData);

console.log("\n📋 Parsed Result:", JSON.stringify(result, null, 2));

if (result && result.volume_amount) {
  console.log("\n✅ Volume parsing SUCCESS!");
  console.log(`📊 Amount: ${result.volume_amount}`);
  console.log(`📈 Change: ${result.volume_change}%`);
  console.log(`🎚️ Level: ${result.volume_level || 'NONE'}`);
} else {
  console.log("\n❌ Volume parsing FAILED!");
}