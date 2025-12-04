const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'project.db');

function timestamp() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, '-');
}

async function run() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('DB file not found at', DB_PATH);
    process.exit(1);
  }

  const backupPath = DB_PATH + '.bak.' + timestamp();
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('Backup created at', backupPath);

  const db = new sqlite3.Database(DB_PATH);

  try {

    // 1) Check for duplicate non-null emails
    const dupEmailSql = `SELECT email, COUNT(*) as c FROM users WHERE email IS NOT NULL GROUP BY email HAVING c>1;`;
    const dupEmailRows = await new Promise((resolve, reject) => db.all(dupEmailSql, [], (err, rows) => err ? reject(err) : resolve(rows)));
    if (dupEmailRows.length) {
      console.error('Migration aborted: duplicate email values found:');
      dupEmailRows.forEach(r => console.error(r.email, 'count=', r.c));
      console.error('Please resolve duplicates before running the migration. Backup is at', backupPath);
      process.exit(2);
    }

    // 1b) Check for duplicate usernames (must be unique)
    const dupUserSql = `SELECT username, COUNT(*) as c FROM users WHERE username IS NOT NULL GROUP BY username HAVING c>1;`;
    const dupUserRows = await new Promise((resolve, reject) => db.all(dupUserSql, [], (err, rows) => err ? reject(err) : resolve(rows)));
    if (dupUserRows.length) {
      console.error('Migration aborted: duplicate username values found:');
      dupUserRows.forEach(r => console.error(r.username, 'count=', r.c));
      console.error('Please resolve duplicate usernames before running the migration. Backup is at', backupPath);
      process.exit(2);
    }

    console.log('No duplicate emails found, proceeding with safe migration...');

    await new Promise((resolve, reject) => db.serialize(() => {
      db.exec('BEGIN TRANSACTION;', (e) => e ? reject(e) : resolve());
    }));

    // 2) Create new table with desired schema (email UNIQUE, created_at default)
    const createSql = `
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT CHECK(role IN ('User','Admin')) NOT NULL DEFAULT 'User',
        phone TEXT,
        company TEXT,
        department TEXT,
        role_preference TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await new Promise((resolve, reject) => db.run(createSql, function(err) { if (err) reject(err); else resolve(); }));

    // 3) Copy data into new table.
    // Some older DBs may not have `created_at`; handle that case gracefully.
    const copySqlWithCreatedAt = `
      INSERT INTO users_new (id, username, email, password, role, phone, company, department, role_preference, created_at)
      SELECT id, username, email, password, CASE WHEN role IN ('User','Admin') THEN role ELSE 'User' END, phone, company, department, role_preference, COALESCE(created_at, CURRENT_TIMESTAMP)
      FROM users;
    `;

    const copySqlFallback = `
      INSERT INTO users_new (id, username, email, password, role, phone, company, department, role_preference, created_at)
      SELECT id, username, email, password, CASE WHEN role IN ('User','Admin') THEN role ELSE 'User' END, phone, company, department, role_preference, CURRENT_TIMESTAMP
      FROM users;
    `;

    try {
      await new Promise((resolve, reject) => db.run(copySqlWithCreatedAt, function(err) { if (err) reject(err); else resolve(); }));
    } catch (copyErr) {
      // If created_at does not exist in the old table, fall back to using CURRENT_TIMESTAMP
      if (copyErr && String(copyErr.message).toLowerCase().includes('no such column: created_at')) {
        console.warn('Original table lacks created_at column — using CURRENT_TIMESTAMP for migrated rows.');
        await new Promise((resolve, reject) => db.run(copySqlFallback, function(err) { if (err) reject(err); else resolve(); }));
      } else {
        throw copyErr;
      }
    }

    // 4) Drop old table and rename new
    await new Promise((resolve, reject) => db.run('DROP TABLE users;', function(err) { if (err) reject(err); else resolve(); }));
    await new Promise((resolve, reject) => db.run("ALTER TABLE users_new RENAME TO users;", function(err) { if (err) reject(err); else resolve(); }));

    await new Promise((resolve, reject) => db.exec('COMMIT;', (err) => err ? reject(err) : resolve()));

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    try { db.exec('ROLLBACK;'); } catch (e) {}
    console.error('You can restore from backup:', backupPath);
    process.exit(3);
  } finally {
    db.close();
  }
}

run();
