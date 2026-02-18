/**
 * Professional Development Project platform - Security Middleware
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

// backend/middleware/security.js
/**
 * Security middleware and utilities
 */

/**
 * Input sanitization helper
 * Removes potentially dangerous characters from user input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize an object's string values
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = typeof obj[key] === 'string' 
        ? sanitizeInput(obj[key]) 
        : obj[key];
    }
  }
  return sanitized;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username (alphanumeric, underscores, hyphens, 3-30 chars)
 */
function isValidUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Check if user is authenticated
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'Authentication required' 
    });
  }
  next();
}

/**
 * Check if user is admin
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      status: 'error', 
      message: 'Authentication required' 
    });
  }
  
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ 
      status: 'error', 
      message: 'Admin access required' 
    });
  }
  
  next();
}

/**
 * Prevent timing attacks on password comparison
 */
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  const aLen = Buffer.byteLength(a);
  const bLen = Buffer.byteLength(b);
  
  // Use crypto.timingSafeEqual for constant-time comparison
  const crypto = require('crypto');
  
  // If lengths differ, still do comparison to prevent timing leak
  const bufA = Buffer.alloc(Math.max(aLen, bLen));
  const bufB = Buffer.alloc(Math.max(aLen, bLen));
  
  bufA.write(a);
  bufB.write(b);
  
  try {
    return crypto.timingSafeEqual(bufA, bufB) && aLen === bLen;
  } catch (e) {
    return false;
  }
}

/**
 * Generate secure random token
 */
function generateSecureToken(bytes = 32) {
  const crypto = require('crypto');
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Password strength validation
 */
function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Check for SQL injection patterns (defense in depth)
 * Note: This is NOT a replacement for parameterized queries!
 * Always use prepared statements. This is just an additional layer.
 */
function detectSQLInjection(input) {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /('|\"|`)\s*(OR|AND)\s*\1/i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize file path to prevent directory traversal
 */
function sanitizeFilePath(filePath) {
  if (typeof filePath !== 'string') return '';
  
  // Remove any directory traversal attempts
  return filePath.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Add security headers manually (in addition to helmet)
 */
function addSecurityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS Protection (for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Disable client-side caching for sensitive pages
  if (req.path.includes('/api/') || req.path.includes('/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

module.exports = {
  sanitizeInput,
  sanitizeObject,
  isValidEmail,
  isValidUsername,
  requireAuth,
  requireAdmin,
  constantTimeCompare,
  generateSecureToken,
  validatePasswordStrength,
  detectSQLInjection,
  sanitizeFilePath,
  addSecurityHeaders,
};
