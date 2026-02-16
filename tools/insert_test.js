const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'project.db');
const db = new sqlite3.Database(dbPath);

db.run('INSERT INTO submissions (lesson_id, assignment_id, user_id, content, submitted_at) VALUES (?, ?, ?, ?, ?)', [1, null, 14, 'manual insert test', new Date().toISOString()], function(err) {
  if (err) { console.error('Insert error', err); process.exit(2); }
  console.log('Inserted id', this.lastID);
  db.all('SELECT * FROM submissions WHERE user_id = ?', [14], (err, rows) => {
    if (err) { console.error('Query error', err); process.exit(2); }
    console.log('Rows for user 14:', rows.length);
    console.log(rows);
    db.close();
  });
});
