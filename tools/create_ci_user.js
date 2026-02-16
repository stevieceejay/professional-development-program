const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'project.db');
const db = new sqlite3.Database(dbPath);

const username = process.env.CI_USERNAME || 'e2e_ci_user';
const email = process.env.CI_EMAIL || 'e2e_ci_user@example.test';
const password = process.env.CI_PASSWORD || 'Password123!';

(async function(){
  try {
    const hash = await bcrypt.hash(password, 10);
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
      if (err) { console.error('DB error', err); process.exit(1); }
      if (row) { console.log('User already exists:', username); process.exit(0); }
      const stmt = db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)');
      stmt.run([username, email, hash, 'User'], function(err){
        if (err) { console.error('Insert error', err); process.exit(1); }
        console.log('Created test user:', username, 'id:', this.lastID);
        process.exit(0);
      });
    });
  } catch (e) { console.error('Error', e); process.exit(1); }
})();
