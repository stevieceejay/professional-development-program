const express = require('express');
const router = express.Router();

// Root route
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend placeholder running',
    version: '1.0.0'
  });
});

// Dashboard route (GET)
router.get('/dashboard', (req, res) => {
  res.json({
    status: 'success',
    message: 'Dashboard data retrieved',
    data: {
      projects: [
        { id: 1, name: 'Project A', status: 'active' },
        { id: 2, name: 'Project B', status: 'pending' },
        { id: 3, name: 'Project C', status: 'completed' }
      ],
      notifications: 3
    }
  });
});

// Admin route (GET)
router.get('/admin', (req, res) => {
  res.json({
    status: 'success',
    message: 'Admin data retrieved',
    data: {
      users: [
        { id: 1, name: 'Alice', role: 'editor' },
        { id: 2, name: 'Bob', role: 'viewer' },
        { id: 3, name: 'Charlie', role: 'admin' }
      ],
      permissions: 'full'
    }
  });
});

// Login route (POST)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing credentials',
      user: null
    });
  }

  res.json({
    status: 'success',
    message: 'Login successful',
    user: {
      name: username,
      role: username.toLowerCase() === 'admin' ? 'admin' : 'user'
    }
  });
});

module.exports = router;