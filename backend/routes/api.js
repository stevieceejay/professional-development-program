/**
 * Professional Development Project platform - API Routes
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

const express = require('express');
const router = express.Router();
const upload = require('../middleware/videoUpload');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const marked = require('marked');
const bcrypt = require('bcrypt');
const db = require('../data/db');
const dbPromise = require('../data/db-promise');
const { success, error: sendError } = require('../utils/response');
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

const uploadMiddleware = multer({ 
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
    return sendError(res, 400, 'All fields are required');
  }

  // Sanitize inputs
  username = sanitizeInput(username);
  email = sanitizeInput(email).toLowerCase();

  // Validate username format
  if (!isValidUsername(username)) {
    return sendError(res, 400, 'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens');
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return sendError(res, 400, 'Invalid email format');
  }

  if (password !== confirmPassword) {
    return sendError(res, 400, 'Passwords do not match');
  }

  // Basic password validation (keep simple for now, or use validatePasswordStrength for stricter)
  if (password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters');
  }

  // Hash password
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Hashing error:', err);
      return sendError(res, 500, 'Error creating account');
    }

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run([username, email, hashedPassword, 'User'], function (err) {
      if (err) {
        let errMsg = 'Error creating account';
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          errMsg = 'Username or email already exists';
        }
        return sendError(res, 400, errMsg);
      }

      // Auto-login after signup — regenerate session to avoid fixation and
      // ensure a fresh session cookie is issued (matches signin behavior).
      const newUser = { id: this.lastID, username, email, role: 'User' };
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          console.error('Session regeneration error on signup:', regenErr);
          // Still return success but warn client to sign in manually
          return success(res, 201, { user: newUser }, 'Account created, please sign in.');
        }

        req.session.user = newUser;
        return success(res, 201, { user: newUser }, 'Account created successfully! Welcome!');
      });
    });
    stmt.finalize();
  });
});

// --- Signin handler (used by both /signin and /login aliases) ---
function signInHandler(req, res) {
  let { username, password } = req.body;

  if (!username || !password) {
    return sendError(res, 400, 'Username and password are required');
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
        return sendError(res, 500, 'Error signing in');
      }

      if (!user) {
        // Use same message to prevent username enumeration
        return sendError(res, 401, 'Invalid username or password');
      }

      // Compare password with hash
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Bcrypt error:', err);
          return sendError(res, 500, 'Error signing in');
        }

        if (!isMatch) {
          // Same message as above to prevent timing attacks
          return sendError(res, 401, 'Invalid username or password');
        }

        // Regenerate session ID to prevent session fixation
        req.session.regenerate((regenerateErr) => {
          if (regenerateErr) {
            console.error('Session regeneration error:', regenerateErr);
            return sendError(res, 500, 'Error signing in');
          }

          // Store session
          req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };
          
          return success(res, 200, { user: { id: user.id, username: user.username, email: user.email, role: user.role } }, 'Signed in successfully!');
        });
      });
    });
}

router.post('/signin', signInHandler);
router.post('/login', signInHandler); // Alias for older client pages

// --- Update lesson by week (Admin) ---
router.put('/lessons/:week', (req, res) => {
  const week = Number(req.params.week);
  const { title, description, video_url } = req.body || {};

  if (!week || week < 1 || week > 52) {
    return sendError(res, 400, 'Invalid week');
  }

  // Optional: simple admin guard if session has role Admin
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return sendError(res, 403, 'Admin access required');
  }

  db.get('SELECT id FROM lessons WHERE week = ?', [week], (err, row) => {
    if (err) {
      console.error('DB error:', err);
      return sendError(res, 500, 'Database error');
    }
    const fields = [];
    const values = [];
    if (typeof title === 'string') { fields.push('title = ?'); values.push(title); }
    if (typeof description === 'string') { fields.push('description = ?'); values.push(description); }
    if (typeof video_url === 'string') { fields.push('video_url = ?'); values.push(video_url); }

    if (fields.length === 0) {
      return sendError(res, 400, 'No updatable fields provided');
    }

    if (row) {
      const sql = `UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`;
      values.push(row.id);
      db.run(sql, values, function (uErr) {
        if (uErr) {
          console.error('Update error:', uErr);
          return sendError(res, 500, 'Failed to update lesson');
        }
        return success(res, 200, { id: row.id }, `Updated Week ${week} lesson`);
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
            return sendError(res, 500, 'Failed to create lesson');
          }
          return success(res, 200, { id: this.lastID }, `Created Week ${week} lesson`);
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
  return sendError(res, 403, 'Forbidden: Admins only');
}

// (session route defined later once; duplicate removed)

// --- Organizations (Admin) ---
router.get('/orgs', (req, res) => {
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return sendError(res, 403, 'Admin access required');
  }
  db.all('SELECT id, name, slug, status, created_at FROM organizations ORDER BY id', [], (err, rows) => {
    if (err) return sendError(res, 500, err.message);
    return success(res, 200, rows);
  });
});

router.post('/orgs', (req, res) => {
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return sendError(res, 403, 'Admin access required');
  }
  const { name, slug, status } = req.body || {};
  if (!name || !slug) return sendError(res, 400, 'name and slug required');
  const stmt = db.prepare('INSERT INTO organizations (name, slug, status) VALUES (?, ?, ?)');
  stmt.run([name, slug, status || 'active'], function (err) {
    if (err) return sendError(res, 500, err.message);
    return success(res, 201, { id: this.lastID });
  });
  stmt.finalize();
});

router.put('/orgs/:id', (req, res) => {
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return sendError(res, 403, 'Admin access required');
  }
  const { id } = req.params;
  const { name, slug, status } = req.body || {};
  const fields = [];
  const values = [];
  if (typeof name === 'string') { fields.push('name = ?'); values.push(name); }
  if (typeof slug === 'string') { fields.push('slug = ?'); values.push(slug); }
  if (typeof status === 'string') { fields.push('status = ?'); values.push(status); }
  if (!fields.length) return sendError(res, 400, 'No fields to update');
  const sql = `UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);
  db.run(sql, values, function (err) {
    if (err) return sendError(res, 500, err.message);
    return success(res, 200, { updated: this.changes });
  });
});

router.delete('/orgs/:id', (req, res) => {
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return sendError(res, 403, 'Admin access required');
  }
  const { id } = req.params;
  db.run('DELETE FROM organizations WHERE id = ?', [id], function (err) {
    if (err) return sendError(res, 500, err.message);
    return success(res, 200, { deleted: this.changes });
  });
});

// --- Projects ---
router.get('/projects', (req, res) => {
  const orgId = getSessionOrgId(req);
  const sql = orgId ? 'SELECT * FROM projects WHERE org_id = ? ORDER BY id' : 'SELECT * FROM projects ORDER BY id';
  const params = orgId ? [orgId] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return sendError(res, 500, err.message);
    return success(res, 200, rows);
  });
});

// --- Logout ---
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    return success(res, 200, {}, 'Logged out');
  });
});

// --- Session info ---
router.get('/session', (req, res) => {
  if (req.session && req.session.user) {
    return success(res, 200, req.session.user);
  }
  return sendError(res, 200, 'No active session');
});

// --- CRUD: Users (Admin only) ---
  // Users list (admin-only), scoped by org when session org exists
  router.get('/users', async (req, res) => {
    try {
      if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
        return sendError(res, 403, 'Admin required');
      }
      const orgId = getSessionOrgId(req);
      const { role, status, email, q } = req.query;
      const rawLimit = Number.parseInt(String(req.query.limit ?? '100'), 10);
      const rawOffset = Number.parseInt(String(req.query.offset ?? '0'), 10);
      const safeLimit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 100;
      const safeOffset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;
      const where = [];
      const params = [];
      if (orgId) { where.push('org_id = ?'); params.push(orgId); }
      if (typeof role === 'string' && role.trim()) {
        const normalizedRole = role.trim().toLowerCase();
        if (!['admin', 'user'].includes(normalizedRole)) {
          return sendError(res, 400, 'Invalid role filter');
        }
        where.push('LOWER(role) = ?');
        params.push(normalizedRole);
      }
      if (typeof status === 'string' && status.trim()) {
        const normalizedStatus = status.trim().toLowerCase().slice(0, 20);
        where.push('LOWER(status) = ?');
        params.push(normalizedStatus);
      }
      if (typeof email === 'string' && email.trim()) {
        const emailLike = `%${email.trim().toLowerCase().slice(0, 120)}%`;
        where.push('LOWER(email) LIKE ?');
        params.push(emailLike);
      }
      if (typeof q === 'string' && q.trim()) {
        // Match first + last name, or either individually, plus email
        where.push(`(LOWER(COALESCE(first_name,'')) || ' ' || LOWER(COALESCE(last_name,'')) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(email) LIKE ?)`);
        const qLike = `%${q.trim().toLowerCase().slice(0, 120)}%`;
        params.push(qLike, qLike, qLike, qLike);
      }
      const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const sql = `SELECT id, COALESCE(first_name,'') as first_name, COALESCE(last_name,'') as last_name, email, org_id, role, status FROM users ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`;
      params.push(safeLimit);
      params.push(safeOffset);
      const rows = await dbPromise.all(sql, params);
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
      return success(res, 200, data);
    } catch (err) {
      console.error('GET /api/users failed', err);
      return sendError(res, 500, 'Server error');
    }
  });
router.post('/users', requireAdmin, (req, res) => {
  const { username, email, role, password } = req.body;
  if (!username || !email || !role) {
    return sendError(res, 400, 'Missing required fields');
  }
  
  // Hash default password if not provided
  const defaultPassword = password || 'Welcome123';
  bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
    if (err) {
      return sendError(res, 500, 'Error creating user');
    }
    
    const stmt = db.prepare(`INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, datetime('now'))`);
    stmt.run([username, email, hashedPassword, role], function (err) {
      if (err) return sendError(res, 500, err.message);
      return success(res, 201, { id: this.lastID, username, email, role });
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
      if (err) return sendError(res, 500, err.message);
      return success(res, 200, { updated: this.changes });
    }
  );
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM users WHERE id=?`, [id], function (err) {
    if (err) return sendError(res, 500, err.message);
    return success(res, 200, { deleted: this.changes });
  });
});

// Get current logged-in user
router.get('/users/me', (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    // Get full user details from database
    db.get(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [req.session.user.id],
      (err, user) => {
        if (err) {
          console.error('Error fetching current user:', err);
          return sendError(res, 500, 'Failed to fetch user');
        }

        if (!user) {
          return sendError(res, 404, 'User not found');
        }

        return success(res, 200, user);
      }
    );
  } catch (error) {
    console.error('Error fetching current user:', error);
    return sendError(res, 500, 'Failed to fetch user');
  }
});

// --- Lessons routes ---
router.get('/lessons', (req, res) => {
  const orgId = getSessionOrgId(req);
  const sql = orgId ? 'SELECT * FROM lessons WHERE org_id = ? ORDER BY week, id' : 'SELECT * FROM lessons ORDER BY week, id';
  const params = orgId ? [orgId] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return sendError(res, 500, err.message);
    return success(res, 200, rows);
  });
});

router.get('/lessons/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM lessons WHERE id = ?', [id], (err, row) => {
    if (err) return sendError(res, 500, err.message);
    if (!row) return sendError(res, 404, 'Lesson not found');
    return success(res, 200, row);
  });
});

router.post('/lessons', requireAdmin, (req, res) => {
  const { title, description, video_url } = req.body;
  if (!title || !video_url) {
    return sendError(res, 400, 'Title and video_url are required');
  }
  const stmt = db.prepare(`
    INSERT INTO lessons (title, description, video_url)
    VALUES (?, ?, ?)
  `);
  stmt.run([title, description || null, video_url], function (err) {
    if (err) return sendError(res, 500, err.message);
    return success(res, 201, { id: this.lastID });
  });
  stmt.finalize();
});

// ==================== VIDEO UPLOAD ROUTES ====================

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return sendError(res, 403, 'Admin access required');
  }
  next();
};

// Upload video for a lesson (Admin only)
router.post('/lessons/:id/video', isAdmin, upload.single('video'), async (req, res) => {
  try {
    const lessonId = req.params.id;
    const videoFile = req.file;

    if (!videoFile) {
      return sendError(res, 400, 'No video file uploaded');
    }

    const videoUrl = `/uploads/videos/${videoFile.filename}`;

    const result = await dbPromise.run(
      'UPDATE lessons SET video_url = ? WHERE id = ?',
      [videoUrl, lessonId]
    );

    if (result.changes === 0) {
      await fs.unlink(videoFile.path);
      return sendError(res, 404, 'Lesson not found');
    }

    return success(res, 200, {
      video_url: videoUrl,
      filename: videoFile.filename
    }, 'Video uploaded successfully');
  } catch (error) {
    console.error('Error uploading video:', error);
    return sendError(res, 500, 'Failed to upload video');
  }
});

// Get video URL for a lesson
router.get('/lessons/:id/video', async (req, res) => {
  try {
    const lessonId = req.params.id;
    
    const lesson = await dbPromise.get(
      'SELECT video_url FROM lessons WHERE id = ?',
      [lessonId]
    );

    if (!lesson) {
      return sendError(res, 404, 'Lesson not found');
    }

    if (!lesson.video_url) {
      return sendError(res, 404, 'No video for this lesson');
    }

    return success(res, 200, { video_url: lesson.video_url });
  } catch (error) {
    console.error('Error fetching video:', error);
    return sendError(res, 500, 'Failed to fetch video');
  }
});

// Delete video from lesson (Admin only)
router.delete('/lessons/:id/video', isAdmin, async (req, res) => {
  try {
    const lessonId = req.params.id;

    const lesson = await dbPromise.get(
      'SELECT video_url FROM lessons WHERE id = ?',
      [lessonId]
    );

    if (!lesson) {
      return sendError(res, 404, 'Lesson not found');
    }

    if (!lesson.video_url) {
      return sendError(res, 404, 'No video to delete');
    }

    const filename = path.basename(lesson.video_url);
    const filePath = path.join(__dirname, '../uploads/videos', filename);
    
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting file:', err);
    }

    await dbPromise.run(
      'UPDATE lessons SET video_url = NULL WHERE id = ?',
      [lessonId]
    );

    return success(res, 200, null, 'Video deleted successfully');
  } catch (error) {
    console.error('Error deleting video:', error);
    return sendError(res, 500, 'Failed to delete video');
  }
});

// --- Assignments routes ---
router.get('/assignments', (req, res) => {
  const orgId = getSessionOrgId(req);
  const sql = orgId ? 'SELECT * FROM assignments WHERE org_id = ? ORDER BY lesson_id, id' : 'SELECT * FROM assignments ORDER BY lesson_id, id';
  const params = orgId ? [orgId] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return sendError(res, 500, err.message);
    return success(res, 200, rows);
  });
});

router.get('/assignments/lesson/:lessonId', (req, res) => {
  const { lessonId } = req.params;
  const orgId = getSessionOrgId(req);
  const sql = orgId ? 'SELECT * FROM assignments WHERE lesson_id = ? AND org_id = ?' : 'SELECT * FROM assignments WHERE lesson_id = ?';
  const params = orgId ? [lessonId, orgId] : [lessonId];
  db.all(sql, params, (err, rows) => {
    if (err) return sendError(res, 500, err.message);
    return success(res, 200, rows);
  });
});

router.post('/assignments', requireAdmin, (req, res) => {
  const { lesson_id, title, instructions, due_date } = req.body;
  if (!lesson_id || !title || !instructions) {
    return sendError(res, 400, 'Lesson ID, title, and instructions are required');
  }
  const stmt = db.prepare(`
    INSERT INTO assignments (lesson_id, title, instructions, due_date)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run([lesson_id, title, instructions, due_date], function (err) {
    if (err) return sendError(res, 500, err.message);
    return success(res, 200, { id: this.lastID });
  });
  stmt.finalize();
});

// ==================== ASSIGNMENT SUBMISSION ROUTES ====================

// Submit assignment for a lesson (Student)
// Canonical submission upsert helper used by both lesson-scoped and generic endpoints
async function upsertSubmission({ userId, lessonId, assignmentId, content }) {
  if (!userId) return { ok: false, code: 401, message: 'Not authenticated' };
  if (!content || String(content).trim().length < 10) return { ok: false, code: 400, message: 'Submission must be at least 10 characters' };

  // Prefer matching by assignment_id when provided, otherwise by lesson_id
  const whereClause = assignmentId ? 'assignment_id = ?' : 'lesson_id = ?';
  const whereParam = assignmentId || lessonId;

  try {
    const existing = await dbPromise.get(
      `SELECT id, grade FROM submissions WHERE ${whereClause} AND user_id = ?`,
      [whereParam, userId]
    );

    if (existing) {
      if (existing.grade !== null && existing.grade !== undefined) {
        return { ok: false, code: 400, message: 'You have already submitted and been graded; resubmission not allowed' };
      }
      await dbPromise.run(
        'UPDATE submissions SET content = ?, submitted_at = ?, feedback = NULL, grade = NULL WHERE id = ?',
        [String(content).trim(), new Date().toISOString(), existing.id]
      );
      return { ok: true, updated: true, submissionId: existing.id };
    }

    const insertSql = 'INSERT INTO submissions (lesson_id, assignment_id, user_id, content, submitted_at) VALUES (?, ?, ?, ?, ?)';
    const res = await dbPromise.run(insertSql, [lessonId || null, assignmentId || null, userId, String(content).trim(), new Date().toISOString()]);
    return { ok: true, created: true, submissionId: res.lastID };
  } catch (err) {
    console.error('DB error in upsertSubmission:', err);
    return { ok: false, code: 500, message: 'Database error' };
  }
}

// Legacy/shim: Submit assignment for a lesson (Student) - delegates to canonical /submissions
router.post('/lessons/:id/submit', async (req, res) => {
  try {
    if (!req.session || !req.session.user) return sendError(res, 401, 'Not authenticated');
    const lessonId = Number(req.params.id);
    const { content } = req.body || {};
    const result = await upsertSubmission({ userId: req.session.user.id, lessonId, assignmentId: null, content });
    if (!result.ok) return sendError(res, result.code || 400, result.message);
    return success(res, 200, { submissionId: result.submissionId }, result.updated ? 'Submission updated successfully' : 'Assignment submitted successfully');
  } catch (err) {
    console.error('Error submitting assignment (shim):', err);
    return sendError(res, 500, 'Failed to submit assignment');
  }
});

// Canonical submissions endpoint: create or update a submission (Student)
router.post('/submissions', async (req, res) => {
  try {
    if (!req.session || !req.session.user) return sendError(res, 401, 'Not authenticated');
    const { lesson_id, assignment_id, content } = req.body || {};
    if (!lesson_id && !assignment_id) return sendError(res, 400, 'lesson_id or assignment_id required');
    const result = await upsertSubmission({ userId: req.session.user.id, lessonId: lesson_id ? Number(lesson_id) : null, assignmentId: assignment_id ? Number(assignment_id) : null, content });
    if (!result.ok) return sendError(res, result.code || 400, result.message);
    return success(res, 200, { submissionId: result.submissionId }, result.updated ? 'Submission updated successfully' : 'Assignment submitted successfully');
  } catch (err) {
    console.error('Error in POST /submissions:', err);
    return sendError(res, 500, 'Failed to submit');
  }
});

// Get submission status for a lesson (Student)
router.get('/lessons/:id/submission', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const lessonId = req.params.id;
    const userId = req.session.user.id;

    const submission = await dbPromise.get(
      `SELECT 
        s.id,
        s.lesson_id,
        s.user_id,
        s.content,
        s.submitted_at,
        s.grade,
        s.feedback,
        CASE WHEN s.grade IS NOT NULL THEN 1 ELSE 0 END as graded
      FROM submissions s
      WHERE s.lesson_id = ? AND s.user_id = ?`,
      [lessonId, userId]
    );

    if (!submission) {
      return sendError(res, 404, 'No submission found');
    }

    return success(res, 200, {
      submitted: true,
      graded: Boolean(submission.graded),
      grade: submission.grade,
      feedback: submission.feedback,
      submitted_at: submission.submitted_at,
      content: submission.content
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return sendError(res, 500, 'Failed to fetch submission');
  }
});

// Get all submissions for current user (Student Dashboard)
router.get('/submissions/my', (req, res) => {
  if (!req.session || !req.session.user) {
    return sendError(res, 401, 'Not authenticated');
  }
  const userId = req.session.user.id;
  const sql = `SELECT 
        s.id,
        s.lesson_id,
        s.content,
        s.submitted_at,
        s.grade,
        s.feedback,
        l.week,
        l.title as lesson_title,
        CASE WHEN s.grade IS NOT NULL THEN 1 ELSE 0 END as graded
      FROM submissions s
      LEFT JOIN lessons l ON l.id = s.lesson_id
      WHERE s.user_id = ?
      ORDER BY l.week ASC`;
  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error('Error fetching user submissions:', err);
      return sendError(res, 500, 'Failed to fetch submissions');
    }
    return success(res, 200, Array.isArray(rows) ? rows : []);
  });
});

// Get all submissions (Admin only)
router.get('/submissions', requireAdmin, (req, res) => {
  db.all(
    `SELECT 
      s.id,
      s.assignment_id,
      s.user_id,
      s.content,
      s.file_path,
      s.submitted_at,
      s.feedback,
      s.grade,
      u.username,
      u.email,
      l.week,
      l.title as lesson_title
    FROM submissions s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN assignments a ON s.assignment_id = a.id
    LEFT JOIN lessons l ON (a.lesson_id = l.id OR s.lesson_id = l.id)
    ORDER BY s.submitted_at DESC`,
    [],
    (err, submissions) => {
      if (err) {
        console.error('Error fetching all submissions:', err);
        return sendError(res, 500, 'Failed to fetch submissions');
      }
      return success(res, 200, submissions || []);
    }
  );
});

// --- Admin: User activity overview (submissions, visits) ---
router.get('/admin/users/:id/activity', requireAdmin, async (req, res) => {
  const userId = req.params.id;
  if (!userId) return sendError(res, 400, 'Invalid user ID');

  try {
    // Submissions for the user
    const submissions = await dbPromise.all(
      `SELECT 
        s.id,
        s.lesson_id,
        s.content,
        s.submitted_at,
        s.grade,
        s.feedback,
        l.week,
        l.title as lesson_title
      FROM submissions s
      LEFT JOIN lessons l ON l.id = s.lesson_id
      WHERE s.user_id = ?
      ORDER BY s.submitted_at DESC`,
      [userId]
    );

    // Visits by the user
    const visits = await dbPromise.all(
      `SELECT id, path, visited_at FROM user_visits WHERE user_id = ? ORDER BY visited_at DESC`,
      [userId]
    );

    return success(res, 200, { submissions, visits });
  } catch (err) {
    console.error('GET /admin/users/:id/activity error:', err);
    return sendError(res, 500, 'Server error');
  }
});

// Get single submission (Admin)
router.get('/submissions/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return sendError(res, 400, 'Invalid submission id');
  try {
    const submission = await dbPromise.get(
      `SELECT s.*, u.username, u.email, l.week AS lesson_week, l.title AS lesson_title
       FROM submissions s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN lessons l ON s.lesson_id = l.id
       WHERE s.id = ?`,
      [id]
    );
    if (!submission) return sendError(res, 404, 'Submission not found');
    return success(res, 200, submission);
  } catch (err) {
    console.error('GET /submissions/:id error:', err);
    return sendError(res, 500, 'Server error');
  }
});

// Grade or provide feedback for a submission (Admin)
router.put('/submissions/:id/grade', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return sendError(res, 400, 'Invalid submission id');
  const { grade, feedback } = req.body || {};
  if (grade === undefined || grade === null) {
    return sendError(res, 400, 'Grade is required');
  }
  const numericGrade = Number(grade);
  if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
    return sendError(res, 400, 'Grade must be a number between 0 and 100');
  }
  try {
    await dbPromise.run('UPDATE submissions SET grade = ?, feedback = ? WHERE id = ?', [numericGrade, feedback || null, id]);
    // Optionally return updated submission
    const updated = await dbPromise.get('SELECT * FROM submissions WHERE id = ?', [id]);
    return success(res, 200, updated, 'Submission graded');
  } catch (err) {
    console.error('PUT /submissions/:id/grade error:', err);
    return sendError(res, 500, 'Failed to grade submission');
  }
});

// --- Admin token: issue or refresh ---
router.post('/admin/token', (req, res) => {
  if (!req.session || !req.session.user || String(req.session.user.role).toLowerCase() !== 'admin') {
    return sendError(res, 403, 'Admin access required');
  }
  const orgId = Number(req.body.orgId) || null;
  const scope = (req.body.scope || 'read').split(',').map(s => s.trim()).filter(Boolean);
  const ttl = Number(req.body.ttl) || 3600;
  if(!orgId) return sendError(res, 400, 'orgId is required');
  db.get('SELECT id, name, slug, status FROM organizations WHERE id = ?', [orgId], (err, org) => {
    if(err) return sendError(res, 500, err.message);
    if(!org) return sendError(res, 404, 'Organization not found');
    const token = signToken({ org_id: org.id, org_slug: org.slug, scope }, ttl);
    return success(res, 200, { token, expires_in: ttl, link: `/org/access?token=${encodeURIComponent(token)}` });
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
    return sendError(res, 401, 'Please sign in to use AI assistance.');
  }

  // Rate limiting
  if (!checkAIRateLimit(user.id)) {
    return sendError(res, 429, 'AI usage limit reached. You can ask 10 questions per hour. Please try again later.');
  }

  const { lessonId, question } = req.body;
  
  if (!lessonId || !question || question.trim().length < 3) {
    return sendError(res, 400, 'Please provide a valid lesson ID and question.');
  }

  // Sanitize question
  const sanitizedQuestion = sanitizeInput(question.substring(0, 500));

  try {
    // Get lesson from database
    const lesson = await dbPromise.get(
      'SELECT id, week, title, description FROM lessons WHERE id = ?',
      [lessonId]
    );

    if (!lesson) {
      return sendError(res, 404, 'Lesson not found.');
    }

    // Generate AI response
    const answer = await aiHelper.answerLessonQuestion(lesson, sanitizedQuestion);

    // Log AI usage
    await dbPromise.run(
      `INSERT INTO ai_usage (user_id, org_id, type, question, response, created_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, req.session.org?.id || null, 'lesson-help', sanitizedQuestion, answer]
    );

    return success(res, 200, {
      answer,
      remainingQuestions: 10 - (aiUsageTracker.get(`ai_${user.id}`)?.count || 0)
    });
  } catch (error) {
    console.error('AI Lesson Help Error:', error);
    return sendError(res, 500, 'Unable to process your question. Please try again or contact your instructor.');
  }
});

// Admin: Ask AI about platform features/navigation
router.post('/ai/admin-help', async (req, res) => {
  const user = req.session && req.session.user;
  if (!user || String(user.role).toLowerCase() !== 'admin') {
    return sendError(res, 403, 'Admin access required.');
  }

  // Rate limiting
  if (!checkAIRateLimit(user.id)) {
    return sendError(res, 429, 'AI usage limit reached. You can ask 10 questions per hour.');
  }

  const { question } = req.body;
  
  if (!question || question.trim().length < 3) {
    return sendError(res, 400, 'Please provide a valid question.');
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
    await dbPromise.run(
      `INSERT INTO ai_usage (user_id, org_id, type, question, response, created_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, req.session.org?.id || null, 'admin-help', sanitizedQuestion, answer]
    );

    return success(res, 200, {
      answer,
      remainingQuestions: 10 - (aiUsageTracker.get(`ai_${user.id}`)?.count || 0)
    });
  } catch (error) {
    console.error('AI Admin Help Error:', error);
    return sendError(res, 500, 'Unable to process your question. Please try again.');
  }
});

// Student: Get assignment feedback before submission
router.post('/ai/assignment-feedback', async (req, res) => {
  const user = req.session && req.session.user;
  if (!user) {
    return sendError(res, 401, 'Please sign in to use AI assistance.');
  }

  // Rate limiting
  if (!checkAIRateLimit(user.id)) {
    return sendError(res, 429, 'AI usage limit reached. You can ask 10 questions per hour. Please try again later.');
  }

  const { assignmentId, submission } = req.body;
  
  if (!assignmentId || !submission || submission.trim().length < 3) {
    return sendError(res, 400, 'Please provide a valid assignment ID and submission content.');
  }

  // Sanitize submission
  const sanitizedSubmission = sanitizeInput(submission.substring(0, 500));

  try {
    // Get submission data from database
    const submissionData = await dbPromise.get(
      'SELECT id, assignment_id, user_id, content, file_path, submitted_at FROM submissions WHERE id = ?',
      [assignmentId]
    );

    if (!submissionData) {
      return sendError(res, 404, 'Submission not found.');
    }

    // Generate AI feedback
    const feedback = await aiHelper.provideAssignmentFeedback(submissionData, sanitizedSubmission);

    return success(res, 200, {
      feedback,
      remainingQuestions: 10 - (aiUsageTracker.get(`ai_${user.id}`)?.count || 0)
    });
  } catch (error) {
    console.error('AI Assignment Feedback Error:', error);
    return sendError(res, 500, 'Unable to process your submission. Please try again or contact your instructor.');
  }
});

module.exports = router;
