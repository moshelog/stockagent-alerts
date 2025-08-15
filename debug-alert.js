/**
 * Debug script for the specific alert that's not working
 */

// Your exact alert data
const alertText = "BTCUSDT.P | 118878.0 | 5M | Extreme | Premium Zone Wick Reversal | VWAP: 0.3% | RSI: 59 (NEUTRAL) | ADX: 18.6 (Weak Bullish) | HTF: No Synergy";

// Parse the webhook format
const parts = alertText.split('|').map(part => part.trim());
console.log("📋 Parsed webhook parts:");
parts.forEach((part, i) => console.log(`  [${i}]: "${part}"`));

const ticker = parts[0];
const price = parts[1];
const timeframe = parts[2];
const indicator = parts[3];
const trigger = parts.slice(4).join(' | '); // Join everything after "Extreme"

console.log("\n🔍 Extracted fields:");
console.log(`  Ticker: "${ticker}"`);
console.log(`  Price: "${price}"`);
console.log(`  Timeframe: "${timeframe}"`);
console.log(`  Indicator: "${indicator}"`);
console.log(`  Trigger: "${trigger}"`);

// Test the parsing function with your exact trigger text
function parseExtremeIndicators(trigger) {
  try {
    const indicators = {};
    
    console.log(`\n🧪 Testing parsing with trigger: "${trigger}"`);
    
    // Extract VWAP value and percentage: "VWAP: 0.3%"
    const vwapMatch = trigger.match(/VWAP:\s*([\d.-]+)%?/i);
    console.log(`  VWAP regex result:`, vwapMatch);
    if (vwapMatch) {
      indicators.vwap_value = parseFloat(vwapMatch[1]);
    }
    
    // Extract RSI value and status: "RSI: 59 (NEUTRAL)"
    const rsiMatch = trigger.match(/RSI:\s*([\d.-]+)\s*\(([^)]+)\)/i);
    console.log(`  RSI regex result:`, rsiMatch);
    if (rsiMatch) {
      indicators.rsi_value = parseFloat(rsiMatch[1]);
      indicators.rsi_status = rsiMatch[2].trim();
    }
    
    // Extract ADX value, strength, and direction: "ADX: 18.6 (Weak Bullish)"
    const adxMatch = trigger.match(/ADX:\s*([\d.-]+)\s*\(([^)]+)\)/i);
    console.log(`  ADX regex result:`, adxMatch);
    if (adxMatch) {
      indicators.adx_value = parseFloat(adxMatch[1]);
      const adxInfo = adxMatch[2].trim();
      
      // Parse strength and direction from "Strong Bullish", "Weak Bearish", or "Strong Neutral"
      const strengthMatch = adxInfo.match(/(Strong|Weak)\s+(Bullish|Bearish|Neutral)/i);
      console.log(`  ADX strength regex result:`, strengthMatch);
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
    
    // Extract HTF synergy status: "HTF: No Synergy"
    const htfMatch = trigger.match(/HTF:\s*([^|]+?)(?:\s*\||$)/i);
    console.log(`  HTF regex result:`, htfMatch);
    if (htfMatch) {
      indicators.htf_status = htfMatch[1].trim();
    }
    
    console.log(`\n✅ Final parsed indicators:`, indicators);
    
    // Return indicators if at least one was found
    return Object.keys(indicators).length > 0 ? indicators : null;
    
  } catch (error) {
    console.error('❌ Error parsing extreme indicators:', error.message);
    return null;
  }
}

// Test with your exact alert
const result = parseExtremeIndicators(trigger);
console.log(`\n🎯 Parsing result:`, result);

// Check indicator matching logic
const normalizedIndicator = indicator.toLowerCase() === 'extreme' ? 'Extreme Zones' : indicator;
console.log(`\n🔄 Indicator normalization: "${indicator}" → "${normalizedIndicator}"`);
console.log(`  Should trigger Extreme processing: ${normalizedIndicator === 'Extreme Zones' || normalizedIndicator.toLowerCase() === 'extreme'}`);