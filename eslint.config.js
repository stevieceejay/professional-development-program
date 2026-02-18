// ESLint flat config (CommonJS) for Node backend and browser frontend
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  // Base recommended rules for all files
  js.configs.recommended,
  // Global rule overrides
  {
    rules: {
      // Convert common noisy errors to warnings for existing code
      "no-empty": "warn",
    },
  },
  // Global ignores (use this instead of .eslintignore)
  {
    ignores: [
      "node_modules/**",
      "docs/**",
      ".vscode/**",
      "backend/data/**/*.db",
      "backend/uploads/**",
      "frontend/public/**/*.min.js",
      "frontend/public/**/*.min.css",
      "frontend/public/**/*.br",
      "frontend/public/scripts.min.js",
      "frontend/public/style.min.css",
      "eslint.config.js",
      "package-lock.json",
      "**/*.py",
      "**/*.sql",
      "**/*.sh",
      "**/*.ps1",
    ],
  },
  // Top-level utility scripts (relaxed rules for legacy scripts)
  {
    files: [
      "check_*.py",
      "seed-*.js",
      "test_*.js",
      "test-*.js",
      "create_*.js",
      "reset_*.js",
      "smoke.ps1",
      "smoke-auth.ps1",
      "test-*.ps1",
      "*.sql",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "off",
      "no-undef": "off", // Top-level legacy scripts may reference globals
    },
  },
  // Backend Node.js files (stricter)
  {
    files: [
      "backend/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
      "no-empty": "warn",
      "no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_", 
        varsIgnorePattern: "^_|^(e|err|error|_)" 
      }],
    },
  },
  // Tools directory scripts
  {
    files: [
      "tools/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "off",
    },
  },
  // Frontend browser files
  {
    files: [
      "frontend/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // API helper frontend file (uses console intentionally for debug)
  {
    files: [
      "frontend/public/js/api.js",
    ],
    rules: {
      "no-console": "off",
      "no-unused-vars": "warn",
    },
  },
];
