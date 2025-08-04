#!/usr/bin/env node

/**
 * Test script to verify price field is working end-to-end
 * Tests: Webhook parsing → Database save → Frontend display
 */

const https = require('https');

// Get current time for timestamps
const currentTime = new Date().toLocaleTimeString('en-US', { 
  hour12: false, 
  hour: '2-digit', 
  minute: '2-digit', 
  second: '2-digit' 
});

// Test configurations - with time field at the end
const tests = [
  {
    name: "Test 1: With price (new format)",
    payload: `BTCUSDT.P|98543.25|15|SMC|Bullish OB Break|${currentTime}`,
    expectedPrice: 98543.25
  },
  {
    name: "Test 2: With price and dollar sign",
    payload: `ETHUSDT.P|$3,456.78|30|Oscillator|Buy Signal|${currentTime}`,
    expectedPrice: 3456.78
  },
  {
    name: "Test 3: Without price (legacy format)",
    payload: `SOLUSDT.P|15|Wave|Sell Signal|${currentTime}`,
    expectedPrice: null
  },
  {
    name: "Test 4: With price - Extreme indicator",
    payload: `XRPUSDT.P|2.1234|15|Extreme|Discount Zone|${currentTime}`,
    expectedPrice: 2.1234
  }
];

// Function to send webhook
function sendWebhook(payload, testName) {
  return new Promise((resolve, reject) => {
    const data = payload;
    
    const options = {
      hostname: 'api.stockagent.app',
      port: 443,
      path: '/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log(`\n📤 Sending ${testName}...`);
    console.log(`   Payload: ${payload}`);
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${responseData}`);
        
        if (res.statusCode === 200) {
          console.log(`   ✅ Webhook accepted`);
          resolve({ success: true, status: res.statusCode, data: responseData });
        } else {
          console.log(`   ❌ Webhook failed`);
          resolve({ success: false, status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`   ❌ Error: ${error.message}`);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Function to check alerts via API
async function checkAlerts() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.stockagent.app',
      port: 443,
      path: '/api/alerts?limit=10',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    console.log(`\n🔍 Fetching recent alerts from API...`);
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const alerts = JSON.parse(responseData);
          console.log(`   Found ${alerts.length} recent alerts`);
          resolve(alerts);
        } catch (error) {
          console.error(`   ❌ Failed to parse alerts response`);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`   ❌ Error fetching alerts: ${error.message}`);
      reject(error);
    });
    
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log('🧪 Starting Price Field End-to-End Test');
  console.log('=====================================');
  
  // Send all test webhooks
  for (const test of tests) {
    try {
      await sendWebhook(test.payload, test.name);
      // Wait 2 seconds between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to send webhook: ${error.message}`);
    }
  }
  
  // Wait for webhooks to be processed and saved
  console.log('\n⏳ Waiting 5 seconds for webhooks to be processed...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check if alerts were saved with price field
  try {
    const alerts = await checkAlerts();
    
    console.log('\n📊 Verifying Price Fields in Database:');
    console.log('=====================================');
    
    // Check each test case
    for (const test of tests) {
      const parts = test.payload.split('|');
      const ticker = parts[0];
      
      const matchingAlert = alerts.find(alert => 
        alert.ticker === ticker && 
        new Date(alert.timestamp).getTime() > Date.now() - 60000 // Within last minute
      );
      
      if (matchingAlert) {
        console.log(`\n✓ ${test.name}`);
        console.log(`  Ticker: ${matchingAlert.ticker}`);
        console.log(`  Expected Price: ${test.expectedPrice}`);
        console.log(`  Actual Price: ${matchingAlert.price || 'null'}`);
        console.log(`  Timeframe: ${matchingAlert.timeframe}`);
        console.log(`  Indicator: ${matchingAlert.indicator}`);
        console.log(`  Trigger: ${matchingAlert.trigger}`);
        
        if (test.expectedPrice !== null) {
          if (matchingAlert.price && Math.abs(matchingAlert.price - test.expectedPrice) < 0.01) {
            console.log(`  ✅ Price field correctly saved!`);
          } else {
            console.log(`  ❌ Price mismatch!`);
          }
        } else {
          if (!matchingAlert.price) {
            console.log(`  ✅ Price field correctly null (legacy format)`);
          } else {
            console.log(`  ❌ Price should be null for legacy format`);
          }
        }
      } else {
        console.log(`\n❌ ${test.name} - Alert not found in database`);
      }
    }
    
    // Show raw data for debugging
    console.log('\n📋 Raw Alert Data (last 5):');
    console.log('==========================');
    alerts.slice(0, 5).forEach(alert => {
      console.log(`${alert.ticker} | ${alert.price ? '$' + alert.price : 'N/A'} | ${alert.timeframe} | ${alert.indicator} | ${alert.trigger}`);
    });
    
  } catch (error) {
    console.error('Failed to check alerts:', error.message);
  }
  
  console.log('\n\n🎯 Next Steps:');
  console.log('1. Check the frontend at https://stockagent-alerts-production.up.railway.app');
  console.log('2. Verify the price column shows between ticker and timeframe');
  console.log('3. Check that prices display as "$98,543" format');
  console.log('4. Verify legacy webhooks (without price) still work');
}

// Run the tests
runTests().catch(console.error);