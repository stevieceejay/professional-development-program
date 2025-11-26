const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 4000;

app.use(cors());
app.get('/', (req, res) => {
  res.json({ message: 'Backend placeholder running', status: 'ok' });
});

app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Backend placeholder running', status: 'ok' });
});

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  res.json({ route: 'login', username, status: 'login route hit' });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.json({ route: 'dashboard', data: 'Dashboard placeholder data' });
});

// Admin route
app.get('/admin', (req, res) => {
  res.json({ route: 'admin', data: 'Admin placeholder data' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});
