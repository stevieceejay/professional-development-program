const express = require('express');
const app = express();
const PORT = 4000;

// Middleware (optional)
app.use(express.json());


// Serve frontend files from "public" folder
app.use(express.static('public'));
app.use('/api', require('./routes/server.js'));


// Mount backend routes
const routes = require('./routes/server.js');
app.use('/api', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});
