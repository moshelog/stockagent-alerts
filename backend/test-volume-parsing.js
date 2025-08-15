// Test script to verify volume parsing functionality
// Run with: node test-volume-parsing.js

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
    if (volumeMatch) {
      const volumeInfo = volumeMatch[1].trim();
      
      // Extract volume amount: "12.49K"
      const amountMatch = volumeInfo.match(/([\d.]+[KMB]?)/i);
      if (amountMatch) {
        indicators.volume_amount = amountMatch[1];
      }
      
      // Extract percentage change: "(+149%)" or "(-25%)"
      const percentMatch = volumeInfo.match(/\(([+-]?\d+(?:\.\d+)?)%\)/i);
      if (percentMatch) {
        indicators.volume_change = parseFloat(percentMatch[1]);
      }
      
      // Extract level indicator: "HIGH", "LOW", "NORMAL"
      const levelMatch = volumeInfo.match(/\b(HIGH|LOW|NORMAL)\b/i);
      if (levelMatch) {
        indicators.volume_level = levelMatch[1].toUpperCase();
      }
    }
    
    // Return indicators if at least one was found
    return Object.keys(indicators).length > 0 ? indicators : null;
    
  } catch (error) {
    console.error('Error parsing extreme indicators:', error.message);
    return null;
  }
}

// Test cases for volume parsing
const testCases = [
  {
    name: "Complete Alert with Volume HIGH",
    trigger: "Premium Zone Touch | VWAP: Bullish | RSI: 68.5 (OB) | ADX: 32.1 (Strong Bullish) | HTF: Synergy Up | Vol: 12.49K (+149%) HIGH",
    expected: {
      vwap_value: null, // No numeric value in this format
      rsi_value: 68.5,
      rsi_status: "OB",
      adx_value: 32.1,
      adx_strength: "Strong",
      adx_direction: "Bullish",
      htf_status: "Synergy Up",
      volume_amount: "12.49K",
      volume_change: 149,
      volume_level: "HIGH"
    }
  },
  {
    name: "Alert with Volume LOW",
    trigger: "Discount Zone | VWAP: -2.15% | RSI: 28.3 (OS) | ADX: 18.7 (Weak Bearish) | HTF: Continuation Bearish | Vol: 2.1K (-45%) LOW",
    expected: {
      vwap_value: -2.15,
      rsi_value: 28.3,
      rsi_status: "OS",
      adx_value: 18.7,
      adx_strength: "Weak",
      adx_direction: "Bearish",
      htf_status: "Continuation Bearish",
      volume_amount: "2.1K",
      volume_change: -45,
      volume_level: "LOW"
    }
  },
  {
    name: "Alert with Volume NORMAL (large volume)",
    trigger: "Equilibrium Zone | VWAP: 0.05% | RSI: 52.1 (Neutral) | ADX: 25.0 (Strong Neutral) | HTF: Ranging | Vol: 500M (+12%) NORMAL",
    expected: {
      vwap_value: 0.05,
      rsi_value: 52.1,
      rsi_status: "Neutral",
      adx_value: 25.0,
      adx_strength: "Strong",
      adx_direction: "Neutral",
      htf_status: "Ranging",
      volume_amount: "500M",
      volume_change: 12,
      volume_level: "NORMAL"
    }
  },
  {
    name: "Alert without Volume data",
    trigger: "Premium Zone | VWAP: 1.23% | RSI: 75.8 (OB)",
    expected: {
      vwap_value: 1.23,
      rsi_value: 75.8,
      rsi_status: "OB"
    }
  },
  {
    name: "Volume only alert",
    trigger: "Zone Alert | Vol: 1.5B (-8%) HIGH",
    expected: {
      volume_amount: "1.5B",
      volume_change: -8,
      volume_level: "HIGH"
    }
  }
];

function runTest(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`Trigger: "${testCase.trigger}"\n`);
  
  const result = parseExtremeIndicators(testCase.trigger);
  
  if (!result) {
    console.log("❌ Failed: No indicators parsed");
    return false;
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
    console.log("✅ Test passed!");
    return true;
  } else {
    console.log("❌ Test failed!");
    return false;
  }
}

// Run all tests
console.log("🚀 Starting Volume Parsing Tests\n");
console.log("=" .repeat(50));

let passed = 0;
let failed = 0;

testCases.forEach(testCase => {
  if (runTest(testCase)) {
    passed++;
  } else {
    failed++;
  }
});

console.log("\n" + "=" .repeat(50));
console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log("🎉 All tests passed! Volume parsing is working correctly.");
} else {
  console.log("❌ Some tests failed. Check the output above.");
  process.exit(1);
}