/**
 * Professional Development Project - API Response Envelope Helper
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * Standardized JSON response format:
 * { status: 'success'|'error', data?: any, message?: string }
 */

function success(res, statusCode = 200, data = null, message = null) {
  const body = { status: 'success' };
  if (data !== null && data !== undefined) body.data = data;
  if (message) body.message = message;
  return res.status(statusCode).json(body);
}

function error(res, statusCode = 400, message = 'An error occurred', data = null) {
  const body = { status: 'error', message };
  if (data !== null && data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
}

module.exports = { success, error };
