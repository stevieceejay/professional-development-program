async function login(username, password) {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    console.log('Login response:', data);

    if (data.status === 'success') {
      document.getElementById('status').textContent =
        `Logged in as ${data.user.username} (${data.user.role})`;
      document.getElementById('logoutBtn').classList.remove('hidden');
      document.getElementById('loginForm').classList.add('hidden');
    } else {
      document.getElementById('status').textContent = `Error: ${data.message}`;
    }
  } catch (err) {
    document.getElementById('status').textContent = `Error: ${err.message}`;
  }
}

async function logout() {
  try {
    const res = await fetch('/api/logout', { method: 'POST' });
    const data = await res.json();
    console.log('Logout response:', data);

    document.getElementById('status').textContent = data.message;
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
  } catch (err) {
    document.getElementById('status').textContent = `Error: ${err.message}`;
  }
}

// --- Event listeners ---
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  login(username, password);
});

document.getElementById('logoutBtn').addEventListener('click', logout);