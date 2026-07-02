const express = require('express');
const router = express.Router();

// Demo dashboard route (projects)
router.get('/dashboard', (req, res) => {
  const response = { status: 'success', data: [] };
  console.log('📊 Dashboard route hit');
  console.log('Response:', JSON.stringify(response, null, 2));
  res.json(response);
});

// Demo admin route (users)
router.get('/admin', (req, res) => {
  const response = {
    status: 'success',
    data: [
      { id: 101, name: 'Alice Johnson', role: 'Manager' },
      { id: 102, name: 'Bob Smith', role: 'Developer' },
      { id: 103, name: 'Carol Lee', role: 'Intern' }
    ]
  };
  console.log('👥 Admin route hit');
  console.log('Response:', JSON.stringify(response, null, 2));
  res.json(response);
});

// Demo login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`🔑 Login attempt: ${username}`);
  if (username && password) {
    const response = { status: 'success', user: { username, role: 'Guest' } };
    console.log('Response:', JSON.stringify(response, null, 2));
    res.json(response);
  } else {
    const errorResponse = { status: 'error', message: 'Missing credentials' };
    console.log('Response:', JSON.stringify(errorResponse, null, 2));
    res.status(400).json(errorResponse);
  }
});

module.exports = router;