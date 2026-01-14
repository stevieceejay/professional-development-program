// backend/logger.js
/**
 * Professional Development Project platform - Logger
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * This software is proprietary and confidential.
 */

const pino = require("pino");

const isProd = process.env.NODE_ENV === "production";

const logger = pino({
  level: isProd ? "info" : "debug",
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
});

module.exports = logger;