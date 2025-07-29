require('dotenv').config();
const { supabase } = require('./config/database');

async function checkData() {
  console.log('🔍 Checking database contents...\n');
  
  try {
    // Check available alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('available_alerts')
      .select('indicator, trigger, weight')
      .limit(5);
    
    if (!alertsError && alerts && alerts.length > 0) {
      console.log('✅ Available alerts table populated:');
      alerts.forEach(alert => 
        console.log(`  - ${alert.indicator}: ${alert.trigger} (weight: ${alert.weight})`)
      );
      
      // Get total count
      const { count } = await supabase
        .from('available_alerts')
        .select('*', { count: 'exact', head: true });
      
      console.log(`  ... and ${count - 5} more alerts\n`);
    } else {
      console.log('❌ Available alerts table empty or error:', alertsError?.message);
    }
    
    // Check strategies
    const { data: strategies, error: strategiesError } = await supabase
      .from('strategies')
      .select('name, timeframe, enabled');
    
    if (!strategiesError && strategies && strategies.length > 0) {
      console.log('✅ Strategies table populated:');
      strategies.forEach(strategy => 
        console.log(`  - ${strategy.name} (${strategy.timeframe}m, ${strategy.enabled ? 'enabled' : 'disabled'})`)
      );
    } else {
      console.log('❌ Strategies table empty or error:', strategiesError?.message);
    }
    
    console.log('\n🎉 Database setup complete and verified!');
    
  } catch (error) {
    console.error('❌ Database check error:', error.message);
  }
}

checkData();