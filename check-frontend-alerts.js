#!/usr/bin/env node

const https = require('https');

console.log('🔍 Checking if alerts appear on frontend...');
console.log('====================================');

// Fetch the main page and look for our test alerts
const options = {
  hostname: 'stockagent-alerts-production.up.railway.app',
  port: 443,
  path: '/',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    
    // Look for our test alerts in the HTML
    const testTickers = ['DEBUGTEST.P', 'PRICETEST'];
    const priceValues = ['98765.50', '99999.99', '$98,766', '$99,000'];
    
    let foundAlerts = false;
    
    testTickers.forEach(ticker => {
      if (data.includes(ticker)) {
        console.log(`✅ Found ${ticker} in frontend!`);
        foundAlerts = true;
        
        // Look for price values near the ticker
        const tickerIndex = data.indexOf(ticker);
        const surrounding = data.slice(Math.max(0, tickerIndex - 200), tickerIndex + 200);
        
        priceValues.forEach(price => {
          if (surrounding.includes(price)) {
            console.log(`   💰 Price ${price} found near ${ticker}!`);
          }
        });
      }
    });
    
    if (!foundAlerts) {
      console.log('❌ Test alerts not found on frontend');
      console.log('   This could mean:');
      console.log('   1. Alerts are not being saved to database');
      console.log('   2. Frontend has authentication/loading issues');
      console.log('   3. Price parsing is failing silently');
    }
    
    // Check if price column header exists
    if (data.includes('Price') && data.includes('Ticker') && data.includes('Timeframe')) {
      console.log('✅ Price column header found in table');
    } else {
      console.log('❌ Price column header not found - frontend may not be updated');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Go to https://stockagent-alerts-production.up.railway.app');
    console.log('2. Check Recent Alerts table manually');
    console.log('3. Look for DEBUGTEST.P and PRICETEST entries');
    console.log('4. Check if price column shows values or dashes');
  });
});

req.on('error', (error) => {
  console.error('❌ Error fetching frontend:', error.message);
});

req.end();