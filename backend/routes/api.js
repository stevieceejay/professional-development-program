const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const db = require('../data/db'); // ✅ use the shared db.js
const { marked } = require('marked');

// --- Middleware: Require Admin ---
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'Admin') {
    return next();
  }
  return res.status(403).json({ status: 'error', message: 'Forbidden: Admins only' });
}

// --- Health check ---
router.get('/health', (req, res) => {
  res.json({ status: 'success', data: { ok: true } });
});

// --- Secure login ---
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    if (!user) return res.status(401).json({ status: 'error', message: 'Invalid credentials' });

    bcrypt.compare(password, user.password, (cmpErr, match) => {
      if (cmpErr) return res.status(500).json({ status: 'error', message: cmpErr.message });
      if (!match) return res.status(401).json({ status: 'error', message: 'Invalid credentials' });

      // ✅ Save role in session
      req.session.user = { id: user.id, username: user.username, role: user.role };

      // ✅ Always return user object
      return res.json({
        status: 'success',
        user: { id: user.id, username: user.username, role: user.role }
      });
    });
  });
});

// --- Sign Up (Register) ---
router.post('/signup', (req, res) => {
  const { username, email, password, confirmPassword } = req.body || {};
  const { phone, company, department, rolePreference } = req.body || {};

  // Validate inputs
  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ status: 'error', message: 'All fields are required' });
  }

  // Validate username format
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ status: 'error', message: 'Username must be 3-20 characters' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ status: 'error', message: 'Username can only contain letters, numbers, and underscores' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Invalid email format' });
  }

  // Validate password match
  if (password !== confirmPassword) {
    return res.status(400).json({ status: 'error', message: 'Passwords do not match' });
  }

  // Validate password strength (minimum 6 characters)
  if (password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
  }

  // Check if username already exists
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    if (row) return res.status(400).json({ status: 'error', message: 'Username already exists. Please choose another.' });

    // Check if email already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
      if (err) return res.status(500).json({ status: 'error', message: err.message });
      if (row) return res.status(400).json({ status: 'error', message: 'Email already registered. Please use a different email or sign in.' });

      // Hash password
      bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
        if (hashErr) return res.status(500).json({ status: 'error', message: hashErr.message });

        // Insert user into database with default role 'User'
        db.run(
          'INSERT INTO users (username, email, password, role, phone, company, department, role_preference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [username, email, hashedPassword, 'User', phone || null, company || null, department || null, rolePreference || null],
          function(insertErr) {
            if (insertErr) return res.status(500).json({ status: 'error', message: insertErr.message });

            res.json({
              status: 'success',
              message: 'Account created successfully! Please sign in.',
              user: { id: this.lastID, username, email, phone, company, department, rolePreference, role: 'User' }
            });
          }
        );
      });
    });
  });
});

// --- Logout ---
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ status: 'success', message: 'Logged out' });
  });
});

// --- Protected Admin route: all users (basic) ---
router.get('/users', requireAdmin, (req, res) => {
  db.all('SELECT id, username, role FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

// --- Protected Admin route: all users with progress ---
router.get('/admin/users', requireAdmin, (req, res) => {
  const sql = `
    SELECT u.id, u.username, u.role,
           COUNT(d.id) AS deliverables,
           SUM(CASE WHEN d.status = 'Completed' THEN 1 ELSE 0 END) AS completed
    FROM users u
    LEFT JOIN deliverables d ON u.id = d.user_id
    GROUP BY u.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

// --- Protected Admin route: single user detail ---
router.get('/admin/user/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;

  const sql = `
    SELECT u.id, u.username, u.role,
           d.id AS deliverable_id, d.title, d.category, d.status, d.submitted_date,
           f.id AS feedback_id, f.message, f.created_at
    FROM users u
    LEFT JOIN deliverables d ON u.id = d.user_id
    LEFT JOIN feedback f ON u.id = f.user_id
    WHERE u.id = ?
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });

    const user = {
      id: rows[0].id,
      username: rows[0].username,
      role: rows[0].role,
      deliverables: [],
      feedback: []
    };

    rows.forEach(r => {
      if (r.deliverable_id) {
        user.deliverables.push({
          id: r.deliverable_id,
          title: r.title,
          category: r.category,
          status: r.status,
          submitted_date: r.submitted_date
        });
      }
      if (r.feedback_id) {
        user.feedback.push({
          id: r.feedback_id,
          message: r.message,
          created_at: r.created_at
        });
      }
    });

    res.json({ status: 'success', data: user });
  });
});

// --- Public Projects route ---
router.get('/projects', (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'success', data: rows });
  });
});

// --- Session check ---
router.get('/session', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ status: 'success', data: req.session.user });
  } else {
    res.json({ status: 'error', message: 'Not logged in' });
  }
});

// --- Admin: serve README.md as HTML (only for admins) ---
router.get('/admin/readme', requireAdmin, (req, res) => {
  const readmePath = path.join(__dirname, '..', '..', 'README.md');
  fs.readFile(readmePath, 'utf8', (err, content) => {
    if (err) return res.status(500).json({ status: 'error', message: 'Unable to read README' });
    try {
      const html = marked.parse(content);
      res.json({ status: 'success', content: html });
    } catch (e) {
      res.status(500).json({ status: 'error', message: 'Failed to render markdown' });
    }
  });
});

module.exports = router;

