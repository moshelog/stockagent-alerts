#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 StockAgent Backend Setup');
console.log('============================\n');

function promptForCredentials() {
  return new Promise((resolve) => {
    console.log('Please provide your Supabase credentials:');
    console.log('(Found in your Supabase project → Settings → API)\n');
    
    rl.question('Supabase Project URL: ', (url) => {
      rl.question('Supabase Anon Key: ', (key) => {
        rl.question('Port (default 3001): ', (port) => {
          resolve({
            url: url.trim(),
            key: key.trim(),
            port: port.trim() || '3001'
          });
        });
      });
    });
  });
}

async function updateEnvFile(credentials) {
  const envPath = path.join(__dirname, '.env');
  
  const envContent = `# Supabase Configuration
SUPABASE_URL=${credentials.url}
SUPABASE_ANON_KEY=${credentials.key}

# Server Configuration
PORT=${credentials.port}
NODE_ENV=development

# Security
WEBHOOK_SECRET=stockagent_webhook_secret_2024
`;

  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Environment file updated successfully!');
}

async function testConnection() {
  console.log('\n🔄 Testing database connection...');
  
  try {
    // Load the updated environment
    require('dotenv').config();
    const { testConnection } = require('./config/database');
    
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Database connection successful!');
      return true;
    } else {
      console.log('❌ Database connection failed!');
      return false;
    }
  } catch (error) {
    console.log('❌ Connection test error:', error.message);
    return false;
  }
}

async function main() {
  try {
    // Check if .env already has credentials
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('your_supabase_project_url')) {
      console.log('No Supabase credentials found in .env file.');
      const credentials = await promptForCredentials();
      await updateEnvFile(credentials);
    } else {
      console.log('✅ Environment file already configured.');
    }
    
    // Test connection
    const connected = await testConnection();
    
    if (connected) {
      console.log('\n🎉 Setup complete! Next steps:');
      console.log('1. Run the database schema in your Supabase SQL editor');
      console.log('2. Start the server with: npm run dev');
      console.log('\nDatabase schema location: scripts/init-schema.sql');
    } else {
      console.log('\n⚠️  Setup incomplete. Please check your credentials.');
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
  } finally {
    rl.close();
  }
}

main();