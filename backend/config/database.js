const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  // Don't exit immediately - let health check work for deployment
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
}

// Create Supabase client (handle missing env vars gracefully)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false // Server-side usage
      }
    }
  );
} else {
  console.error('⚠️  Supabase client not initialized due to missing environment variables');
}

// Test database connection
async function testConnection() {
  try {
    if (!supabase) {
      console.error('❌ Database connection failed: Supabase client not initialized');
      return false;
    }
    
    const { data, error } = await supabase
      .from('alerts')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
}

module.exports = {
  supabase,
  testConnection
};