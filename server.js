const express = require('express');
const app = express();
const routes = require('./routes'); // automatically loads routes/index.js

// Middleware
app.use(express.json());

// Mount all routes under /api
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
