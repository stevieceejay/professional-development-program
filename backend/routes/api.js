/**
 * Professional Development Project platform - API Routes
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const marked = require('marked');
const bcrypt = require('bcrypt');
const db = require('../data/db');
const multer = require('multer');
const os = require('os');
const { sanitizeInput, isValidEmail, isValidUsername, validatePasswordStrength } = require('../middleware/security');
const aiHelper = require('../services/ai-helper');
const uploadRoot = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadRoot)) {
  try { fs.mkdirSync(uploadRoot); } catch {}
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const user = req.session && req.session.user;
    const userDir = path.join(uploadRoot, user ? String(user.id) : 'anonymous');
    try { if (!fs.existsSync(userDir)) fs.mkdirSync(userDir); } catch {}
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '_' + safe);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for video uploads
  },
  fileFilter: (req, file, cb) => {
    // Allow videos, documents, and images
    const allowedTypes = /mp4|mov|avi|wmv|webm|pdf|docx|doc|txt|jpg|jpeg|png|gif/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only videos, documents, and images are allowed.'));
    }
  }
});
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const crypto = require('crypto');

// ---- Org Token Helpers (simple HMAC-signed token) ----
function base64url(input){
  return Buffer.from(JSON.stringify(input)).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function signToken(payload, ttlSec = 1800){ // default 30m
  const secret = process.env.ORG_TOKEN_SECRET || (process.env.SESSION_SECRET || 'dev-secret');
  const now = Math.floor(Date.now()/1000);
  const body = { ...payload, iat: now, exp: now + ttlSec, jti: crypto.randomBytes(8).toString('hex') };
  const data = base64url(body);
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sig}`;
}
function verifyToken(token){
  try{
    const [data, sig] = String(token).split('.');
    const secret = process.env.ORG_TOKEN_SECRET || (process.env.SESSION_SECRET || 'dev-secret');
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    if(expected !== sig) return null;
    const body = JSON.parse(Buffer.from(data.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'));
    if(!body || (body.exp && Math.floor(Date.now()/1000) > body.exp)) return null;
    return body;
  } catch(_){ return null; }
}

// Resolve org_id from session if present
function getSessionOrgId(req){
  return req && req.session && req.session.org && req.session.org.id ? Number(req.session.org.id) : null;
}

// --- Signup route ---
router.post('/signup', (req, res) => {
  let { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ status: 'error', message: 'All fields are required' });
  }

  // Sanitize inputs
  username = sanitizeInput(username);
  email = sanitizeInput(email).toLowerCase();

  // Validate username format
  if (!isValidUsername(username)) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens' 
    });
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({ status: 'error', message: 'Invalid email format' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ status: 'error', message: 'Passwords do not match' });
  }

  // Basic password validation (keep simple for now, or use validatePasswordStrength for stricter)
  if (password.length < 8) {
    return res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters' });
  }

  // Hash password
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Hashing error:', err);
      return res.status(500).json({ status: 'error', message: 'Error creating account' });
    }

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, role, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    stmt.run([username, email, hashedPassword, 'User'], function (err) {
      if (err) {
        let errMsg = 'Error creating account';
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          errMsg = 'Username or email already exists';
        }
        return res.status(400).json({ status: 'error', message: errMsg });
      }

      // Auto-login after signup
      req.session.user = { id: this.lastID, username, email, role: 'User' };
      res.json({
        status: 'success',
        message: 'Account created successfully! Welcome!',
        user: { id: this.lastID, username, email, role: 'User' }
      });
    });
    stmt.finalize();
  });
});

// --- Signin route ---
router.post('/signin', (req, res) => {
  let { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Username and password are required' });
  }

  // Sanitize input
  username = sanitizeInput(username).toLowerCase();

  // Query user by username or email
  db.get(
    'SELECT id, username, email, password, role FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?',
    [username, username],
    (err, user) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ status: 'error', message: 'Error signing in' });
      }

      if (!user) {
        // Use same message to prevent username enumeration
        return res.status(401).json({ status: 'error', message: 'Invalid username or password' });
      }

      // Compare password with hash
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Bcrypt error:', err);
          return res.status(500).json({ status: 'error', message: 'Error signing in' });
        }

        if (!isMatch) {
          // Same message as above to prevent timing attacks
          return res.status(401).json({ status: 'error', message: 'Invalid username or password' });
        }

        // Regenerate session ID to prevent session fixation
        req.session.regenerate((regenerateErr) => {
          if (regenerateErr) {
            console.error('Session regeneration error:', regenerateErr);
            return res.status(500).json({ status: 'error', message: 'Error signing in' });
          }

          // Store session
          req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };
          
          res.json({
            status: 'success',
            message: 'Signed in successfully!',
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
          });
        });
      });
    });
});

// --- Update lesson by week (Admin) ---
router.put('/lessons/:week', (req, res) => {
  const week = Number(req.params.week);
  const { title, description, video_url } = req.body || {};

  if (!week || week < 1 || week > 52) {
    return res.status(400).json({ status: 'error', message: 'Invalid week' });
  }

  // Optional: simple admin guard if session has role Admin
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  }

  db.get('SELECT id FROM lessons WHERE week = ?', [week], (err, row) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }
    const fields = [];
    const values = [];
    if (typeof title === 'string') { fields.push('title = ?'); values.push(title); }
    if (typeof description === 'string') { fields.push('description = ?'); values.push(description); }
    if (typeof video_url === 'string') { fields.push('video_url = ?'); values.push(video_url); }

    if (fields.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No updatable fields provided' });
    }

    if (row) {
      const sql = `UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`;
      values.push(row.id);
      db.run(sql, values, function (uErr) {
        if (uErr) {
          console.error('Update error:', uErr);
          return res.status(500).json({ status: 'error', message: 'Failed to update lesson' });
        }
        return res.json({ status: 'success', message: `Updated Week ${week} lesson`, id: row.id });
      });
    } else {
      // If no row exists, insert with provided fields
      const insert = {
        week,
        title: typeof title === 'string' ? title : `Week ${week}`,
        description: typeof description === 'string' ? description : '',
        video_url: typeof video_url === 'string' ? video_url : null
      };
      db.run(
        'INSERT INTO lessons (week, title, description, video_url) VALUES (?, ?, ?, ?)',
        [insert.week, insert.title, insert.description, insert.video_url],
        function (iErr) {
          if (iErr) {
            console.error('Insert error:', iErr);
            return res.status(500).json({ status: 'error', message: 'Failed to create lesson' });
          }
          return res.json({ status: 'success', message: `Created Week ${week} lesson`, id: this.lastID });
        }
      );
    }
  });
});

// Middleware: requireAdmin
function requireAdmin(req, res, next) {
  const role = req.session && req.session.user && req.session.user.role;
  if (role && String(role).toLowerCase() === 'admin') {
    return next();
  }
  return res.status(403).json({ status: 'error', message: 'Forbidden: Admins only' });
}

// --- Session info ---
router.get('/session', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ status: 'success', data: req.session.user });
  }
  res.json({ status: 'error', message: 'Not logged in' });
});

// --- Organizations (Admin) ---
router.get('/orgs', (req, res) => {
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  }
  db.all('SELECT id, name, slug, status, created_at FROM organizations ORDER BY id', [], (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

router.post('/orgs', (req, res) => {
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  }
  const { name, slug, status } = req.body || {};
  if (!name || !slug) return res.status(400).json({ status: 'error', message: 'name and slug required' });
  const stmt = db.prepare('INSERT INTO organizations (name, slug, status) VALUES (?, ?, ?)');
  stmt.run([name, slug, status || 'active'], function (err) {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', id: this.lastID });
  });
  stmt.finalize();
});

router.put('/orgs/:id', (req, res) => {
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  }
  const { id } = req.params;
  const { name, slug, status } = req.body || {};
  const fields = [];
  const values = [];
  if (typeof name === 'string') { fields.push('name = ?'); values.push(name); }
  if (typeof slug === 'string') { fields.push('slug = ?'); values.push(slug); }
  if (typeof status === 'string') { fields.push('status = ?'); values.push(status); }
  if (!fields.length) return res.status(400).json({ status: 'error', message: 'No fields to update' });
  const sql = `UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);
  db.run(sql, values, function (err) {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', updated: this.changes });
  });
});

router.delete('/orgs/:id', (req, res) => {
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  }
  const { id } = req.params;
  db.run('DELETE FROM organizations WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', deleted: this.changes });
  });
});

// --- Projects ---
router.get('/projects', (req, res) => {
  const orgId = getSessionOrgId(req);
  const sql = orgId ? 'SELECT * FROM projects WHERE org_id = ? ORDER BY id' : 'SELECT * FROM projects ORDER BY id';
  const params = orgId ? [orgId] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

// --- Logout ---
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ status: 'success', message: 'Logged out' });
  });
});

// --- Session info ---
router.get('/session', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ status: 'success', data: req.session.user });
  }
  return res.status(200).json({ status: 'error', message: 'No active session' });
});

// --- CRUD: Users (Admin only) ---
router.get('/users', requireAdmin, (req, res) => {
  db.all('SELECT id, username, email, role FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

  // Users list (admin-only), scoped by org when session org exists
  router.get('/users', async (req, res) => {
    try {
      if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Admin required' });
      }
      const orgId = getSessionOrgId(req);
      const { limit = 100, offset = 0, role, status, email, q } = req.query;
      const where = [];
      const params = [];
      if (orgId) { where.push('org_id = ?'); params.push(orgId); }
      if (role) { where.push('role = ?'); params.push(role); }
      if (status) { where.push('status = ?'); params.push(status); }
      if (email) { where.push('email LIKE ?'); params.push(`%${email}%`); }
      if (q) {
        // Match first + last name, or either individually, plus email
        where.push(`(LOWER(COALESCE(first_name,'')) || ' ' || LOWER(COALESCE(last_name,'')) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(email) LIKE ?)`);
        const qLike = `%${String(q).toLowerCase()}%`;
        params.push(qLike, qLike, qLike, qLike);
      }
      const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const sql = `SELECT id, COALESCE(first_name,'') as first_name, COALESCE(last_name,'') as last_name, email, org_id, role, status FROM users ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`;
      params.push(Number(limit));
      params.push(Number(offset));
      const rows = db.prepare(sql).all(...params);
      const data = rows.map(r => ({
        id: r.id,
        first_name: r.first_name || '',
        last_name: r.last_name || '',
        name: `${(r.first_name||'').trim()} ${(r.last_name||'').trim()}`.trim(),
        email: r.email,
        org_id: r.org_id,
        role: r.role,
        status: r.status,
      }));
      res.json({ status: 'success', data });
    } catch (err) {
      console.error('GET /api/users failed', err);
      res.status(500).json({ status: 'error', message: 'Server error' });
    }
  });
router.post('/users', requireAdmin, (req, res) => {
  const { username, email, role, password } = req.body;
  if (!username || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Hash default password if not provided
  const defaultPassword = password || 'Welcome123';
  bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ error: 'Error creating user' });
    }
    
    const stmt = db.prepare(`INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, datetime('now'))`);
    stmt.run([username, email, hashedPassword, role], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, username, email, role });
    });
    stmt.finalize();
  });
});

router.put('/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body;
  db.run(
    `UPDATE users SET username=?, email=?, role=? WHERE id=?`,
    [username, email, role, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM users WHERE id=?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// --- Lessons routes ---
router.get('/lessons', (req, res) => {
  const orgId = getSessionOrgId(req);
  const sql = orgId ? 'SELECT * FROM lessons WHERE org_id = ? ORDER BY week, id' : 'SELECT * FROM lessons ORDER BY week, id';
  const params = orgId ? [orgId] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

router.get('/lessons/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM lessons WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    if (!row) return res.status(404).json({ status: 'error', message: 'Lesson not found' });
    res.json({ status: 'success', data: row });
  });
});

router.post('/lessons', requireAdmin, (req, res) => {
  const { title, description, video_url } = req.body;
  if (!title || !video_url) {
    return res.status(400).json({ status: 'error', message: 'Title and video_url are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO lessons (title, description, video_url)
    VALUES (?, ?, ?)
  `);
  stmt.run([title, description || null, video_url], function (err) {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', id: this.lastID });
  });
  stmt.finalize();
});

// --- Assignments routes ---
router.get('/assignments', (req, res) => {
  const orgId = getSessionOrgId(req);
  const sql = orgId ? 'SELECT * FROM assignments WHERE org_id = ? ORDER BY lesson_id, id' : 'SELECT * FROM assignments ORDER BY lesson_id, id';
  const params = orgId ? [orgId] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

router.get('/assignments/lesson/:lessonId', (req, res) => {
  const { lessonId } = req.params;
  const orgId = getSessionOrgId(req);
  const sql = orgId ? 'SELECT * FROM assignments WHERE lesson_id = ? AND org_id = ?' : 'SELECT * FROM assignments WHERE lesson_id = ?';
  const params = orgId ? [lessonId, orgId] : [lessonId];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

router.post('/assignments', requireAdmin, (req, res) => {
  const { lesson_id, title, instructions, due_date } = req.body;
  if (!lesson_id || !title || !instructions) {
    return res.status(400).json({ status: 'error', message: 'Lesson ID, title, and instructions are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO assignments (lesson_id, title, instructions, due_date)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run([lesson_id, title, instructions, due_date], function (err) {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', id: this.lastID });
  });
  stmt.finalize();
});

// --- Submissions routes ---
router.post('/submissions', (req, res) => {
  const { assignment_id, lesson_id, content } = req.body;
  const user = req.session.user;
  const orgId = getSessionOrgId(req);

  if (!user) {
    return res.status(403).json({ status: 'error', message: 'Not logged in' });
  }
  if ((!assignment_id && !lesson_id) || !content) {
    return res.status(400).json({ status: 'error', message: 'Assignment ID (or legacy lesson_id) and content are required' });
  }

  // Detect legacy schema where column is lesson_id instead of assignment_id
  db.all(`PRAGMA table_info(submissions)`, [], (err, cols) => {
    const names = Array.isArray(cols) ? cols.map(c => c.name) : [];
    const hasLessonId = names.includes('lesson_id');
    const hasAssignmentId = names.includes('assignment_id');

    let sql, params;
    if (hasLessonId && !hasAssignmentId) {
      // Legacy: use lesson_id column
      if (!lesson_id && assignment_id) {
        // If only assignment_id provided, try to resolve its lesson_id
        return db.get('SELECT lesson_id FROM assignments WHERE id = ?', [Number(assignment_id)], (gErr, row) => {
          if (gErr) return res.status(500).json({ status: 'error', message: gErr.message });
          const lid = row ? row.lesson_id : null;
          if (!lid) return res.status(400).json({ status: 'error', message: 'Could not resolve lesson_id from assignment_id' });
          const stmt = db.prepare(`INSERT INTO submissions (lesson_id, user_id, content${orgId ? ', org_id' : ''}) VALUES (${orgId ? '?, ?, ?, ?' : '?, ?, ?'})`);
          const p = orgId ? [lid, user.id, content, orgId] : [lid, user.id, content];
          stmt.run(p, function (iErr) {
            if (iErr) return res.status(500).json({ status: 'error', message: iErr.message });
            return res.json({ status: 'success', id: this.lastID });
          });
          stmt.finalize();
        });
      }
      sql = `INSERT INTO submissions (lesson_id, user_id, content${orgId ? ', org_id' : ''}) VALUES (${orgId ? '?, ?, ?, ?' : '?, ?, ?'})`;
      params = orgId ? [Number(lesson_id), user.id, content, orgId] : [Number(lesson_id), user.id, content];
    } else if (hasLessonId && hasAssignmentId) {
      // Mixed schema: ensure NOT NULL lesson_id satisfied and include assignment_id when known
      let lid = Number(lesson_id);
      let aid = Number(assignment_id);
      const finishInsert = (finalLid, finalAid) => {
        if (!finalLid) return res.status(400).json({ status: 'error', message: 'lesson_id required (resolved or provided)' });
        // Insert both columns to satisfy NOT NULL constraints on legacy DBs
        sql = `INSERT INTO submissions (lesson_id, assignment_id, user_id, content${orgId ? ', org_id' : ''}) VALUES (${orgId ? '?, ?, ?, ?, ?' : '?, ?, ?, ?'})`;
        params = orgId ? [finalLid, finalAid || null, user.id, content, orgId] : [finalLid, finalAid || null, user.id, content];
        const stmt = db.prepare(sql);
        stmt.run(params, function (iErr) {
          if (iErr) return res.status(500).json({ status: 'error', message: iErr.message });
          res.json({ status: 'success', id: this.lastID });
        });
        stmt.finalize();
      };
      if (!lid && aid) {
        // Resolve lesson_id from assignment
        return db.get('SELECT lesson_id FROM assignments WHERE id = ?', [aid], (gErr, row) => {
          if (gErr) return res.status(500).json({ status: 'error', message: gErr.message });
          finishInsert(row ? Number(row.lesson_id) : null, aid);
        });
      }
      return finishInsert(lid, aid);
    } else {
      // Current schema: use assignment_id
      sql = `INSERT INTO submissions (assignment_id, user_id, content) VALUES (?, ?, ?)`;
      params = [Number(assignment_id), user.id, content];
    }

    if (sql) {
      const stmt = db.prepare(sql);
      stmt.run(params, function (iErr) {
        if (iErr) return res.status(500).json({ status: 'error', message: iErr.message });
        res.json({ status: 'success', id: this.lastID });
      });
      stmt.finalize();
    }
  });
});

// File upload submission: stores file and records in submissions with file_path
router.post('/submissions/upload', upload.single('file'), (req, res) => {
  const user = req.session && req.session.user;
  if (!user) {
    return res.status(403).json({ status: 'error', message: 'Not logged in' });
  }
  const assignment_id = Number(req.body.assignment_id);
  if (!assignment_id || !req.file) {
    return res.status(400).json({ status: 'error', message: 'assignment_id and file are required' });
  }

  const filePathRel = path.join('uploads', String(user.id), req.file.filename);

  const stmt = db.prepare(`
    INSERT INTO submissions (assignment_id, user_id, content, file_path)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run([assignment_id, user.id, req.body.content || null, filePathRel], function (err) {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', id: this.lastID, file: filePathRel });
  });
  stmt.finalize();
});

router.get('/submissions', requireAdmin, (req, res) => {
  db.all(`
    SELECT s.id, s.assignment_id, s.user_id, s.content, s.submitted_at, s.feedback, s.grade,
           u.username, a.title AS assignment_title
    FROM submissions s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN assignments a ON s.assignment_id = a.id
    ORDER BY s.submitted_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

// Current user submissions
router.get('/submissions/me', (req, res) => {
  const user = req.session && req.session.user;
  if (!user) return res.status(403).json({ status: 'error', message: 'Not logged in' });
  const sql = `
    SELECT s.id, s.assignment_id, s.user_id, s.content, s.file_path, s.submitted_at, s.feedback, s.grade,
           a.title AS assignment_title
    FROM submissions s
    LEFT JOIN assignments a ON s.assignment_id = a.id
    WHERE s.user_id = ?
    ORDER BY s.submitted_at DESC
  `;
  db.all(sql, [user.id], (err, rows) => {
    if (err) {
      const msg = String(err && err.message || '');
      // Fallback for older databases missing assignment_id column
      if (msg.includes('no such column: s.assignment_id') || msg.includes('no such column: assignment_id')) {
        const fallback = `
          SELECT id, NULL as assignment_id, user_id, content, file_path, submitted_at, feedback, grade,
                 NULL as assignment_title
          FROM submissions
          WHERE user_id = ?
          ORDER BY submitted_at DESC
        `;
        return db.all(fallback, [user.id], (fErr, fRows) => {
          if (fErr) return res.status(500).json({ status: 'error', message: fErr.message });
          return res.json({ status: 'success', data: fRows });
        });
      }
      // Fallback for older databases missing feedback/grade columns
      if (msg.includes('no such column: feedback') || msg.includes('no such column: grade')) {
        const fallback = `
          SELECT id, NULL as assignment_id, user_id, content, file_path, submitted_at,
                 NULL as feedback, NULL as grade, NULL as assignment_title
          FROM submissions
          WHERE user_id = ?
          ORDER BY submitted_at DESC
        `;
        return db.all(fallback, [user.id], (fErr, fRows) => {
          if (fErr) return res.status(500).json({ status: 'error', message: fErr.message });
          return res.json({ status: 'success', data: fRows });
        });
      }
      return res.status(500).json({ status: 'error', message: err.message });
    }
    res.json({ status: 'success', data: rows });
  });
});

router.put('/submissions/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { feedback, grade } = req.body;

  db.run(
    `UPDATE submissions SET feedback=?, grade=? WHERE id=?`,
    [feedback, grade, id],
    function (err) {
      if (err) return res.status(500).json({ status: 'error', message: err.message });
      res.json({ status: 'success', updated: this.changes });
    }
  );
});

module.exports = router;
 
// --- Admin analytics: user visits ---
// List raw visits (paginated)
router.get('/analytics/visits', requireAdmin, (req, res) => {
  const { limit = 100, offset = 0, start, end, path, user_id } = req.query;
  const where = [];
  const params = [];
  if (start) { where.push('v.visited_at >= ?'); params.push(start); }
  if (end) { where.push('v.visited_at <= ?'); params.push(end); }
  if (path) { where.push('v.path LIKE ?'); params.push(`%${path}%`); }
  if (user_id) { where.push('v.user_id = ?'); params.push(Number(user_id)); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sql = `SELECT v.id, v.user_id, u.username, v.path, v.method, v.user_agent, v.ip, v.visited_at
               FROM user_visits v
               LEFT JOIN users u ON v.user_id = u.id
               ${whereSql}
               ORDER BY v.id DESC
               LIMIT ? OFFSET ?`;
  params.push(Number(limit));
  params.push(Number(offset));
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

  // User visits list (admin-only), scoped by org when session org exists
  router.get('/user_visits', async (req, res) => {
    try {
      if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Admin required' });
      }
      const orgId = getSessionOrgId(req);
      const { limit = 100, offset = 0, start, end, path, user_id } = req.query;
      const where = [];
      const params = [];
      if (orgId) { where.push('org_id = ?'); params.push(orgId); }
      if (start) { where.push('visited_at >= ?'); params.push(start); }
      if (end) { where.push('visited_at <= ?'); params.push(end); }
      if (path) { where.push('path LIKE ?'); params.push(`%${path}%`); }
      if (user_id) { where.push('user_id = ?'); params.push(Number(user_id)); }
      const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const sql = `SELECT id, user_id, path, visited_at, org_id FROM user_visits ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`;
      params.push(Number(limit));
      params.push(Number(offset));
      const rows = db.prepare(sql).all(...params);
      res.json({ status: 'success', data: rows });
    } catch (err) {
      console.error('GET /api/user_visits failed', err);
      res.status(500).json({ status: 'error', message: 'Server error' });
    }
  });

  // --- Admin: unified user search ---
  router.get('/admin/user_search', async (req, res) => {
    try {
      if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Admin required' });
      }
      const orgId = getSessionOrgId(req);
      const q = (req.query.q || '').toString().trim().toLowerCase();
      const role = (req.query.role || '').toString().trim();
      const status = (req.query.status || '').toString().trim();
      const emailFilter = (req.query.email || '').toString().trim().toLowerCase();
      const pathFilter = (req.query.path || '').toString().trim().toLowerCase();
      const start = (req.query.start || '').toString().trim();
      const end = (req.query.end || '').toString().trim();
      const userIdFilter = req.query.user_id ? Number(req.query.user_id) : null;
      const projectName = (req.query.projectName || '').toString().trim().toLowerCase();
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      if (!q) return res.json({ status: 'success', data: [], exists: false });

      // Users by first/last name or email
      const whereUsers = [];
      const paramsUsers = [];
      if (orgId) { whereUsers.push('org_id = ?'); paramsUsers.push(orgId); }
      if (q) {
        const qLike = `%${q}%`;
        whereUsers.push(`(LOWER(COALESCE(first_name,'')) || ' ' || LOWER(COALESCE(last_name,'')) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(email) LIKE ?)`);
        paramsUsers.push(qLike, qLike, qLike, qLike);
      }
      if (emailFilter) { whereUsers.push('LOWER(email) LIKE ?'); paramsUsers.push(`%${emailFilter}%`); }
      if (role) { whereUsers.push('role = ?'); paramsUsers.push(role); }
      if (status) { whereUsers.push('status = ?'); paramsUsers.push(status); }
      const sqlUsers = `SELECT id, COALESCE(first_name,'') as first_name, COALESCE(last_name,'') as last_name, email, org_id, role, status FROM users ${whereUsers.length ? 'WHERE '+whereUsers.join(' AND ') : ''} ORDER BY id DESC LIMIT ? OFFSET ?`;
      paramsUsers.push(limit, offset);
      const userRows = db.prepare(sqlUsers).all(...paramsUsers);
      const users = userRows.map(r => ({
        id: r.id,
        first_name: r.first_name || '',
        last_name: r.last_name || '',
        name: `${(r.first_name||'').trim()} ${(r.last_name||'').trim()}`.trim(),
        email: r.email,
        org_id: r.org_id,
        role: r.role,
        status: r.status,
      }));

      // Visits by path or timestamp match
      const whereVisits = [];
      const paramsVisits = [];
      if (orgId) { whereVisits.push('org_id = ?'); paramsVisits.push(orgId); }
      if (q) { whereVisits.push('(LOWER(path) LIKE ? OR CAST(visited_at AS TEXT) LIKE ?)'); paramsVisits.push(`%${q}%`, `%${q}%`); }
      if (pathFilter) { whereVisits.push('LOWER(path) LIKE ?'); paramsVisits.push(`%${pathFilter}%`); }
      if (start) { whereVisits.push('visited_at >= ?'); paramsVisits.push(start); }
      if (end) { whereVisits.push('visited_at <= ?'); paramsVisits.push(end); }
      if (userIdFilter) { whereVisits.push('user_id = ?'); paramsVisits.push(userIdFilter); }
      const sqlVisits = `SELECT id, user_id, path, visited_at, org_id FROM user_visits ${whereVisits.length ? 'WHERE '+whereVisits.join(' AND ') : ''} ORDER BY id DESC LIMIT ? OFFSET ?`;
      paramsVisits.push(limit, offset);
      const visits = db.prepare(sqlVisits).all(...paramsVisits);

      // Projects: name match (if projects table has org_id)
      let projects = [];
      try {
        const whereProjects = [];
        const paramsProjects = [];
        if (orgId) { whereProjects.push('org_id = ?'); paramsProjects.push(orgId); }
        if (q) { whereProjects.push('LOWER(name) LIKE ?'); paramsProjects.push(`%${q}%`); }
        if (projectName) { whereProjects.push('LOWER(name) LIKE ?'); paramsProjects.push(`%${projectName}%`); }
        const sqlProjects = `SELECT id, name, status, org_id FROM projects ${whereProjects.length ? 'WHERE '+whereProjects.join(' AND ') : ''} ORDER BY id DESC LIMIT ? OFFSET ?`;
        paramsProjects.push(limit, offset);
        projects = db.prepare(sqlProjects).all(...paramsProjects);
      } catch(_) {}

      const exists = users.length > 0;
      res.json({ status: 'success', data: { users, visits, projects }, exists });
    } catch (err) {
      console.error('GET /api/admin/user_search failed', err);
      res.status(500).json({ status: 'error', message: 'Server error' });
    }
  });

  // --- Admin: user details view (projects, visits, submissions/files)
  // sqlite3 helpers
  function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }
  function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(Array.isArray(rows) ? rows : []);
      });
    });
  }

  router.get('/admin/users/:id/details', requireAdmin, async (req, res) => {
    try {
      const orgId = getSessionOrgId(req);
      const userId = Number(req.params.id);
      if (!userId) return res.status(400).json({ status: 'error', message: 'Invalid user id' });

      // User basic info
      const userWhere = orgId ? 'WHERE id = ? AND org_id = ?' : 'WHERE id = ?';
      const userParams = orgId ? [userId, orgId] : [userId];
      const user = await dbGet(`SELECT id, username, first_name, last_name, email, role, org_id FROM users ${userWhere} LIMIT 1`, userParams);
      if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
      const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
      user.name = displayName || user.username || user.email || `User #${user.id}`;

      // Projects by org (if projects have user ownership, fallback to all projects in org)
      let projects = [];
      try {
        // Attempt to get projects linked via submissions or ownership
        if (orgId) {
          projects = await dbAll(`
            SELECT DISTINCT p.id, p.name, p.status, p.org_id
            FROM projects p
            LEFT JOIN submissions s ON s.org_id = p.org_id
            WHERE p.org_id = ?
            ORDER BY p.id DESC
          `, [orgId]);
        } else {
          projects = await dbAll(`SELECT id, name, status, org_id FROM projects ORDER BY id DESC`, []);
        }
      } catch (_) {}

      // Visits for this user
      const visitsSql = orgId
        ? 'SELECT id, user_id, path, visited_at FROM user_visits WHERE user_id = ? AND org_id = ? ORDER BY id DESC LIMIT 500'
        : 'SELECT id, user_id, path, visited_at FROM user_visits WHERE user_id = ? ORDER BY id DESC LIMIT 500';
      const visits = await dbAll(visitsSql, orgId ? [userId, orgId] : [userId]);

      // Submissions/files for this user, enriched with assignment and lesson
      let submissions = [];
      try {
        const baseSql = `
          SELECT s.id, s.assignment_id, s.content, s.file_path, s.submitted_at,
                 a.title AS assignment_title, a.lesson_id,
                 l.week AS lesson_week, l.title AS lesson_title
          FROM submissions s
          LEFT JOIN assignments a ON a.id = s.assignment_id
          LEFT JOIN lessons l ON l.id = a.lesson_id
        `;
        const where = orgId ? 'WHERE s.user_id = ? AND s.org_id = ?' : 'WHERE s.user_id = ?';
        const order = 'ORDER BY s.id DESC';
        const sql = `${baseSql} ${where} ${order}`;
        submissions = await dbAll(sql, orgId ? [userId, orgId] : [userId]);
      } catch (_) {}

      // Derive activity links to lessons (where submissions exist)
      const activity = submissions
        .filter(s => s.lesson_id)
        .map(s => ({
          lesson_id: s.lesson_id,
          lesson_title: s.lesson_title || `Lesson ${s.lesson_id}`,
          week: s.lesson_week || null,
          href: `lessons.html#assignment-${s.lesson_id}`
        }));

      res.json({ status: 'success', data: { user, projects, visits, submissions, activity } });
    } catch (err) {
      console.error('GET /api/admin/users/:id/details failed', err);
      res.status(500).json({ status: 'error', message: 'Server error' });
    }
  });
// Aggregate visits per user
router.get('/analytics/visits/by-user', requireAdmin, (req, res) => {
  const { start, end } = req.query;
  const where = [];
  const params = [];
  if (start) { where.push('v.visited_at >= ?'); params.push(start); }
  if (end) { where.push('v.visited_at <= ?'); params.push(end); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sql = `SELECT COALESCE(u.username, 'Anonymous') AS username,
                      v.user_id,
                      COUNT(*) AS visits,
                      MIN(v.visited_at) AS first_visit,
                      MAX(v.visited_at) AS last_visit
               FROM user_visits v
               LEFT JOIN users u ON v.user_id = u.id
               ${whereSql}
               GROUP BY v.user_id
               ORDER BY visits DESC`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

// --- Share submissions ---
// Helper: fetch submission with user and assignment
function getSubmissionById(id, cb) {
  db.get(
    `SELECT s.id, s.assignment_id, s.user_id, s.content, s.file_path, s.submitted_at,
            u.username, u.email,
            a.title AS assignment_title
     FROM submissions s
     LEFT JOIN users u ON s.user_id = u.id
     LEFT JOIN assignments a ON s.assignment_id = a.id
     WHERE s.id = ?`,
    [id],
    cb
  );
}

// Email share: POST /share/submission/:id/email { to, subject?, message? }
router.post('/share/submission/:id/email', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { to, subject, message } = req.body || {};
  if (!to) return res.status(400).json({ status: 'error', message: 'Recipient email (to) is required' });

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) {
    return res.status(400).json({ status: 'error', message: 'SMTP configuration missing (SMTP_HOST, SMTP_PORT, SMTP_FROM, optionally SMTP_USER/SMTP_PASS)' });
  }

  getSubmissionById(id, async (err, sub) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    if (!sub) return res.status(404).json({ status: 'error', message: 'Submission not found' });

    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      });

      const attachments = [];
      if (sub.file_path) {
        const absPath = path.join(__dirname, '..', sub.file_path);
        attachments.push({ filename: path.basename(absPath), path: absPath });
      }

      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject: subject || `Assignment: ${sub.assignment_title} from ${sub.username}`,
        text: (message || '') + `\n\nAssignment: ${sub.assignment_title}\nUser: ${sub.username}\nSubmitted: ${sub.submitted_at}\n\nContent:\n${sub.content || '(no text content)'}\n`,
        attachments,
      });

      res.json({ status: 'success', messageId: info.messageId });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });
});

// PDF export: GET /share/submission/:id/pdf
router.get('/share/submission/:id/pdf', requireAdmin, (req, res) => {
  const { id } = req.params;
  getSubmissionById(id, (err, sub) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    if (!sub) return res.status(404).json({ status: 'error', message: 'Submission not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="submission_${id}.pdf"`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(18).text(`Assignment: ${sub.assignment_title}`, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`User: ${sub.username} (ID ${sub.user_id})`);
    doc.text(`Submitted: ${sub.submitted_at}`);
    doc.moveDown();
    doc.fontSize(14).text('Content');
    doc.fontSize(12).text(sub.content || '(no text content)');
    if (sub.file_path) {
      doc.moveDown();
      doc.fontSize(12).text(`Attached file: ${sub.file_path}`);
    }
    doc.end();
  });
});

// Plain text DOC export (basic .doc as text) GET /share/submission/:id/doc
router.get('/share/submission/:id/doc', requireAdmin, (req, res) => {
  const { id } = req.params;
  getSubmissionById(id, (err, sub) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    if (!sub) return res.status(404).json({ status: 'error', message: 'Submission not found' });
    const content = `Assignment: ${sub.assignment_title}\nUser: ${sub.username} (ID ${sub.user_id})\nSubmitted: ${sub.submitted_at}\n\nContent:\n${sub.content || '(no text content)'}\n\nAttached file: ${sub.file_path || '(none)'}\n`;
    res.setHeader('Content-Type', 'application/msword');
    res.setHeader('Content-Disposition', `attachment; filename="submission_${id}.doc"`);
    res.send(content);
  });
});

// --- Exports: CSV ---
function toCSV(rows){
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return '"' + s + '"';
  };
  const lines = [headers.map(h => '"' + h + '"').join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => escape(r[h])).join(','));
  }
  return lines.join('\n');
}

// Submissions CSV
router.get('/exports/submissions.csv', requireAdmin, (req, res) => {
  db.all(
    `SELECT s.id, s.assignment_id, s.user_id, u.username, a.title AS assignment_title,
            s.submitted_at, s.feedback, s.grade, s.file_path, s.content
     FROM submissions s
     LEFT JOIN users u ON s.user_id = u.id
     LEFT JOIN assignments a ON s.assignment_id = a.id
     ORDER BY s.submitted_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ status: 'error', message: err.message });
      const csv = toCSV(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
      res.send(csv);
    }
  );
});

// Visits CSV
router.get('/exports/visits.csv', requireAdmin, (req, res) => {
  db.all(
    `SELECT v.id, v.user_id, u.username, v.path, v.method, v.user_agent, v.ip, v.visited_at
     FROM user_visits v
     LEFT JOIN users u ON v.user_id = u.id
     ORDER BY v.id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ status: 'error', message: err.message });
      const csv = toCSV(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="visits.csv"');
      res.send(csv);
    }
  );
});

// DOCX export: GET /share/submission/:id/docx
router.get('/share/submission/:id/docx', requireAdmin, async (req, res) => {
  const { id } = req.params;
  getSubmissionById(id, async (err, sub) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    if (!sub) return res.status(404).json({ status: 'error', message: 'Submission not found' });
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({ children: [ new TextRun({ text: `Assignment: ${sub.assignment_title}`, bold: true, size: 28 }) ] }),
              new Paragraph({ children: [ new TextRun({ text: `User: ${sub.username} (ID ${sub.user_id})`, size: 24 }) ] }),
              new Paragraph({ children: [ new TextRun({ text: `Submitted: ${sub.submitted_at}`, size: 24 }) ] }),
              new Paragraph({ children: [ new TextRun({ text: ' ', size: 24 }) ] }),
              new Paragraph({ children: [ new TextRun({ text: 'Content', bold: true, size: 26 }) ] }),
              new Paragraph({ children: [ new TextRun({ text: sub.content || '(no text content)', size: 24 }) ] }),
              new Paragraph({ children: [ new TextRun({ text: ' ', size: 24 }) ] }),
              new Paragraph({ children: [ new TextRun({ text: `Attached file: ${sub.file_path || '(none)'}`, size: 24 }) ] }),
            ],
          },
        ],
      });
      const buffer = await Packer.toBuffer(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="submission_${id}.docx"`);
      res.send(buffer);
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });
});

// --- CSV Exports ---
function sendCSV(res, filename, headerRow, rows) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [];
  lines.push(headerRow.join(','));
  for (const r of rows) {
    lines.push(r.map(escape).join(','));
  }
  res.send(lines.join('\n'));
}

// Submissions CSV
router.get('/exports/submissions.csv', requireAdmin, (req, res) => {
  const { start, end, user_id, assignment_id } = req.query;
  const where = [];
  const params = [];
  if (start) { where.push('s.submitted_at >= ?'); params.push(start); }
  if (end) { where.push('s.submitted_at <= ?'); params.push(end); }
  if (user_id) { where.push('s.user_id = ?'); params.push(Number(user_id)); }
  if (assignment_id) { where.push('s.assignment_id = ?'); params.push(Number(assignment_id)); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sql = `SELECT s.id, s.assignment_id, s.user_id, u.username, a.title AS assignment_title,
                      s.submitted_at, s.feedback, s.grade, s.file_path, s.content
               FROM submissions s
               LEFT JOIN users u ON s.user_id = u.id
               LEFT JOIN assignments a ON s.assignment_id = a.id
               ${whereSql}
               ORDER BY s.submitted_at DESC`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    const header = ['id','assignment_id','user_id','username','assignment_title','submitted_at','feedback','grade','file_path','content'];
    const data = rows.map(r => [r.id, r.assignment_id, r.user_id, r.username, r.assignment_title, r.submitted_at, r.feedback, r.grade, r.file_path, r.content]);
    sendCSV(res, 'submissions.csv', header, data);
  });
});

// Visits CSV
router.get('/exports/visits.csv', requireAdmin, (req, res) => {
  const { start, end, path, user_id } = req.query;
  const where = [];
  const params = [];
  if (start) { where.push('v.visited_at >= ?'); params.push(start); }
  if (end) { where.push('v.visited_at <= ?'); params.push(end); }
  if (path) { where.push('v.path LIKE ?'); params.push(`%${path}%`); }
  if (user_id) { where.push('v.user_id = ?'); params.push(Number(user_id)); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sql = `SELECT v.id, v.user_id, u.username, v.path, v.method, v.user_agent, v.ip, v.visited_at
               FROM user_visits v
               LEFT JOIN users u ON v.user_id = u.id
               ${whereSql}
               ORDER BY v.id DESC`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    const header = ['id','user_id','username','path','method','user_agent','ip','visited_at'];
    const data = rows.map(r => [r.id, r.user_id, r.username, r.path, r.method, r.user_agent, r.ip, r.visited_at]);
    sendCSV(res, 'visits.csv', header, data);
  });
});

// --- Deletes ---
// Delete a submission by id
router.delete('/submissions/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM submissions WHERE id = ?', [id], function(err){
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', deleted: this.changes });
  });
});

// Delete visits in a date range or by user_id
router.delete('/analytics/visits', requireAdmin, (req, res) => {
  const { start, end, user_id } = req.query;
  const where = [];
  const params = [];
  if (start) { where.push('visited_at >= ?'); params.push(start); }
  if (end)   { where.push('visited_at <= ?'); params.push(end); }
  if (user_id) { where.push('user_id = ?'); params.push(Number(user_id)); }
  if (!where.length) {
    return res.status(400).json({ status: 'error', message: 'Provide at least one filter: start/end/user_id' });
  }
  const sql = `DELETE FROM user_visits WHERE ${where.join(' AND ')}`;
  db.run(sql, params, function(err){
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', deleted: this.changes });
  });
});

// --- Issue Org Access Token (Admin) ---
router.post('/orgs/:orgId/token', (req, res) => {
  // Admin check (reuse simple guard)
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  }
  const orgId = Number(req.params.orgId);
  if(!orgId) return res.status(400).json({ status:'error', message:'Invalid orgId' });
  db.get('SELECT id, name, slug, status FROM organizations WHERE id = ?', [orgId], (err, org) => {
    if(err) return res.status(500).json({ status:'error', message: err.message });
    if(!org) return res.status(404).json({ status:'error', message:'Organization not found' });
    const scope = (req.body && req.body.scope) || 'read';
    const ttl = Number((req.body && req.body.ttlSec) || 1800);
    const token = signToken({ org_id: org.id, org_slug: org.slug, scope }, ttl);
    res.json({ status:'success', token, expires_in: ttl, link: `/org/access?token=${encodeURIComponent(token)}` });
  });
});

// ========================================
// AI HELPER ENDPOINTS
// ========================================

// Rate limiter for AI requests (10 per user per hour)
const aiUsageTracker = new Map();

function checkAIRateLimit(userId) {
  const now = Date.now();
  const userKey = `ai_${userId}`;
  const userUsage = aiUsageTracker.get(userKey) || { count: 0, resetTime: now + 3600000 };
  
  if (now > userUsage.resetTime) {
    userUsage.count = 0;
    userUsage.resetTime = now + 3600000;
  }
  
  if (userUsage.count >= 10) {
    return false;
  }
  
  userUsage.count++;
  aiUsageTracker.set(userKey, userUsage);
  return true;
}

// Student: Ask AI tutor about lesson content
router.post('/ai/lesson-help', async (req, res) => {
  const user = req.session && req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Please sign in to use AI assistance.' });
  }

  // Rate limiting
  if (!checkAIRateLimit(user.id)) {
    return res.status(429).json({ 
      error: 'AI usage limit reached. You can ask 10 questions per hour. Please try again later.' 
    });
  }

  const { lessonId, question } = req.body;
  
  if (!lessonId || !question || question.trim().length < 3) {
    return res.status(400).json({ error: 'Please provide a valid lesson ID and question.' });
  }

  // Sanitize question
  const sanitizedQuestion = sanitizeInput(question.substring(0, 500));

  try {
    // Get lesson from database
    const lesson = await db.get(
      'SELECT id, week, title, description FROM lessons WHERE id = ?',
      [lessonId]
    );

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    // Generate AI response
    const answer = await aiHelper.answerLessonQuestion(lesson, sanitizedQuestion);

    // Log AI usage
    await db.run(
      `INSERT INTO ai_usage (user_id, org_id, type, question, response, created_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, req.session.org?.id || null, 'lesson-help', sanitizedQuestion, answer]
    );

    res.json({ 
      success: true, 
      answer,
      remainingQuestions: 10 - (aiUsageTracker.get(`ai_${user.id}`)?.count || 0)
    });
  } catch (error) {
    console.error('AI Lesson Help Error:', error);
    res.status(500).json({ 
      error: 'Unable to process your question. Please try again or contact your instructor.' 
    });
  }
});

// Admin: Ask AI about platform features/navigation
router.post('/ai/admin-help', async (req, res) => {
  const user = req.session && req.session.user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  // Rate limiting
  if (!checkAIRateLimit(user.id)) {
    return res.status(429).json({ 
      error: 'AI usage limit reached. You can ask 10 questions per hour.' 
    });
  }

  const { question } = req.body;
  
  if (!question || question.trim().length < 3) {
    return res.status(400).json({ error: 'Please provide a valid question.' });
  }

  const sanitizedQuestion = sanitizeInput(question.substring(0, 500));

  try {
    // Common admin documentation snippets
    const docsContext = `
Platform Features:
- Create organizations: Go to Admin Dashboard → Organizations → Add New
- Upload videos: Place .mp4 files in frontend/public/videos/ folder
- Generate access tokens: Admin Dashboard → Organizations → Generate Token
- View analytics: Admin Dashboard shows user progress and engagement
- Manage users: Admin Dashboard → Users section
- Add lessons: Admin Dashboard → Lessons → Create New
    `.trim();

    const answer = await aiHelper.answerAdminQuestion(sanitizedQuestion, docsContext);

    // Log AI usage
    await db.run(
      `INSERT INTO ai_usage (user_id, org_id, type, question, response, created_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, req.session.org?.id || null, 'admin-help', sanitizedQuestion, answer]
    );

    res.json({ 
      success: true, 
      answer,
      remainingQuestions: 10 - (aiUsageTracker.get(`ai_${user.id}`)?.count || 0)
    });
  } catch (error) {
    console.error('AI Admin Help Error:', error);
    res.status(500).json({ 
      error: 'Unable to process your question. Please try again.' 
    });
  }
});

// Student: Get assignment feedback before submission
router.post('/ai/assignment-feedback', async (req, res) => {
  const user = req.session && req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Please sign in to use AI feedback.' });
  }

  if (!checkAIRateLimit(user.id)) {
    return res.status(429).json({ 
      error: 'AI usage limit reached. You can ask 10 questions per hour.' 
    });
  }

  const { assignmentId, submission } = req.body;
  
  if (!assignmentId || !submission || submission.trim().length < 10) {
    return res.status(400).json({ error: 'Please provide assignment ID and your answer (min 10 characters).' });
  }

  const sanitizedSubmission = sanitizeInput(submission.substring(0, 2000));

  try {
    // Get assignment details
    const assignment = await db.get(
      'SELECT title, description FROM assignments WHERE id = ?',
      [assignmentId]
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const feedback = await aiHelper.reviewAssignment(
      assignment.description || assignment.title,
      sanitizedSubmission
    );

    // Log usage
    await db.run(
      `INSERT INTO ai_usage (user_id, org_id, type, question, response, created_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, req.session.org?.id || null, 'assignment-feedback', 
       `Assignment: ${assignmentId}`, feedback]
    );

    res.json({ 
      success: true, 
      feedback,
      remainingQuestions: 10 - (aiUsageTracker.get(`ai_${user.id}`)?.count || 0)
    });
  } catch (error) {
    console.error('AI Assignment Feedback Error:', error);
    res.status(500).json({ 
      error: 'Unable to provide feedback. Please try again.' 
    });
  }
});

// Student: Simplify a difficult concept
router.post('/ai/simplify', async (req, res) => {
  const user = req.session && req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Please sign in.' });
  }

  if (!checkAIRateLimit(user.id)) {
    return res.status(429).json({ 
      error: 'AI usage limit reached. Try again in an hour.' 
    });
  }

  const { concept } = req.body;
  
  if (!concept || concept.trim().length < 5) {
    return res.status(400).json({ error: 'Please provide a concept to simplify.' });
  }

  const sanitizedConcept = sanitizeInput(concept.substring(0, 200));

  try {
    const explanation = await aiHelper.simplifyTopic(sanitizedConcept);

    await db.run(
      `INSERT INTO ai_usage (user_id, org_id, type, question, response, created_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, req.session.org?.id || null, 'simplify', sanitizedConcept, explanation]
    );

    res.json({ 
      success: true, 
      explanation,
      remainingQuestions: 10 - (aiUsageTracker.get(`ai_${user.id}`)?.count || 0)
    });
  } catch (error) {
    console.error('AI Simplify Error:', error);
    res.status(500).json({ 
      error: 'Unable to simplify. Please try again.' 
    });
  }
});

// ========================================
// END AI HELPER ENDPOINTS
// ========================================

// --- Org Access: verify token, set session, redirect ---
router.get('/org/access', (req, res) => {
  const token = req.query && req.query.token;
  const body = token && verifyToken(token);
  if(!body) return res.status(400).send('Invalid or expired token');
  // Attach org to session; user remains optional (view-only flows allowed)
  req.session.org = { id: body.org_id, slug: body.org_slug, scope: body.scope };
  res.redirect('/dashboard.html');
});