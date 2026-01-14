const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use an absolute path relative to this file so the DB opens correctly
// regardless of the current working directory when the process starts.
const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(__dirname, 'project.db');
const db = new sqlite3.Database(dbPath);

// Create tables if not exist
db.serialize(() => {
  // Organizations table (multi-tenant)
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure default Global organization exists
  db.get(`SELECT id FROM organizations WHERE slug = ?`, ['global'], (err, row) => {
    if (!err && !row) {
      const stmt = db.prepare(`INSERT INTO organizations (name, slug, status) VALUES (?, ?, ?)`);
      stmt.run(['Global', 'global', 'active'], () => stmt.finalize());
    }
  });

  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('User', 'Admin')) NOT NULL DEFAULT 'User',
      first_name TEXT,
      last_name TEXT,
      org_id INTEGER,
      phone TEXT,
      company TEXT,
      department TEXT,
      role_preference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      , FOREIGN KEY (org_id) REFERENCES organizations(id)
    )
  `);

  // Projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Active',
      org_id INTEGER,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    )
  `);

  // Lessons table
  db.run(`
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT NOT NULL,
      poster_url TEXT,
      is_placeholder INTEGER DEFAULT 1,
      org_id INTEGER,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    )
  `);

  // Assignments table
  db.run(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      instructions TEXT,
      due_date DATETIME,
      org_id INTEGER,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id)
    )
  `);

  // Submissions table
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER,
      user_id INTEGER NOT NULL,
      content TEXT,
      file_path TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      feedback TEXT,
      grade TEXT,
      org_id INTEGER,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // User visits table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      path TEXT NOT NULL,
      method TEXT NOT NULL,
      user_agent TEXT,
      ip TEXT,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      org_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // --- Lightweight schema migration: ensure columns exist ---
  // Ensure users table has first_name and last_name for better search
  db.all(`PRAGMA table_info(users)`, [], (err, cols) => {
    if (!err && Array.isArray(cols)) {
      const names = cols.map(c => c.name);
      const runAlter = (sql) => new Promise((resolve) => db.run(sql, [], () => resolve()));
      const tasks = [];
      if (!names.includes('first_name')) {
        tasks.push(runAlter(`ALTER TABLE users ADD COLUMN first_name TEXT`));
      }
      if (!names.includes('last_name')) {
        tasks.push(runAlter(`ALTER TABLE users ADD COLUMN last_name TEXT`));
      }
      if (tasks.length) {
        Promise.all(tasks).then(() => {});
      }
    }
  });
  // Some older databases may miss assignment_id, feedback, or grade in submissions.
  db.all(`PRAGMA table_info(submissions)`, [], (err, cols) => {
    if (!err && Array.isArray(cols)) {
      const names = cols.map(c => c.name);
      const runAlter = (sql) => new Promise((resolve) => db.run(sql, [], () => resolve()));
      const tasks = [];
      if (!names.includes('assignment_id')) {
        tasks.push(runAlter(`ALTER TABLE submissions ADD COLUMN assignment_id INTEGER`));
      }
      if (!names.includes('feedback')) {
        tasks.push(runAlter(`ALTER TABLE submissions ADD COLUMN feedback TEXT`));
      }
      if (!names.includes('grade')) {
        tasks.push(runAlter(`ALTER TABLE submissions ADD COLUMN grade TEXT`));
      }
      if (tasks.length) {
        Promise.all(tasks).then(() => {
          // Optionally backfill or set defaults can be added here.
        });
      }
    }
  });
});

module.exports = db;
