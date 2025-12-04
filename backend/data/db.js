const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/project.db');

// Create tables if not exist
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('User', 'Admin')) NOT NULL DEFAULT 'User',
      phone TEXT,
      company TEXT,
      department TEXT,
      role_preference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Active'
    )
  `);

  // Lessons table
  db.run(`
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT NOT NULL
    )
  `);

  // Submissions table
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT,
      file_path TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      graded BOOLEAN DEFAULT 0,
      grade TEXT,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

module.exports = db;