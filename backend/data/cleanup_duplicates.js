const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'project.db');
const ACTIONS_PATH = path.join(__dirname, 'cleanup_actions.json');
const PREVIEW_SQL = path.join(__dirname, 'cleanup_preview.sql');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

if (!fs.existsSync(DB_PATH)) {
  console.error('Database not found at', DB_PATH);
  process.exit(1);
}

const backup = DB_PATH + '.manual-bak.' + timestamp();
fs.copyFileSync(DB_PATH, backup);
console.log('Backup created:', backup);

const db = new sqlite3.Database(DB_PATH);

function runAll(sqls, apply) {
  if (!apply) {
    fs.writeFileSync(PREVIEW_SQL, sqls.join('\n') + '\n');
    console.log(`Preview SQL written to ${PREVIEW_SQL}. Run with --apply to execute.`);
    sqls.forEach(s => console.log('SQL:', s));
    process.exit(0);
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION;');
    try {
      sqls.forEach(s => db.run(s));
      db.run('COMMIT;');
      console.log('Changes applied successfully.');
    } catch (err) {
      console.error('Error during apply:', err.message || err);
      db.run('ROLLBACK;');
    }
    process.exit(0);
  });
}

// Get table columns (exclude id and username for merge targets)
function getColumns() {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(users);", (err, rows) => {
      if (err) return reject(err);
      const cols = rows.map(r => r.name);
      resolve(cols);
    });
  });
}

async function main() {
  const dupQuery = `SELECT username, COUNT(*) as c FROM users GROUP BY username HAVING c>1 ORDER BY username;`;
  const dupRows = await new Promise((resolve, reject) => db.all(dupQuery, [], (err, rows) => err ? reject(err) : resolve(rows)));

  if (!dupRows.length) {
    console.log('No duplicate usernames found. Nothing to do.');
    process.exit(0);
  }

  console.log('Duplicate usernames found:');
  for (const r of dupRows) {
    console.log(`- ${r.username} (count=${r.c})`);
    const rows = await new Promise((resolve, reject) => db.all('SELECT id,username,email,role,phone,company,department,role_preference FROM users WHERE username = ? ORDER BY id', [r.username], (e, rs) => e ? reject(e) : resolve(rs)));
    rows.forEach(rr => console.log('   ', rr));
  }

  if (!fs.existsSync(ACTIONS_PATH)) {
    console.log('\nNo actions file found at', ACTIONS_PATH);
    console.log('Create a JSON array of actions to perform (see sample file created).');
    const sample = [
      { op: 'merge', source: 4, target: 2 },
      { op: 'merge', source: 5, target: 3 },
      { op: 'rename', id: 10, username: 'admin_1' },
      { op: 'rename', id: 11, username: 'admin_2' },
      { op: 'rename', id: 12, username: 'alice_1' }
    ];
    fs.writeFileSync(ACTIONS_PATH, JSON.stringify(sample, null, 2));
    console.log('Sample actions written to', ACTIONS_PATH);
    process.exit(0);
  }

  const actions = JSON.parse(fs.readFileSync(ACTIONS_PATH, 'utf8'));
  if (!Array.isArray(actions) || actions.length === 0) {
    console.error('Actions file is empty or invalid JSON array.');
    process.exit(1);
  }

  const cols = await getColumns();
  // columns to attempt to merge (exclude id and username)
  const mergeCols = cols.filter(c => !['id', 'username'].includes(c));

  const sqls = [];

  for (const a of actions) {
    if (a.op === 'merge') {
      const { source, target } = a;
      const sets = mergeCols.map(col => {
        return `${col} = CASE WHEN (${col} IS NULL OR LENGTH(${col})=0) THEN (SELECT ${col} FROM users WHERE id=${source}) ELSE ${col} END`;
      }).join(',\n  ');
      sqls.push(`-- merge ${source} -> ${target}`);
      sqls.push(`UPDATE users SET\n  ${sets}\nWHERE id=${target};`);
      sqls.push(`DELETE FROM users WHERE id=${source};`);
    } else if (a.op === 'delete') {
      sqls.push(`-- delete ${a.id}`);
      sqls.push(`DELETE FROM users WHERE id=${a.id};`);
    } else if (a.op === 'rename') {
      sqls.push(`-- rename ${a.id} -> ${a.username}`);
      sqls.push(`UPDATE users SET username = '${a.username.replace(/'/g, "''")}' WHERE id = ${a.id};`);
    } else {
      console.warn('Unknown op, skipping:', a.op, a);
    }
  }

  const apply = process.argv.includes('--apply');
  runAll(sqls, apply);
}

main().catch(err => {
  console.error('Fatal error:', err && err.message ? err.message : err);
  process.exit(2);
});
