const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'project.db');
const db = new sqlite3.Database(dbPath);

db.run('UPDATE submissions SET content = ? WHERE id = ?', ['updated-by-test', 6], function(err) {
  if (err) { console.error('Update error', err); process.exit(2); }
  console.log('Updated changes', this.changes);
  db.get('SELECT * FROM submissions WHERE id = ?', [6], (err, row) => {
    if (err) { console.error('Query error', err); process.exit(2); }
    console.log('Row 6:', row);
    db.close();
  });
});
