document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/projects');
    const data = await res.json();

    const table = document.getElementById('projectsTable');
    data.forEach(project => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${project.id}</td><td>${project.project}</td><td>${project.status}</td>`;
      table.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading projects:', err);
  }
});