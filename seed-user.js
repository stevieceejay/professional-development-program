// seed-user.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'backend', 'data', 'project.db');
const db = new sqlite3.Database(dbPath);

async function run() {
  const users = [
    { username: 'admin', email: 'admin@example.test', role: 'Admin', password: 'AdminPass123!' },
    { username: 'alice', email: 'alice@example.test', role: 'User',  password: 'UserPass123!' },
    { username: 'bob',   email: 'bob@example.test', role: 'User',  password: 'BobPass123!' },
    { username: 'charlie', email: 'charlie@example.test', role: 'User', password: 'CharliePass123!' }
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO users (id, username, email, role, password) VALUES ((SELECT id FROM users WHERE username = ?), ?, ?, ?, ?)',
        [u.username, u.username, u.email, u.role, hash],
        (err) => (err ? reject(err) : resolve())
      );
    });
    console.log(`Seeded ${u.username} (${u.role}) - ${u.email}`);
  }

  db.close();
}

run().catch(err => {
  console.error('Seeding error:', err);
  db.close();
});