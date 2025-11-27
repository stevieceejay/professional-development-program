const express = require('express');
const router = express.Router();

// Demo routes
router.get('/', (req, res) => {
  res.json({ message: 'Backend placeholder running', status: 'ok' });
});

router.get('/dashboard', (req, res) => {
  res.json({ route: 'dashboard', data: 'Dashboard placeholder data' });
});

router.get('/admin', (req, res) => {
  res.json({ route: 'admin', data: 'Admin placeholder data' });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  res.json({ route: 'login', username, status: 'login route hit' });
});

module.exports = router;