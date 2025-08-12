#!/usr/bin/env node

const { supabase } = require('../config/database');

async function addNewAlerts() {
  console.log('🚀 Adding new SMC and Waves alerts to database...\n');

  if (!supabase) {
    console.error('❌ Database connection not available');
    process.exit(1);
  }

  const newAlerts = [
    // SMC (Market Core Pro™) alerts
    {
      indicator: 'Market Core Pro™',
      trigger: 'Bearish Liquidity Grab Created',
      weight: -1,
      enabled: true,
      tooltip: 'A bearish liquidity grab has been created - potential selling opportunity'
    },
    {
      indicator: 'Market Core Pro™', 
      trigger: 'Bullish Liquidity Grab Created',
      weight: 1,
      enabled: true,
      tooltip: 'A bullish liquidity grab has been created - potential buying opportunity'
    },
    {
      indicator: 'Market Core Pro™',
      trigger: 'Support Level Break', 
      weight: -1,
      enabled: true,
      tooltip: 'Support level has been broken - bearish signal indicating potential downward move'
    },
    {
      indicator: 'Market Core Pro™',
      trigger: 'Resistance Level Break',
      weight: 1,
      enabled: true,
      tooltip: 'Resistance level has been broken - bullish signal indicating potential upward move'
    },
    
    // Waves (Market Waves Pro™) alerts
    {
      indicator: 'Market Waves Pro™',
      trigger: 'FlowTrend Bearish Retest',
      weight: -1,
      enabled: true,
      tooltip: 'FlowTrend bearish retest detected - potential continuation of downtrend'
    },
    {
      indicator: 'Market Waves Pro™',
      trigger: 'FlowTrend Bullish Retest', 
      weight: 1,
      enabled: true,
      tooltip: 'FlowTrend bullish retest detected - potential continuation of uptrend'
    },
    {
      indicator: 'Market Waves Pro™',
      trigger: 'Bullish TrendMagnet Signal',
      weight: 1,
      enabled: true,
      tooltip: 'TrendMagnet bullish signal detected - strong upward momentum indicated'
    },
    {
      indicator: 'Market Waves Pro™',
      trigger: 'Bearish TrendMagnet Signal',
      weight: -1,
      enabled: true,
      tooltip: 'TrendMagnet bearish signal detected - strong downward momentum indicated'
    }
  ];

  console.log(`📝 Adding ${newAlerts.length} new alerts:\n`);

  // Add each alert
  for (const alert of newAlerts) {
    try {
      console.log(`   • ${alert.indicator}: ${alert.trigger} (weight: ${alert.weight})`);
      
      const { data, error } = await supabase
        .from('available_alerts')
        .upsert(alert, { 
          onConflict: 'indicator,trigger',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error(`     ❌ Error: ${error.message}`);
      } else {
        console.log(`     ✅ Added successfully`);
      }
    } catch (err) {
      console.error(`     ❌ Exception: ${err.message}`);
    }
  }

  console.log('\n🔍 Verifying added alerts...\n');

  // Verify the alerts were added
  const alertTriggers = newAlerts.map(a => a.trigger);
  const { data: verification, error: verifyError } = await supabase
    .from('available_alerts')
    .select('indicator, trigger, weight, enabled')
    .in('trigger', alertTriggers)
    .order('indicator')
    .order('trigger');

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
  } else {
    console.log('✅ Successfully added alerts:');
    verification.forEach(alert => {
      console.log(`   ${alert.indicator}: ${alert.trigger} (weight: ${alert.weight})`);
    });
    console.log(`\n🎯 Total alerts added: ${verification.length}`);
  }

  console.log('\n✨ Database update complete!');
}

// Run the script
addNewAlerts().catch(console.error);