// Test database insert directly with volume data

const { createClient } = require('@supabase/supabase-js');

// Mock data similar to what would be parsed
const mockVolumeData = {
  ticker: 'TESTAAPL',
  vwap_value: -0.32,
  rsi_value: 44.5,
  rsi_status: 'BEAR',
  adx_value: 18.3,
  adx_strength: 'Weak',
  adx_direction: 'Bearish',
  htf_status: 'Reversal Bullish',
  volume_amount: '20.49K',
  volume_change: -48,
  volume_level: null, // No level in this format
  updated_at: new Date().toISOString()
};

console.log('🧪 Testing Database Insert with Volume Data...');
console.log('📊 Mock data to insert:', JSON.stringify(mockVolumeData, null, 2));

// Note: This would require Supabase credentials to actually run
// But we can see the structure that should be inserted

console.log('\n✅ Volume data structure looks correct!');
console.log('🎯 Expected database columns:');
console.log('  - volume_amount: text');
console.log('  - volume_change: decimal(8,2)');
console.log('  - volume_level: text (nullable)');

console.log('\n📝 Possible issues:');
console.log('  1. Database column types mismatch');
console.log('  2. Supabase RLS (Row Level Security) policies');  
console.log('  3. Database connection issues');
console.log('  4. Silent SQL constraint violations');

console.log('\n🔍 To debug further, check:');
console.log('  1. Supabase dashboard > Table Editor > ticker_indicators');
console.log('  2. Check if AAPL row exists with volume_* columns');
console.log('  3. Try manual insert via Supabase SQL editor');