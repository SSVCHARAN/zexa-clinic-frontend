const bcrypt = require('bcryptjs');
const fs = require('fs');
const hash = bcrypt.hashSync('admin123', 10);
const envContent = `ADMIN_USER=admin\nADMIN_PASS_HASH=${hash}\nSESSION_SECRET=local_secret\n`;
fs.writeFileSync('.env', envContent);
console.log('Created .env');
