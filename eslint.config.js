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
      "backend/data/**/*.db",
      "eslint.config.js",
    ],
  },
  // Backend Node.js files
  {
    files: [
      "server.js",
      "seed-user.js",
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
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
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
];
