/**
 * Test script for the new Extreme Indicator parsing functionality
 * Run with: node test-extreme-parsing.js
 */

// Mock the parsing function from server.js
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
    
    // Return indicators if at least one was found
    return Object.keys(indicators).length > 0 ? indicators : null;
    
  } catch (error) {
    console.error('Error parsing extreme indicators:', error.message);
    return null;
  }
}

// Test cases
const testCases = [
  {
    name: "Premium Zone with all indicators",
    trigger: "Premium Zone Touch | VWAP: 0.75% | RSI: 68.5 (OB) | ADX: 32.1 (Strong Bullish) | HTF: Reversal Bullish",
    expected: {
      vwap_value: 0.75,
      rsi_value: 68.5,
      rsi_status: "OB",
      adx_value: 32.1,
      adx_strength: "Strong",
      adx_direction: "Bullish",
      htf_status: "Reversal Bullish"
    }
  },
  {
    name: "Discount Zone with different values",
    trigger: "Discount Zone | VWAP: -2.15% | RSI: 28.3 (OS) | ADX: 18.7 (Weak Bearish) | HTF: Continuation Bearish",
    expected: {
      vwap_value: -2.15,
      rsi_value: 28.3,
      rsi_status: "OS",
      adx_value: 18.7,
      adx_strength: "Weak",
      adx_direction: "Bearish",
      htf_status: "Continuation Bearish"
    }
  },
  {
    name: "Equilibrium Zone with neutral values",
    trigger: "Equilibrium Zone | VWAP: 0.05% | RSI: 52.1 (Neutral) | ADX: 25.0 (Strong Neutral) | HTF: Ranging",
    expected: {
      vwap_value: 0.05,
      rsi_value: 52.1,
      rsi_status: "Neutral",
      adx_value: 25.0,
      adx_strength: "Strong",
      adx_direction: "Neutral",
      htf_status: "Ranging"
    }
  },
  {
    name: "Partial indicators (missing some)",
    trigger: "Premium Zone | VWAP: 1.23% | RSI: 75.8 (OB)",
    expected: {
      vwap_value: 1.23,
      rsi_value: 75.8,
      rsi_status: "OB"
    }
  },
  {
    name: "VWAP only",
    trigger: "Zone Alert | VWAP: -0.89%",
    expected: {
      vwap_value: -0.89
    }
  }
];

console.log("🧪 Testing Extreme Indicator Parsing");
console.log("=====================================\n");

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Input: "${testCase.trigger}"`);
  
  const result = parseExtremeIndicators(testCase.trigger);
  
  if (!result) {
    console.log("❌ Failed: No indicators parsed");
    failed++;
    return;
  }
  
  console.log("Parsed:", JSON.stringify(result, null, 2));
  console.log("Expected:", JSON.stringify(testCase.expected, null, 2));
  
  // Check if all expected fields match
  let matches = true;
  for (const [key, expectedValue] of Object.entries(testCase.expected)) {
    if (result[key] !== expectedValue) {
      console.log(`❌ Mismatch: ${key} = ${result[key]}, expected ${expectedValue}`);
      matches = false;
    }
  }
  
  if (matches) {
    console.log("✅ Passed");
    passed++;
  } else {
    console.log("❌ Failed");
    failed++;
  }
  
  console.log("-".repeat(50));
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log("🎉 All tests passed! The parsing logic is working correctly.");
} else {
  console.log("⚠️  Some tests failed. Please review the parsing logic.");
}