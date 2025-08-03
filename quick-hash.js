const bcrypt = require('bcrypt');

// CHANGE THIS TO YOUR DESIRED PASSWORD
const password = 'your-password-here';  

bcrypt.hash(password, 12, function(err, hash) {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('\n=== Copy this hash to Railway ===\n');
        console.log(hash);
        console.log('\n=================================\n');
    }
});