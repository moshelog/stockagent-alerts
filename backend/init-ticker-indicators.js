/**
 * Initialize the ticker_indicators table in Supabase
 * Run this script to set up the database schema for real-time indicator storage
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function initializeDatabase() {
  console.log('🚀 Initializing ticker_indicators table...');
  
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_ticker_indicators_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Reading migration file...');
    
    // Execute the migration using Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // Try alternative method if exec_sql doesn't exist
      console.log('⚠️  exec_sql RPC not available, please run the migration manually in Supabase SQL editor');
      console.log('\n📋 Copy and paste this SQL into your Supabase SQL editor:');
      console.log('=' * 60);
      console.log(migrationSQL);
      console.log('=' * 60);
      return;
    }
    
    console.log('✅ Database migration completed successfully!');
    
    // Test the table by inserting a sample record
    const { data: testData, error: testError } = await supabase
      .from('ticker_indicators')
      .upsert({
        ticker: 'BTC',
        vwap_value: 0.75,
        rsi_value: 68.5,
        rsi_status: 'OB',
        adx_value: 32.1,
        adx_strength: 'Strong',
        adx_direction: 'Bullish',
        htf_status: 'Reversal Bullish'
      }, {
        onConflict: 'ticker'
      })
      .select()
      .single();
    
    if (testError) {
      console.log('❌ Test insert failed:', testError.message);
      return;
    }
    
    console.log('✅ Test record created successfully:', testData);
    
    // Clean up test record
    const { error: deleteError } = await supabase
      .from('ticker_indicators')
      .delete()
      .eq('ticker', 'BTC');
    
    if (deleteError) {
      console.log('⚠️  Warning: Could not clean up test record:', deleteError.message);
    } else {
      console.log('🧹 Test record cleaned up');
    }
    
    console.log('\n🎉 ticker_indicators table is ready!');
    console.log('📡 Backend can now store and retrieve real-time indicator values');
    console.log('🔄 Frontend will automatically poll for updates every 5 seconds');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    console.log('\n📋 Manual setup required - run this SQL in Supabase SQL editor:');
    console.log('=' * 60);
    
    try {
      const migrationPath = path.join(__dirname, 'migrations', 'add_ticker_indicators_table.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.log(migrationSQL);
    } catch (readError) {
      console.log('Could not read migration file:', readError.message);
    }
    
    console.log('=' * 60);
  }
}

// Run the initialization
initializeDatabase().then(() => {
  console.log('\n✨ Initialization complete!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Initialization failed:', error);
  process.exit(1);
});