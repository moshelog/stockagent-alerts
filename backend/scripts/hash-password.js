#!/usr/bin/env node

const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

console.log('🔐 StockAgent Password Hash Generator');
console.log('=====================================\n');

// Function to mask password input
function askPassword(question) {
  return new Promise((resolve) => {
    rl.question(question, (password) => {
      // Move cursor back and clear the line
      readline.moveCursor(process.stdout, 0, -1);
      readline.clearLine(process.stdout, 0);
      resolve(password);
    });
  });
}

async function main() {
  try {
    console.log('Enter the password you want to hash:');
    const password = await askPassword('Password: ');
    
    if (!password || password.length < 8) {
      console.error('\n❌ Password must be at least 8 characters long');
      process.exit(1);
    }
    
    console.log('\nGenerating secure hash...');
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('\n✅ Password hash generated successfully!\n');
    console.log('Add this to your environment variables (.env file or Railway):\n');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log('\nAlso add these required variables:');
    console.log(`ADMIN_EMAIL=your-email@example.com`);
    console.log(`JWT_SECRET=${require('crypto').randomBytes(32).toString('base64')}`);
    console.log(`JWT_EXPIRES_IN=24h`);
    console.log('\n⚠️  IMPORTANT: Never commit these values to git!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();