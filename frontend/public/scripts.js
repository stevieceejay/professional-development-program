document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();

    const nav = document.querySelector('.navbar');
    const banner = document.getElementById('welcomeBanner');

    if (nav) {
      nav.innerHTML = '';
      nav.innerHTML += `<a href="index.html">Home</a>`;

      if (data.status === 'success') {
        // Logged in
        nav.innerHTML += `<a href="dashboard.html">Dashboard</a>`;
        if (data.data.role === 'Admin') {
          // Show explicit admin links
          nav.innerHTML += `<a href="admin.html">Admin</a>`;
          nav.innerHTML += `<a href="admin-dashboard.html">Admin Dashboard</a>`;
          nav.innerHTML += `<a href="admin-guide.html">Admin Guide</a>`;
        }
        nav.innerHTML += `<a href="#" id="logoutLink">Logout</a>`;

        // ✅ Show welcome banner
        if (banner) {
          banner.textContent = `Welcome, ${data.data.username} (${data.data.role})`;
        }

        // Wire up logout
        document.addEventListener('click', async (e) => {
          if (e.target && e.target.id === 'logoutLink') {
            e.preventDefault();
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = 'index.html';
          }
        });
      } else {
        // Not logged in
        nav.innerHTML += `<a href="login.html">Login</a>`;
        if (banner) {
          banner.textContent = 'You are not logged in';
        }
      }
    }
  } catch (err) {
    console.error('Error checking session:', err);
  }

  // --- Dashboard Projects ---
  if (document.getElementById('projectsOutput')) {
    loadProjects();
  }

  // --- Admin Users ---
  if (document.getElementById('usersOutput')) {
    loadUsers();
  }
});

// Load projects from API
async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    const data = await res.json();
    const container = document.getElementById('projectsOutput');
    
    if (data.status === 'success' && Array.isArray(data.data)) {
      let html = '<table><thead><tr><th>Project Name</th><th>Description</th><th>Status</th></tr></thead><tbody>';
      data.data.forEach(proj => {
        html += `<tr><td>${proj.name}</td><td>${proj.description || 'N/A'}</td><td>${proj.status || 'Active'}</td></tr>`;
      });
      html += '</tbody></table>';
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p>No projects found.</p>';
    }
  } catch (err) {
    console.error('Error loading projects:', err);
    document.getElementById('projectsOutput').innerHTML = '<p>Error loading projects.</p>';
  }
}

// Load users from API (admin only)
async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    const container = document.getElementById('usersOutput');
    
    if (data.status === 'success' && Array.isArray(data.data)) {
      let html = '<table><thead><tr><th>Username</th><th>Email</th><th>Role</th></tr></thead><tbody>';
      data.data.forEach(user => {
        html += `<tr><td>${user.username}</td><td>${user.email || 'N/A'}</td><td>${user.role || 'User'}</td></tr>`;
      });
      html += '</tbody></table>';
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p>No users found or access denied.</p>';
    }
  } catch (err) {
    console.error('Error loading users:', err);
    document.getElementById('usersOutput').innerHTML = '<p>Error loading users.</p>';
  }
}