const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'project.db');
const db = new sqlite3.Database(dbPath);
const userId = process.env.CI_USER_ID || 14;

db.all('SELECT * FROM submissions WHERE user_id = ? ORDER BY submitted_at DESC', [userId], (err, rows) => {
  if (err) {
    console.error('DB error', err);
    process.exit(2);
  }
  console.log('Submissions for user', userId, 'count:', rows.length);
  console.log(rows);
  db.close();
});
