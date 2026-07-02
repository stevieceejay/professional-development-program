const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'project.db');
const db = new sqlite3.Database(dbPath);

const dbGetP = (sql, params) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
const dbRunP = (sql, params) => new Promise((resolve, reject) => db.run(sql, params, function (err) { if (err) return reject(err); resolve({ lastID: this.lastID, changes: this.changes }); }));

(async function(){
  try {
    const lessonId = 1;
    const userId = 14;
    const content = 'replicate upsert at ' + new Date().toISOString();
    const whereClause = 'lesson_id = ?';
    const existing = await dbGetP(`SELECT id, grade FROM submissions WHERE ${whereClause} AND user_id = ?`, [lessonId, userId]);
    console.log('existing:', existing);
    if (existing) {
      const r = await dbRunP('UPDATE submissions SET content = ?, submitted_at = ?, feedback = NULL, grade = NULL WHERE id = ?', [String(content).trim(), new Date().toISOString(), existing.id]);
      console.log('update result', r);
    } else {
      const res = await dbRunP('INSERT INTO submissions (lesson_id, assignment_id, user_id, content, submitted_at) VALUES (?, ?, ?, ?, ?)', [lessonId, null, userId, String(content).trim(), new Date().toISOString()]);
      console.log('insert result', res);
    }
    const rows = await new Promise((resolve, reject) => db.all('SELECT * FROM submissions WHERE user_id = ?', [userId], (e, r) => e?reject(e):resolve(r)));
    console.log('rows now:', rows);
    db.close();
  } catch (err) { console.error('err', err); process.exit(2); }
})();
