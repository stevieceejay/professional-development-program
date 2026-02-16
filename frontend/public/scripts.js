/**
 * Professional Development Project platform - Client Scripts
 * Copyright © 2026 Stephen. All Rights Reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

// Global toast helper usable across pages
function showToast(message, type = 'success', timeout = 2500) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => { t.remove(); }, timeout);
}
window.showToast = showToast;

// Load all users into the admin table
async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    const resp = await res.json();
    const users = Array.isArray(resp) ? resp : (resp && resp.data && Array.isArray(resp.data) ? resp.data : []);
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) {
      console.error('Users table not found on this page');
      return;
    }
    tbody.innerHTML = '';
    if (Array.isArray(users) && users.length > 0) {
      users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.id}</td>
          <td><input type="text" value="${user.username}" id="username-${user.id}"></td>
          <td><input type="text" value="${user.email}" id="email-${user.id}"></td>
          <td><input type="text" value="${user.role}" id="role-${user.id}"></td>
          <td>
            <button onclick="updateUser(${user.id})">Save</button>
            <button onclick="deleteUser(${user.id})">Delete</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    } else {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5">No users found.</td>';
      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('Failed to load users', err);
    if (window.showToast) showToast('Failed to load users', 'error');
  }
}

// Load all projects
async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    const data = await res.json();
    const container = document.getElementById('projectsOutput');
    if (!container) return;
    
    if (data.status === 'success' && data.data && data.data.length > 0) {
      container.innerHTML = data.data.map(p => `
        <div class="card">
          <h3>${p.name}</h3>
          <p>${p.description || 'No description'}</p>
          <p><strong>Status:</strong> ${p.status}</p>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p>No projects found.</p>';
    }
  } catch (err) {
    const container = document.getElementById('projectsOutput');
    if (container) container.innerHTML = '<p>Error loading projects.</p>';
    console.error('Failed to load projects', err);
  }
}

// Update a user
async function updateUser(id) {
  const username = document.getElementById(`username-${id}`).value;
  const email = document.getElementById(`email-${id}`).value;
  const role = document.getElementById(`role-${id}`).value;

  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, role })
    });
    const data = await res.json();
    alert('User updated: ' + JSON.stringify(data));
    loadUsers(); // refresh table
  } catch (err) {
    console.error('Update failed', err);
  }
}

// Delete a user
async function deleteUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    alert('User deleted: ' + JSON.stringify(data));
    loadUsers(); // refresh table
  } catch (err) {
    console.error('Delete failed', err);
  }
}

// Add a new user
async function addUser() {
  const usernameEl = document.getElementById('newUsername');
  const emailEl = document.getElementById('newEmail');
  const roleEl = document.getElementById('newRole');
  const username = usernameEl.value.trim();
  const email = emailEl.value.trim();
  const role = roleEl.value.trim();
  if (!username || !email || !role) {
    if (window.showToast) showToast('Please fill all user fields', 'error');
    return;
  }
  const saveBtn = document.querySelector('button[onclick="addUser()"]');
  if (saveBtn) saveBtn.disabled = true;
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, role })
    });
    const data = await res.json();
    if (res.ok && data && data.status !== 'error') {
      if (window.showToast) showToast('User added', 'success');
      usernameEl.value = '';
      emailEl.value = '';
      roleEl.value = '';
      await loadUsers();
    } else {
      if (window.showToast) showToast(data.message || 'Failed to add user', 'error');
    }
  } catch (err) {
    console.error('Add failed', err);
    if (window.showToast) showToast('Failed to add user', 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// Load lessons (shared client function, used by lessons.html or dashboards)
async function loadLessonsClient(targetId = 'lessons', options = {}) {
  const compact = !!options.compact;
  const weekFilter = options.week; // number | undefined
  const container = document.getElementById(targetId);
  if (!container) return;
  try {
    const res = await fetch('/api/lessons');
    const data = await res.json();
    container.innerHTML = '';
    if (!data || data.status !== 'success' || !Array.isArray(data.data) || data.data.length === 0) {
      container.textContent = 'No lessons available yet.';
      return;
    }
    const lessons = weekFilter ? data.data.filter(l => Number(l.week) === Number(weekFilter)) : data.data;
    if (!lessons.length) {
      container.textContent = `No lessons found for week ${weekFilter}.`;
      return;
    }
    lessons.forEach(lesson => {
      const el = document.createElement('div');
      el.className = compact ? 'lesson-card compact' : 'lesson-card full';
      const videoHtml = lesson.video_url && !compact ? `
        <video width="480" controls>
          <source src="${lesson.video_url}" type="video/mp4">
          Your browser does not support the video tag.
        </video>` : '';
      el.innerHTML = `
        <h3>${lesson.title}</h3>
        <p>${lesson.description || ''}</p>
        ${videoHtml}
      `;
      container.appendChild(el);
    });
  } catch (err) {
    container.textContent = 'Error loading lessons.';
    console.error('Failed to load lessons', err);
  }
}

// Render a 12-week grid with one video card per week (first match)
async function renderWeeklyVideoGrid(targetId = 'lessonsGrid', selectedWeek = 'all') {
  const container = document.getElementById(targetId);
  if (!container) return;
  try {
    const res = await fetch('/api/lessons');
    const data = await res.json();
    const lessons = (data && data.status === 'success' && Array.isArray(data.data)) ? data.data : [];

    // Build lookup: week -> first lesson
    const byWeek = {};
    lessons.forEach(l => {
      const w = Number(l.week);
      if (!byWeek[w]) byWeek[w] = l;
    });

    // Grid container styles
    container.innerHTML = '';
    container.classList.remove('empty-state');

    const startW = 1;
    const endW = 12;
    const filterValue = selectedWeek === 'all' ? 'all' : Number(selectedWeek);

    // Add a small header showing filter state
    const header = document.createElement('div');
    header.className = 'grid-header';
    header.innerHTML = filterValue === 'all'
      ? '<h2>All Weeks</h2>'
      : `<h2>Week ${filterValue}</h2>`;
    container.appendChild(header);

    let rendered = 0;
    for (let w = startW; w <= endW; w++) {
      if (filterValue !== 'all' && filterValue !== w) continue;
      const card = document.createElement('div');
      card.className = 'lesson-card full';
      if (filterValue === w) card.classList.add('highlight');
      const l = byWeek[w];
      if (l) {
        const posterAttr = l.poster_url ? ` poster="${l.poster_url}"` : '';
        const videoBlock = l.video_url
          ? `<video width="360" controls${posterAttr}>
               <source src="${l.video_url}" type="video/mp4">
               Your browser does not support the video tag.
             </video>`
          : '<div class="video-placeholder">Video URL not set.</div>';
        card.innerHTML = `
          <div class="card-header"><span class="week-badge">Week ${w}</span><h3>${l.title}</h3></div>
          <p>${l.description || ''}</p>
          ${videoBlock}
          <div class="assignment-section" id="assignment-${l.id}"></div>
        `;
        // Attach assignment prompt + submission box for Weeks 11 and 12
        // Render assignment section for all weeks (if assignment exists)
        renderAssignmentSection(l.id, `assignment-${l.id}`);
      } else {
        card.innerHTML = `
          <div class="card-header"><span class="week-badge">Week ${w}</span><h3>(placeholder)</h3></div>
          <p>No lesson uploaded yet.</p>
          <div class="video-placeholder">Video placeholder</div>
        `;
      }
      container.appendChild(card);
      rendered++;
    }
    if (rendered === 0) {
      container.classList.add('empty-state');
      container.innerHTML = '<h3>No lessons available</h3><p>Upload a video to get started.</p>';
    }
  } catch (err) {
    container.textContent = 'Error loading lessons.';
    console.error('Failed to render weekly grid', err);
  }
}

// Hook up a week selector to the weekly grid
function initWeekSelector(selectId = 'weekSelect', gridId = 'lessonsGrid') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const render = () => {
    const val = sel.value || 'all';
    renderWeeklyVideoGrid(gridId, val);
  };
  sel.addEventListener('change', render);
  render();
}

// Render assignment prompt and submission box for a lesson
async function renderAssignmentSection(lessonId, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;
  try {
    const res = await fetch(`/api/assignments/lesson/${lessonId}`);
    const data = await res.json();
    const assignments = (data && data.status === 'success' && Array.isArray(data.data)) ? data.data : [];
    const a = assignments[0];
    if (!a) {
      container.innerHTML = '<div class="empty-state"><p>No assignment configured.</p></div>';
      return;
    }
    const due = a.due_date ? new Date(a.due_date) : null;
    const now = new Date();
    const isLate = due && now > due;
    const dueText = due ? `Due: ${due.toLocaleString()}` : '';
    const lateBadge = isLate ? '<span class="badge badge-late">Late</span>' : '';

    container.innerHTML = `
      <div class="card-divider"></div>
      <h4>Assignment</h4>
      <p><strong>${a.title}</strong></p>
      <p>${a.instructions || ''}</p>
      <p class="muted">${dueText} ${lateBadge}</p>
      <label for="submission-${a.id}">Your submission</label>
      <textarea id="submission-${a.id}" rows="4" placeholder="Paste essay text or video link..."></textarea>
      <button class="btn" onclick="submitAssignment(${a.id})">Submit</button>
      <div class="upload-row">
        <input type="file" id="file-${a.id}" />
        <button class="btn" onclick="uploadAssignmentFile(${a.id})">Upload File</button>
      </div>
      <div class="submission-status" id="submission-status-${a.id}"></div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p>Error loading assignment.</p></div>';
    console.error('Failed to load assignment', err);
  }
}

// Submit assignment content for the logged-in user
async function submitAssignment(assignmentId) {
  const input = document.getElementById(`submission-${assignmentId}`);
  const statusEl = document.getElementById(`submission-status-${assignmentId}`);
  if (!input || !statusEl) return;
  const content = input.value.trim();
  if (!content) {
    if (window.showToast) showToast('Please add your submission content', 'error');
    return;
  }
  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignment_id: assignmentId, content })
    });
    const data = await res.json();
    if (res.ok && data && data.status === 'success') {
      if (window.showToast) showToast('Submission received', 'success');
      const ts = new Date().toLocaleString();
      statusEl.textContent = `Submitted successfully at ${ts}.`;
      input.value = '';
    } else {
      const msg = (data && (data.message || data.error)) || 'Submission failed';
      if (window.showToast) showToast(msg, 'error');
      statusEl.textContent = msg;
    }
  } catch (err) {
    console.error('Submission failed', err);
    if (window.showToast) showToast('Error submitting assignment', 'error');
    statusEl.textContent = 'Error submitting assignment';
  }
}

// Upload assignment file (multipart/form-data)
async function uploadAssignmentFile(assignmentId) {
  const fileInput = document.getElementById(`file-${assignmentId}`);
  const statusEl = document.getElementById(`submission-status-${assignmentId}`);
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    if (window.showToast) showToast('Please choose a file', 'error');
    return;
  }
  const form = new FormData();
  form.append('assignment_id', String(assignmentId));
  form.append('file', fileInput.files[0]);
  try {
    const res = await fetch('/api/submissions/upload', {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    if (res.ok && data && data.status === 'success') {
      const ts = new Date().toLocaleString();
      if (window.showToast) showToast('File uploaded', 'success');
      statusEl.textContent = `File uploaded at ${ts}.`;
      fileInput.value = '';
    } else {
      const msg = (data && (data.message || data.error)) || 'Upload failed';
      if (window.showToast) showToast(msg, 'error');
      statusEl.textContent = msg;
    }
  } catch (err) {
    console.error('Upload failed', err);
    if (window.showToast) showToast('Error uploading file', 'error');
    statusEl.textContent = 'Error uploading file';
  }
}

// Load current user's submissions into a target container
async function loadMySubmissions(targetId = 'mySubmissions') {
  const el = document.getElementById(targetId);
  if (!el) return;
  try {
    const res = await fetch('/api/submissions/my', { credentials: 'same-origin' });
    const data = await res.json();
    let rows = [];
    if (Array.isArray(data)) rows = data;
    else if (data && Array.isArray(data.data)) rows = data.data;
    else {
      el.innerHTML = '<p class="empty-state">Unable to load submissions.</p>';
      return;
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      el.innerHTML = '<div class="empty-state"><h3>No submissions yet</h3><p>Submit an assignment to see it here.</p></div>';
      return;
    }
    el.innerHTML = rows.map(r => {
      const ts = r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '';
      const fileLink = r.file_path ? `<a href="/${r.file_path}" target="_blank">File</a>` : '';
      const contentPreview = r.content ? `<div class="content-preview">${r.content.substring(0, 200)}${r.content.length > 200 ? '…' : ''}</div>` : '';
      return `
        <div class="submission-row">
          <div><strong>${r.assignment_title || 'Assignment ' + r.assignment_id}</strong></div>
          <div>Submitted: ${ts}</div>
          <div>${fileLink}</div>
          ${contentPreview}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load submissions', err);
    el.innerHTML = '<p class="empty-state">Error loading submissions.</p>';
  }
}

// ===== Reusable Search Utilities =====
function normalizeText(s){ return (s||'').toString().toLowerCase(); }
function queryMatches(el, q){
  const t = normalizeText(el.textContent);
  const ds = normalizeText(el.getAttribute && el.getAttribute('data-search'));
  const parts = q.split(/\s+/).filter(Boolean);
  return parts.every(p => t.includes(p) || ds.includes(p));
}

function initListFilter({ inputId, buttonId, selectors }){
  const input = document.getElementById(inputId);
  const btn = buttonId ? document.getElementById(buttonId) : null;
  if(!input) return;
  function applyFilter(){
    const q = normalizeText(input.value.trim());
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = q ? (queryMatches(el, q) ? '' : 'none') : '';
      });
    });
  }
  input.addEventListener('input', applyFilter);
  btn && btn.addEventListener('click', applyFilter);
}

function initGuideSearch({ inputId, buttonId, containerId }){
  const input = document.getElementById(inputId);
  const btn = buttonId ? document.getElementById(buttonId) : null;
  const container = document.getElementById(containerId);
  if(!input || !container) return;
  function clear(){ container.querySelectorAll('.search-hit').forEach(el => el.classList.remove('search-hit')); }
  function search(){
    const q = normalizeText(input.value.trim());
    clear();
    if(!q) return;
    const nodes = container.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li');
    let first = null;
    nodes.forEach(n => {
      if(n.textContent.toLowerCase().includes(q)){
        n.classList.add('search-hit');
        if(!first) first = n;
      }
    });
    if(first){ first.scrollIntoView({behavior:'smooth', block:'center'}); }
  }
  input.addEventListener('input', search);
  btn && btn.addEventListener('click', search);
}

// Page initializers
document.addEventListener('DOMContentLoaded', () => {
  initListFilter({ inputId: 'dashSearch', buttonId: 'dashSearchBtn', selectors: ['.lesson-card', '#submissionsOutput table tbody tr', '#mySubmissions .submission-row'] });
  initListFilter({ inputId: 'homeSearch', buttonId: 'homeSearchBtn', selectors: ['.card', 'section', '.welcome-banner'] });
  initGuideSearch({ inputId: 'adminGuideSearch', buttonId: 'adminGuideSearchBtn', containerId: 'guideContent' });
});

// ===== Unified Term Index (links + metadata) =====
function slugify(text){
  return text.toString().trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

function addToIndex(index, key, target){
  const k = normalizeText(key);
  if(!k) return;
  if(!index[k]) index[k] = [];
  index[k].push(target);
}

async function buildTermIndex(){
  const index = {};
  // Nav links
  document.querySelectorAll('.navbar a').forEach(a => {
    addToIndex(index, a.textContent, { label: a.textContent.trim(), href: a.getAttribute('href'), type: 'page' });
  });
  // Weeks (1-12)
  for(let w=1; w<=12; w++){
    addToIndex(index, `week ${w}`, { label: `Week ${w}`, href: `#week-${w}`, type: 'week' });
    addToIndex(index, `w${w}`, { label: `W${w}`, href: `#week-${w}`, type: 'week' });
  }
  // Lesson cards (title + week badge)
  document.querySelectorAll('.lesson-card').forEach(card => {
    const title = card.querySelector('h3')?.textContent?.trim();
    const week = card.querySelector('.week-badge')?.textContent?.trim();
    const id = card.id || `lesson-${slugify(title||'')}`;
    if(!card.id) card.id = id;
    if(title) addToIndex(index, title, { label: title, href: `#${id}`, type: 'lesson' });
    if(week) addToIndex(index, week, { label: week, href: `#${id}`, type: 'week' });
    const ds = card.getAttribute('data-search');
    if(ds) addToIndex(index, ds, { label: ds, href: `#${id}`, type: 'lesson' });
  });
  // Guide headings (after guide render)
  const guide = document.querySelector('#guideContent');
  if(guide){
    guide.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
      const text = h.textContent?.trim();
      if(!text) return;
      const id = h.id || slugify(text);
      if(!h.id) h.id = id;
      addToIndex(index, text, { label: text, href: `#${id}`, type: 'guide' });
    });
  }
  // Admin: users (if accessible)
  try{
    if(document.location.pathname.endsWith('/admin.html')){
      const res = await fetch('/api/users');
      if(res.ok){
        const resp = await res.json();
        const users = Array.isArray(resp) ? resp : (resp && resp.data && Array.isArray(resp.data) ? resp.data : []);
        users.forEach(u => {
          const uname = u.username || u.name || '';
          const email = u.email || '';
          const role = u.role || '';
          if(uname) addToIndex(index, uname, { label: uname, href: '#users', type: 'user' });
          if(email) addToIndex(index, email, { label: email, href: '#users', type: 'user' });
          if(role) addToIndex(index, role, { label: role, href: '#users', type: 'user' });
        });
      }
    }
  } catch(_){}

  window.argSearchIndex = index;
}

function findFirstIndexHit(query){
  const index = window.argSearchIndex || {};
  const q = normalizeText(query);
  if(!q) return null;
  if(index[q] && index[q][0]) return index[q][0];
  const keys = Object.keys(index);
  for(const k of keys){
    if(k.includes(q)) return index[k][0];
  }
  return null;
}

function enableSearchNavigate(inputId){
  const input = document.getElementById(inputId);
  if(!input) return;
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
      const hit = findFirstIndexHit(input.value);
      if(hit){
        if(hit.href?.startsWith('#')){
          const el = document.querySelector(hit.href);
          el && el.scrollIntoView({behavior:'smooth', block:'center'});
        } else {
          window.location.href = hit.href;
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  buildTermIndex().then(() => {
    enableSearchNavigate('homeSearch');
    enableSearchNavigate('dashSearch');
    enableSearchNavigate('adminGuideSearch');
    enableSearchNavigate('globalSearch');
  });
});
// ===== End Unified Term Index =====

// ===== Search Diagnostics =====
function getIndexDiagnostics(){
  const idx = window.argSearchIndex || {};
  const keys = Object.keys(idx);
  const totalKeys = keys.length;
  let totalTargets = 0;
  const typeCounts = {};
  keys.forEach(k => {
    const arr = idx[k] || [];
    totalTargets += arr.length;
    arr.forEach(t => { const ty = t.type || 'unknown'; typeCounts[ty] = (typeCounts[ty]||0)+1; });
  });
  const sample = keys.slice(0, 15).map(k => ({ key:k, first: (idx[k] && idx[k][0]) || null }));
  return { totalKeys, totalTargets, typeCounts, sample };
}

function renderSearchDiagnostics(targetId='searchDiagnostics'){
  const el = document.getElementById(targetId);
  if(!el) return;
  const d = getIndexDiagnostics();
  const types = Object.keys(d.typeCounts).map(t => `${t}: ${d.typeCounts[t]}`).join(', ');
  const sampleHtml = d.sample.map(s => `
    <li><code>${s.key}</code> → <span>${s.first ? (s.first.label||'') : '(none)'}</span> [${s.first ? (s.first.type||'') : ''}]</li>
  `).join('');
  el.innerHTML = `
    <div class="diag-box">
      <h4>Search Diagnostics</h4>
      <p><strong>Total keys:</strong> ${d.totalKeys}</p>
      <p><strong>Total targets:</strong> ${d.totalTargets}</p>
      <p><strong>Types:</strong> ${types || '(none)'}</p>
      <details>
        <summary>Sample keys</summary>
        <ul>${sampleHtml}</ul>
      </details>
    </div>
  `;
}
window.renderSearchDiagnostics = renderSearchDiagnostics;
// ===== End Search Diagnostics =====

// ===== Search Overlay (Cmd/Ctrl+K) =====
(function(){
  function createOverlay(){
    if(document.getElementById('arg-search-overlay')) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'search-overlay-backdrop';
    backdrop.id = 'arg-search-backdrop';
    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.id = 'arg-search-overlay';
    overlay.innerHTML = `
      <header>
        <span>Search</span>
        <input type="search" id="argSearchInput" placeholder="Type to search terms, pages, weeks…" />
        <button id="argSearchClose">Close</button>
      </header>
      <div class="results" id="argSearchResults"></div>
    `;
    document.body.appendChild(backdrop);
    document.body.appendChild(overlay);
    backdrop.addEventListener('click', hide);
    overlay.querySelector('#argSearchClose').addEventListener('click', hide);
    overlay.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hide(); });

    const input = overlay.querySelector('#argSearchInput');
    const results = overlay.querySelector('#argSearchResults');
    function renderResults(items){
      results.innerHTML = items.slice(0, 10).map((it, i) => `
        <div class="result-item${i===0?' active':''}" data-href="${it.href}" title="${it.label}">
          <strong>${it.label}</strong>
          <span class="right">${it.type||''}</span>
        </div>
      `).join('');
      results.querySelectorAll('.result-item').forEach(el => {
        el.addEventListener('click', ()=>navigate({ href: el.getAttribute('data-href') }));
      });
    }
    function getMatches(q){
      const index = window.argSearchIndex || {};
      const qq = (q||'').toLowerCase();
      if(!qq) return [];
      const items = [];
      for(const k of Object.keys(index)){
        if(k.includes(qq)) items.push(...index[k]);
      }
      return items;
    }
    let activeIdx = 0;
    input.addEventListener('input', ()=>{ activeIdx=0; renderResults(getMatches(input.value)); });
    overlay.addEventListener('keydown', (e)=>{
      const list = Array.from(results.querySelectorAll('.result-item'));
      if(e.key==='ArrowDown'){ e.preventDefault(); activeIdx = Math.min(list.length-1, activeIdx+1); }
      if(e.key==='ArrowUp'){ e.preventDefault(); activeIdx = Math.max(0, activeIdx-1); }
      list.forEach((el,i)=> el.classList.toggle('active', i===activeIdx));
      if(e.key==='Enter' && list[activeIdx]){
        const href = list[activeIdx].getAttribute('data-href');
        navigate({ href });
      }
    });

    function navigate(hit){
      if(!hit) return;
      hide();
      if(hit.href?.startsWith('#')){
        const el = document.querySelector(hit.href);
        el && el.scrollIntoView({behavior:'smooth', block:'center'});
      } else {
        window.location.href = hit.href;
      }
    }

    function show(){
      backdrop.style.display = 'block';
      overlay.style.display = 'block';
      input.value = '';
      results.innerHTML = '';
      input.focus();
    }
    function hide(){
      backdrop.style.display = 'none';
      overlay.style.display = 'none';
    }
    window.argShowSearchOverlay = show;
    window.argHideSearchOverlay = hide;
  }

  function addNavbarIcon(){
    const nav = document.querySelector('.navbar');
    if(!nav || nav.querySelector('.search-icon')) return;
    const btn = document.createElement('button');
    btn.className = 'search-icon';
    btn.title = 'Search (Ctrl+K)';
    btn.textContent = '🔍';
    btn.addEventListener('click', ()=>{
      if(typeof window.argShowSearchOverlay === 'function') window.argShowSearchOverlay();
    });
    nav.appendChild(btn);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    createOverlay();
    addNavbarIcon();
    document.addEventListener('keydown', (e)=>{
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const trigger = (isMac && e.metaKey && e.key.toLowerCase()==='k') || (!isMac && e.ctrlKey && e.key.toLowerCase()==='k');
      if(trigger){ e.preventDefault(); if(typeof window.argShowSearchOverlay==='function') window.argShowSearchOverlay(); }
      // Diagnostics shortcut: Ctrl+Shift+K (Cmd+Shift+K on Mac)
      const diagTrigger = (isMac && e.metaKey && e.shiftKey && e.key.toLowerCase()==='k') || (!isMac && e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='k');
      if(diagTrigger){
        e.preventDefault();
        const panel = document.getElementById('searchDiagnostics');
        if(panel && typeof window.renderSearchDiagnostics==='function'){
          window.renderSearchDiagnostics('searchDiagnostics');
        } else {
          // Fallback: log to console
          const d = getIndexDiagnostics();
          console.table(d.sample.map(s=>({ key:s.key, label:s.first?.label||'', type:s.first?.type||'' })));
          console.log('Search diagnostics:', d);
        }
      }
    });
  });
})();
// ===== End Search Overlay =====