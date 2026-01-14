/**
 * Professional Development Project platform - Configuration
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

// backend/config.js
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Helper: fail fast with a clear message
function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

// Environment
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

// Validate NODE_ENV
if (!["development", "production", "test"].includes(NODE_ENV)) {
  console.warn(`⚠️  Invalid NODE_ENV: ${NODE_ENV}. Using 'development' instead.`);
}

// Required variables
const SESSION_SECRET = requireEnv("SESSION_SECRET");

// Production-specific validation
if (IS_PRODUCTION && SESSION_SECRET === "change-me-please") {
  console.error(`❌ Production mode requires a secure SESSION_SECRET!`);
  process.exit(1);
}

// Optional but recommended
const PORT = process.env.PORT || 4000;

// SMTP (optional but validated if partially provided)
const SMTP = {
  host: process.env.SMTP_HOST || "",
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.SMTP_FROM || "",
};

// If any SMTP field is set, require all of them
const smtpFields = ["host", "user", "pass", "from"];
const smtpProvided = smtpFields.some((f) => SMTP[f] !== "");

if (smtpProvided) {
  for (const field of smtpFields) {
    if (!SMTP[field]) {
      console.error(`❌ SMTP configuration incomplete: missing SMTP_${field.toUpperCase()}`);
      process.exit(1);
    }
  }
}

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "project.db");

// Ensure DB directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Export clean config object
module.exports = {
  env: NODE_ENV,
  port: PORT,
  sessionSecret: SESSION_SECRET,
  dbPath: DB_PATH,
  smtp: SMTP,
  isProduction: IS_PRODUCTION,
};

const config = require("./config");

