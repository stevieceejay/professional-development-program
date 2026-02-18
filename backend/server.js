/**
 * Professional Development Project platform
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 * See LICENSE file for full terms.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const logger = require("./logger");
const pinoHttp = require("pino-http");
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const compression = require('compression');
const helmet = require("helmet");
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const { addSecurityHeaders } = require('./middleware/security');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'project.db');
const db = new sqlite3.Database(
  dbPath,
  (err) => {
    if (err) console.error(err);
    else {
      console.log('Connected to SQLite database at', dbPath);
    }
  }
);

const apiRouter = require('./routes/api');
const config = require('./config'); // <-- add this line

const SESSION_SECRET = config.sessionSecret;
const PORT = config.port;

const app = express();

if (config.isProduction) {
  app.set('trust proxy', 1);
}

app.use(
  pinoHttp({
    logger,
    customLogLevel: (res, err) => {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  })
);

// --- Middleware ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: config.isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: config.isProduction ? ["'none'"] : ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "https:"], // For video content
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: config.isProduction ? [] : null,
    },
  },
  hsts: config.isProduction ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  hidePoweredBy: true,
}));

app.use(compression());

// Additional security headers
app.use(addSecurityHeaders);

// JSON payload size limits (prevent DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: config.isProduction,
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, 'data'),
    table: 'sessions',
  }),
  cookie: { 
    secure: config.isProduction,  // true in production (HTTPS only), false in development
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// --- Serve precompressed/minified JS ---
app.get("*.js", (req, res, next) => {
  const br = path.join(__dirname, "..", "frontend", "public", req.url + ".br");
  const min = path.join(__dirname, "..", "frontend", "public", req.url.replace(".js", ".min.js"));

  if (fs.existsSync(br)) {
    res.set("Content-Encoding", "br");
    res.set("Content-Type", "application/javascript");
    return res.sendFile(br);
  }

  if (fs.existsSync(min)) {
    return res.sendFile(min);
  }

  next();
});

// --- Serve precompressed/minified CSS ---
app.get("*.css", (req, res, next) => {
  const br = path.join(__dirname, "..", "frontend", "public", req.url + ".br");
  const min = path.join(__dirname, "..", "frontend", "public", req.url.replace(".css", ".min.css"));

  if (fs.existsSync(br)) {
    res.set("Content-Encoding", "br");
    res.set("Content-Type", "text/css");
    return res.sendFile(br);
  }

  if (fs.existsSync(min)) {
    return res.sendFile(min);
  }

  next();
});

// --- Static files ---
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/docs', express.static(path.join(__dirname, '..', 'docs')));

// Visit logging middleware (moved below static file serving)
app.use((req, res, next) => {
  try {
    const user = req.session && req.session.user ? req.session.user : null;
    const stmt = db.prepare(`
      INSERT INTO user_visits (user_id, path, method, user_agent, ip)
      VALUES (?, ?, ?, ?, ?)
    `);
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
    stmt.run([
      user ? user.id : null,
      req.path,
      req.method,
      req.headers['user-agent'] || '',
      ip
    ], (err) => {
      if (err) logger.error(err, "Database error");
    });
    stmt.finalize();
  } catch (e) {}
  next();
});

// --- Rate limiting ---
const signinLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window (stricter for auth)
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true, 
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signups per hour per IP
  message: { error: 'Too many accounts created. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({ 
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Too many upload requests. Please try again later.' },
  standardHeaders: true, 
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // General API rate limit
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/signin', signinLimiter);
app.use('/api/signup', signupLimiter);
app.use('/api/submissions', uploadLimiter);
app.use('/api/submissions/upload', uploadLimiter);
app.use('/api', apiLimiter); // Apply to all other API routes

// --- API routes ---
app.use('/api', apiRouter);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// --- Error handler for API routes ---
app.use((err, req, res, next) => {
  req.log.error({ err }, "Unhandled server error");
  res.status(500).json({ error: "Internal server error" });
});

// --- Global error handler (non-API) ---
app.use((err, req, res, next) => {
  logger.error(err, "Unhandled server error");
  res.status(500).send("Internal server error");
});

// --- Root and lessons routes ---
app.get('/', (req, res) => res.redirect('/lessons'));
app.get('/lessons', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'lessons.html'));
});

// --- Health endpoint ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'success', uptime: process.uptime() });
});

// --- Admin HTML guide route ---
function requireAdminMiddleware(req, res, next) {
  if (req.session && req.session.user && req.session.user.role.toLowerCase() === 'admin') return next();
  if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1)) {
    return res.status(403).json({ status: 'error', message: 'Forbidden: Admins only' });
  }
  return res.redirect('/signin.html');
}

app.get('/admin/guide', requireAdminMiddleware, (req, res) => {
  const readmePath = path.join(__dirname, '..', 'docs', 'admin-user-guide.md');
  fs.readFile(readmePath, 'utf8', (err, md) => {
    if (err) return res.status(500).send('Unable to load admin guide');
    let html;
    try { html = marked.parse(md); }
    catch (e) { html = '<pre>' + String(md).replace(/</g, '&lt;') + '</pre>'; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin Guide</title>
  <link rel="stylesheet" href="/style.css">
</head><body>
  <header>
    <h1>Admin Guide</h1>
    <nav class="navbar">
      <a href="/">Home</a>
      <a href="/dashboard.html">User Dashboard</a>
      <a href="/admin.html">Admin</a>
      <a href="/admin-dashboard.html">Admin Dashboard</a>
    </nav>
  </header>
  <main class="home-container"><div class="guide">${html}</div></main>
  <footer><p>&copy; 2025 The Professional Development Project</p></footer>
  <script src="/scripts.js"></script>
</body></html>`);
  });
});

// --- Start server ---
function start(port) {
  // Ensure port is a number and within valid range
  port = Number(port);
  console.log(`[DEBUG] Attempting to start server on port: ${port}`);
  console.log(`[DEBUG] Port type: ${typeof port}`);
  console.log(`[DEBUG] Config port: ${config.port}`);
  console.log(`[DEBUG] Environment: ${config.env}`);
  
  if (isNaN(port) || port < 0 || port > 65535) {
    logger.error(`Invalid port: ${port}. Please check your configuration.`);
    console.error(`[DEBUG] Invalid port detected: ${port}`);
    process.exit(1);
  }
  
  const server = app.listen(port, () => {
    console.log(`✓ Server is now listening on port ${port}`);
    console.log(`✓ Access at: http://localhost:${port}`);
    logger.info(`Server running on port ${port} in ${config.env} mode`);
    if (config.isProduction) {
      logger.info('Production mode: Secure cookies enabled, full compression active');
    }
  });
  
  server.on('error', (err) => {
    console.error(`[DEBUG] Server error:`, err);
    if (err && err.code === 'EADDRINUSE') {
      const fallback = port + 1;
      if (fallback > 65535) {
        logger.error('No available ports in range 0-65535.');
        process.exit(1);
      }
      logger.warn(`Port ${port} in use, retrying on ${fallback}`);
      console.log(`[DEBUG] Retrying on port ${fallback}`);
      start(fallback);
    } else {
      throw err;
    }
  });
}

console.log(`[DEBUG] Starting server with PORT: ${PORT}`);
start(PORT);