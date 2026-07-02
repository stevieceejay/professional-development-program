const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'project.db');
const db = new sqlite3.Database(dbPath);

const username = process.env.CI_USERNAME || 'e2e_ci_user';
const email = process.env.CI_EMAIL || 'e2e_ci_user@example.test';
const password = process.env.CI_PASSWORD;
if (!password) {
  console.error('CI_PASSWORD environment variable is required to create CI user.');
  process.exit(1);
}

function closeDb(exitCode) {
  db.close((err) => {
    if (err) {
      console.error('Failed to close DB cleanly:', err);
      process.exit(1);
    }
    process.exit(exitCode);
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getColumns(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
      if (err) return reject(err);
      resolve(Array.isArray(rows) ? rows.map((r) => r.name) : []);
    });
  });
}

(async function main() {
  try {
    const hash = await bcrypt.hash(password, 10);
    const userColumns = await getColumns('users');
    const hasOrgId = userColumns.includes('org_id');

    let orgId = 1;
    if (hasOrgId) {
      try {
        const org = await getOne('SELECT id FROM organizations WHERE slug = ?', ['global']);
        orgId = org && org.id ? org.id : 1;
      } catch (_) {
        orgId = 1;
      }
    }

    const existing = await getOne(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );

    if (existing) {
      if (hasOrgId) {
        await run(
          'UPDATE users SET username = ?, email = ?, password = ?, role = ?, org_id = ? WHERE id = ?',
          [username, email, hash, 'User', orgId, existing.id]
        );
      } else {
        await run(
          'UPDATE users SET username = ?, email = ?, password = ?, role = ? WHERE id = ?',
          [username, email, hash, 'User', existing.id]
        );
      }
      console.log('Updated CI user:', username, 'id:', existing.id);
      closeDb(0);
      return;
    }

    let created;
    if (hasOrgId) {
      created = await run(
        'INSERT INTO users (username, email, password, role, org_id) VALUES (?, ?, ?, ?, ?)',
        [username, email, hash, 'User', orgId]
      );
    } else {
      created = await run(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [username, email, hash, 'User']
      );
    }
    console.log('Created CI user:', username, 'id:', created.lastID);
    closeDb(0);
  } catch (err) {
    console.error('CI user seed error:', err);
    closeDb(1);
  }
})();
