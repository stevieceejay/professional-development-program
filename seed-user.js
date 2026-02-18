// seed-user.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'backend', 'data', 'project.db');
const db = new sqlite3.Database(dbPath);

async function run() {
  // Passwords for seeded users must be provided via environment variables.
  // For example: set SEED_ADMIN_PASSWORD, SEED_ALICE_PASSWORD, SEED_BOB_PASSWORD, SEED_CHARLIE_PASSWORD
  const users = [
    { username: 'admin', email: 'admin@example.test', role: 'Admin', envPassword: 'SEED_ADMIN_PASSWORD' },
    { username: 'alice', email: 'alice@example.test', role: 'User', envPassword: 'SEED_ALICE_PASSWORD' },
    { username: 'bob',   email: 'bob@example.test', role: 'User', envPassword: 'SEED_BOB_PASSWORD' },
    { username: 'charlie', email: 'charlie@example.test', role: 'User', envPassword: 'SEED_CHARLIE_PASSWORD' }
  ];

  const defaultPass = process.env.SEED_DEFAULT_PASSWORD || '';
  for (const u of users) {
    const password = process.env[u.envPassword] || defaultPass;
    if (!password) {
      console.error(`Missing password for seeded user: ${u.username}. Set ${u.envPassword} or SEED_DEFAULT_PASSWORD environment variable.`);
      process.exit(1);
    }
    const hash = await bcrypt.hash(password, 10);
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