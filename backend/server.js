const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',   // 🔒 change to a secure value
  resave: false,
  saveUninitialized: false
}));

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// --- API routes ---
const apiRouter = require('./routes/api');   // ✅ corrected path
app.use('/api', apiRouter);

// Generic error handler for API routes: ensure JSON responses instead of HTML stack pages
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (req.path && req.path.startsWith('/api')) {
    return res.status(500).json({ status: 'error', message: err && err.message ? err.message : 'Internal Server Error' });
  }
  // For non-API routes, delegate to default error handler
  next(err);
});

// ✅ Root route (optional, makes "/" load index.html automatically)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// --- Admin HTML guide route (server-side rendered) ---
function requireAdminMiddleware(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'Admin') return next();
  // If AJAX request, return 403 JSON, else redirect to signin
  if (req.xhr || req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
    return res.status(403).json({ status: 'error', message: 'Forbidden: Admins only' });
  }
  return res.redirect('/signin.html');
}

app.get('/admin/guide', requireAdminMiddleware, (req, res) => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  fs.readFile(readmePath, 'utf8', (err, md) => {
    if (err) return res.status(500).send('Unable to load admin guide');
    let html;
    try {
      html = marked.parse(md);
    } catch (e) {
      html = '<pre>' + String(md).replace(/</g, '&lt;') + '</pre>';
    }

    const page = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin Guide</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header>
    <h1>Admin Guide</h1>
    <nav class="navbar">
      <a href="/">Home</a>
      <a href="/dashboard.html">User Dashboard</a>
      <a href="/admin.html">Admin</a>
      <a href="/admin-dashboard.html">Admin Dashboard</a>
    </nav>
  </header>
  <main class="home-container">
    <div class="guide">${html}</div>
  </main>
  <footer><p>&copy; 2025 ARG Professional Development</p></footer>
  <script src="/scripts.js"></script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(page);
  });
});

// --- Start server ---
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});