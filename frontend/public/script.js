// script.js - shared frontend logic

// Call backend route and render response
async function callRoute(path, method = 'GET', body = null) {
  const options = { method };
  if (body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(path, options);
    const data = await res.json();
    renderTable(data);
  } catch (err) {
    const output = document.getElementById('output');
    if (output) output.textContent = 'Error: ' + err.message;
    console.error(err);
  }
}

// Render JSON into a table
function renderTable(data) {
  const output = document.getElementById('output');
  if (!output) return;
  output.innerHTML = buildTable(data);
}

// Build table recursively
function buildTable(value) {
  if (Array.isArray(value)) {
    // If array of objects with same keys, use headers
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      const keys = Object.keys(value[0]);
      let html = '<table><tr>' + keys.map(k => `<th>${k}</th>`).join('') + '</tr>';
      value.forEach(item => {
        html += '<tr>' + keys.map(k => `<td>${formatCell(item[k])}</td>`).join('') + '</tr>';
      });
      html += '</table>';
      return html;
    } else {
      // Simple array
      let html = '<table><tr><th>Index</th><th>Value</th></tr>';
      value.forEach((item, i) => {
        html += `<tr><td>${i}</td><td>${formatCell(item)}</td></tr>`;
      });
      html += '</table>';
      return html;
    }
  } else if (typeof value === 'object' && value !== null) {
    let html = '<table><tr><th>Field</th><th>Result</th></tr>';
    for (const key in value) {
      html += `<tr><td>${key}</td><td>${formatCell(value[key])}</td></tr>`;
    }
    html += '</table>';
    return html;
  } else {
    return String(value);
  }
}

// Format cell content
function formatCell(val) {
  return (typeof val === 'object' && val !== null) ? buildTable(val) : String(val);
}