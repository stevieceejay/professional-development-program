const express = require('express');
const router = express.Router();

// Login route (POST)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simple demo validation
  if (username && password) {
    res.json({
      status: 'success',
      message: 'Login successful',
      user: {
        name: username,
        role: username.toLowerCase() === 'admin' ? 'admin' : 'user'
      }
    });
  } else {
    res.json({
      status: 'error',
      message: 'Missing username or password',
      user: 'guest'
    });
  }
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

module.exports = router;