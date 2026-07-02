# Security Configuration

This document outlines the security measures implemented in the Professional Development Project platform.

---

## Security Features Implemented

### 1. HTTP Security Headers (Helmet.js)

**Content Security Policy (CSP)**
- `defaultSrc`: Only allow resources from same origin
- `scriptSrc`: Self + inline scripts (required for dynamic functionality)
- `styleSrc`: Self + inline styles
- `imgSrc`: Self + data URIs + HTTPS
- `mediaSrc`: Self + HTTPS (for video content)
- `frameSrc`: None (prevents clickjacking)
- `objectSrc`: None (prevents plugin exploitation)
- `upgradeInsecureRequests`: Enabled in production (forces HTTPS)

**HTTP Strict Transport Security (HSTS)**
- Max age: 1 year
- Include subdomains: Yes
- Preload: Yes
- Forces browsers to use HTTPS only

**Other Headers**
- X-Content-Type-Options: nosniff (prevents MIME sniffing)
- X-Frame-Options: DENY (prevents clickjacking)
- X-XSS-Protection: Enabled (for older browsers)
- Referrer-Policy: strict-origin-when-cross-origin
- Hide X-Powered-By header (obscures server technology)

### 2. Rate Limiting

**Sign-in Endpoint** (`/api/signin`)
- 5 attempts per 15 minutes per IP
- Skip counting successful logins
- Stricter to prevent brute force attacks

**Sign-up Endpoint** (`/api/signup`)
- 3 registrations per hour per IP
- Prevents spam account creation

**Upload Endpoints** (`/api/submissions/*`)
- 50 requests per 15 minutes
- Protects against DoS via large uploads

**General API** (`/api/*`)
- 200 requests per 15 minutes
- Overall API protection

### 3. Session Security

**Configuration**
- Session name: `sid` (obscured, not default 'connect.sid')
- HttpOnly cookies: Yes (prevents XSS cookie theft)
- Secure cookies: Yes in production (HTTPS only)
- SameSite: strict (CSRF protection)
- Rolling sessions: Yes (extends timeout on activity)
- Session duration: 24 hours
- Session regeneration: On login (prevents session fixation)

**Storage**
- SQLite-based session store
- Persistent across server restarts

### 4. Authentication Security

**Password Hashing**
- Algorithm: bcrypt
- Rounds: 10 (provides good security/performance balance)
- Salted automatically by bcrypt

**Password Requirements**
- Minimum length: 8 characters
- Complexity: At least one uppercase, lowercase, number, and special character (optional - configurable via `validatePasswordStrength()`)

**Login Protection**
- Case-insensitive username/email matching
- Consistent error messages (prevents username enumeration)
- Rate limiting (5 attempts per 15 minutes)
- Session regeneration on successful login (prevents session fixation)

**Signup Validation**
- Username: 3-30 characters, alphanumeric + underscores/hyphens
- Email: Format validation via regex
- Input sanitization: Removes null bytes, trims whitespace
- UNIQUE constraints on username and email in database

### 5. Input Validation & Sanitization

**Middleware Functions** (in `backend/middleware/security.js`)

- `sanitizeInput()`: Removes null bytes, trims whitespace
- `sanitizeObject()`: Applies sanitization to all string properties
- `isValidEmail()`: Email format validation
- `isValidUsername()`: Username format validation (3-30 chars, alphanumeric + _-)
- `detectSQLInjection()`: Pattern-based SQL injection detection (defense in depth)
- `sanitizeFilePath()`: Prevents directory traversal attacks

**Applied To**
- All user authentication inputs (username, email, password)
- File upload filenames
- User-submitted content (recommended to add to all endpoints)

### 6. File Upload Security

**Restrictions**
- Maximum file size: 500MB (suitable for video uploads)
- Allowed file types: 
  - Videos: mp4, mov, avi, wmv, webm
  - Documents: pdf, docx, doc, txt
  - Images: jpg, jpeg, png, gif
- File extension validation
- Sanitized filenames (removes special characters)

**Storage**
- User-specific directories (`uploads/{userId}/`)
- Files named with timestamp prefix (prevents overwriting)
- Upload directory excluded from version control

### 7. Database Security

**SQL Injection Prevention**
- ✅ Parameterized queries (prepared statements) used throughout
- ✅ No string concatenation in SQL queries
- ✅ Database driver handles escaping automatically

**Examples of Proper Usage**
```javascript
// GOOD - Parameterized
db.get('SELECT * FROM users WHERE id = ?', [userId], callback);

// GOOD - Prepared statement
const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
stmt.run([name, email]);

// BAD - String concatenation (NOT used in this codebase)
db.get(`SELECT * FROM users WHERE id = ${userId}`, callback); // VULNERABLE
```

**Database File Security**
- Database files excluded from git via `.gitignore`
- File permissions should be restricted (600) in production
- Regular backups recommended (see DEPLOYMENT.md)

### 8. DoS Protection

**Request Size Limits**
- JSON payload: 10MB maximum
- URL-encoded data: 10MB maximum
- File uploads: 500MB maximum
- Prevents memory exhaustion attacks

**Rate Limiting**
- Applied to all sensitive endpoints
- Prevents resource exhaustion
- Returns standard HTTP 429 (Too Many Requests)

### 9. Error Handling

**Security Principles**
- Generic error messages to users (prevents information leakage)
- Detailed errors logged server-side only
- Consistent messages for authentication failures
- No stack traces in production responses

### 10. Production-Specific Security

**Environment Detection**
```javascript
if (config.isProduction) {
  // Enable secure cookies (HTTPS only)
  // Upgrade insecure requests (HTTP -> HTTPS)
  // Enforce strong SESSION_SECRET validation
}
```

**HTTPS Enforcement**
- Session cookies only sent over HTTPS
- CSP upgrade-insecure-requests in production
- HSTS header forces HTTPS
- Nginx should redirect HTTP to HTTPS

---

## Security Utilities Available

Located in `backend/middleware/security.js`:

### Authentication Helpers
- `requireAuth(req, res, next)` - Middleware to require login
- `requireAdmin(req, res, next)` - Middleware to require admin role

### Validation Functions
- `isValidEmail(email)` - Email format validation
- `isValidUsername(username)` - Username format validation
- `validatePasswordStrength(password)` - Comprehensive password checks

### Sanitization Functions
- `sanitizeInput(input)` - Basic input sanitization
- `sanitizeObject(obj)` - Sanitize all string properties
- `sanitizeFilePath(path)` - Prevent directory traversal

### Security Utilities
- `generateSecureToken(bytes)` - Generate cryptographically secure tokens
- `constantTimeCompare(a, b)` - Timing-safe string comparison
- `detectSQLInjection(input)` - Pattern-based SQL injection detection
- `addSecurityHeaders(req, res, next)` - Additional security headers middleware

---

## Security Best Practices for Development

### 1. Never Commit Secrets
- ✅ `.env` files in `.gitignore`
- ✅ Use `env.example` for templates
- ✅ Rotate secrets if accidentally committed

### 2. Always Use Parameterized Queries
```javascript
// GOOD
db.get('SELECT * FROM users WHERE id = ?', [userId]);

// BAD - Never do this
db.get(`SELECT * FROM users WHERE id = ${userId}`);
```

### 3. Validate and Sanitize User Input
```javascript
const { sanitizeInput, isValidEmail } = require('./middleware/security');

let email = sanitizeInput(req.body.email);
if (!isValidEmail(email)) {
  return res.status(400).json({ error: 'Invalid email' });
}
```

### 4. Use Middleware for Protected Routes
```javascript
const { requireAuth, requireAdmin } = require('./middleware/security');

// Require authentication
router.get('/dashboard', requireAuth, (req, res) => { ... });

// Require admin role
router.delete('/users/:id', requireAdmin, (req, res) => { ... });
```

### 5. Handle Errors Securely
```javascript
// GOOD - Generic message to user
catch (err) {
  logger.error(err); // Log details server-side
  res.status(500).json({ error: 'An error occurred' });
}

// BAD - Exposes internal details
catch (err) {
  res.status(500).json({ error: err.message, stack: err.stack });
}
```

### 6. Regular Security Maintenance
- Keep dependencies updated: `npm audit` and `npm update`
- Review security advisories: `npm audit fix`
- Monitor logs for suspicious activity
- Test rate limiting effectiveness
- Review and update CSP as needed

---

## Security Checklist for Deployment

Before deploying to production, verify:

- [ ] `NODE_ENV=production` is set
- [ ] Strong `SESSION_SECRET` configured (64+ random characters)
- [ ] HTTPS/SSL certificate installed and working
- [ ] Firewall configured (allow only necessary ports)
- [ ] Database file has restricted permissions (chmod 600)
- [ ] `.env` file has restricted permissions (chmod 600)
- [ ] File uploads directory properly configured
- [ ] Rate limiting is working (test with curl/Postman)
- [ ] All dependencies are up to date (`npm audit`)
- [ ] Server software (Node.js, Nginx) is up to date
- [ ] Backups are configured and tested
- [ ] Logging is working and being monitored
- [ ] Error handling doesn't expose sensitive information
- [ ] Test authentication flows (login, logout, session expiry)
- [ ] Verify HSTS header is present: `curl -I https://yourdomain.com`
- [ ] Test CSP doesn't break functionality

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email the security team directly
3. Include detailed steps to reproduce
4. Wait for response before public disclosure

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

---

**Last Updated**: January 11, 2026
