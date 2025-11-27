const express = require('express');
const app = express();
const PORT = 4000;

// Middleware (optional)
app.use(express.json());

// Mount routes
const routes = require('./routes/server.js');
app.use('/', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});
