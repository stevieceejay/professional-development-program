const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'project.db');
const db = new sqlite3.Database(dbPath);

const users = [
  { username: 'admin', password: 'admin123' },
  { username: 'alice', password: 'alice123' },
  { username: 'bob', password: 'bob123' },
  { username: 'charlie', password: 'charlie123' }
];

async function resetPasswords() {
  console.log('Resetting test user passwords...\n');
  
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ? WHERE username = ?',
        [hash, user.username],
        function(err) {
          if (err) {
            console.error(`❌ Failed to update ${user.username}:`, err.message);
            reject(err);
          } else if (this.changes > 0) {
            console.log(`✅ Updated ${user.username} password`);
            resolve();
          } else {
            console.log(`⚠️  User ${user.username} not found`);
            resolve();
          }
        }
      );
    });
  }
  
  console.log('\n✅ Password reset complete!');
  console.log('\nTest credentials:');
  users.forEach(u => console.log(`   ${u.username} / ${u.password}`));
  
  db.close();
}

resetPasswords().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
