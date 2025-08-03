const bcrypt = require('bcrypt');

const password = 'your-password-here'; // Change this to your desired password
const saltRounds = 12;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('\n=== Your Password Hash ===');
        console.log(hash);
        console.log('\nCopy this hash and add it to Railway as ADMIN_PASSWORD_HASH');
        console.log('Remember to delete this file after copying the hash!');
    }
});