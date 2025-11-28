const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend/public')));

// Default route: serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
});

// Mount backend API routes
const routes = require('./routes/server.js');
app.use('/api', routes);

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});