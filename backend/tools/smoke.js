#!/usr/bin/env node
/*
Simple smoke test: probes the running server across fallback ports,
checks key endpoints, and returns non-zero exit code if failures.
Usage:
  node backend/tools/smoke.js          # full
  node backend/tools/smoke.js --quick  # lessons + assignments only
*/

// Stable Windows-friendly harness using only http.request
const { URLSearchParams } = require('url');
const http = require('http');

const EXPLICIT_PORT = (() => {
  const argPort = process.argv.find(a => a.startsWith('--port='));
  return argPort ? Number(argPort.split('=')[1]) : null;
})();
const DEFAULT_PORT = EXPLICIT_PORT || (process.env.PORT ? Number(process.env.PORT) : 4000);
const DEFAULT_HOST = 'localhost';
const QUICK = process.argv.includes('--quick');
const AUTH = process.argv.includes('--auth');

function requestJSON(port, path, opts = {}) {
  return new Promise((resolve, reject) => {
    const host = DEFAULT_HOST;
    const method = opts.method || 'GET';
    const headers = {
      'Content-Type': opts.form ? 'application/x-www-form-urlencoded' : 'application/json',
      'Connection': 'close',
      // When running auth smoke against a production server (trust proxy enabled),
      // simulate the Nginx-added header so secure session cookies are issued over HTTP.
      ...(AUTH ? { 'X-Forwarded-Proto': 'https' } : {}),
      ...(opts.headers || {}),
    };
    const req = http.request({ hostname: host, port, path, method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 300) {
          const allow = opts.allowStatus;
          const allowed = Array.isArray(allow) && allow.includes(res.statusCode);
          if (!allowed) {
            return reject(new Error(`HTTP ${res.statusCode} for ${path} on ${port}: ${data}`));
          }
        }
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, json, headers: res.headers });
        } catch (e) {
          resolve({ statusCode: res.statusCode, text: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (opts.body) {
      if (opts.form) {
        const body = new URLSearchParams(opts.body).toString();
        req.write(body);
      } else {
        req.write(JSON.stringify(opts.body));
      }
    }
    req.end();
  });
}

async function findActivePort() {
  // Simplified detection: trust explicit or default port and probe minimal endpoints
  try {
    const health = await requestJSON(DEFAULT_PORT, '/api/health');
    if (health.statusCode === 200) return DEFAULT_PORT;
  } catch (_) { /* ignore */ }
  try {
    const res = await requestJSON(DEFAULT_PORT, '/api/lessons');
    if (res.statusCode === 200) return DEFAULT_PORT;
  } catch (_) { /* ignore */ }
  return null;
}

async function run() {
  let port = await findActivePort();
  if (!port) port = DEFAULT_PORT;
  if (!port) {
    console.error('Smoke: No active server found on expected port');
    process.exit(1);
  }

  console.log(`Smoke: Using server at http://${DEFAULT_HOST}:${port}`);

  const failures = [];
  function expect(cond, label) {
    if (!cond) failures.push(label);
  }

  try {
    const lessons = await requestJSON(port, '/api/lessons');
    const lessonCount = Array.isArray(lessons.json?.data) ? lessons.json.data.length : Array.isArray(lessons.json) ? lessons.json.length : 0;
    expect(lessonCount >= 12, 'lessons >= 12');
    console.log(`- Lessons OK (${lessonCount} found)`);
  } catch (e) {
    failures.push(`lessons: ${e.message}`);
  }

  try {
    const assignments = await requestJSON(port, '/api/assignments');
    const assignmentCount = Array.isArray(assignments.json?.data) ? assignments.json.data.length : Array.isArray(assignments.json) ? assignments.json.length : 0;
    expect(assignmentCount >= 12, 'assignments >= 12');
    console.log(`- Assignments OK (${assignmentCount} found)`);
  } catch (e) {
    failures.push(`assignments: ${e.message}`);
  }

  if (!QUICK) {
    // Probe frontend index.html and dashboard.html
    try {
      const index = await requestJSON(port, '/index.html');
      expect(index.statusCode === 200, 'index.html 200');
      console.log('- Frontend index OK');
    } catch (e) {
      failures.push(`index.html: ${e.message}`);
    }
    try {
      const dash = await requestJSON(port, '/dashboard.html');
      expect(dash.statusCode === 200, 'dashboard.html 200');
      console.log('- Frontend dashboard OK');
    } catch (e) {
      failures.push(`dashboard.html: ${e.message}`);
    }

    // Probe submissions (will require auth; expect 401 or 200, but not 404)
    if (!AUTH) {
      try {
        const me = await requestJSON(port, '/api/submissions/my', { allowStatus: [401, 403] });
        expect(me.statusCode === 200 || me.statusCode === 401 || me.statusCode === 403, 'submissions/my 200/401/403');
        console.log(`- Submissions/my OK (status ${me.statusCode})`);
      } catch (e) {
        failures.push(`submissions/my: ${e.message}`);
      }
    }
  }

  // Authenticated path: create temp user, sign in, verify session and submissions
  if (AUTH) {
    try {
      const uname = `smoke_${Date.now()}`;
      const email = `${uname}@example.test`;
      const password = 'SmokeTest123!';
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));

      // Signup (auto-login sets session)
      const signup = await requestJSON(port, '/api/signup', {
        method: 'POST',
        body: { username: uname, email, password, confirmPassword: password },
      });
      expect(signup.json?.status === 'success', 'signup success');
      console.log('- Signup OK');
      if (!signup.headers || !signup.headers['set-cookie']) {
        console.log('  (Note) No Set-Cookie header detected on signup response');
      }

      // Capture session cookie from signup response and reuse
      const setCookie = signup.headers && signup.headers['set-cookie'];
      const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      const sessionHeaders = cookie ? { Cookie: cookie } : {};

      // Small delay before using new session cookie to avoid socket race
      await sleep(500);

      // Verify session (with one retry on transient socket errors)
      let session;
      try {
        session = await requestJSON(port, '/api/session', { headers: sessionHeaders });
      } catch (e) {
        if ((e.message || '').includes('ECONNRESET')) {
          await sleep(750);
          session = await requestJSON(port, '/api/session', { headers: sessionHeaders });
        } else {
          throw e;
        }
      }
      expect(session.json?.status === 'success', 'session status success');
      console.log('- Session OK');

      // Check submissions/me as authenticated (retry once on socket error)
      let meAuth;
      try {
        meAuth = await requestJSON(port, '/api/submissions/my', { headers: sessionHeaders });
      } catch (e) {
        if ((e.message || '').includes('ECONNRESET')) {
          await sleep(750);
          meAuth = await requestJSON(port, '/api/submissions/my', { headers: sessionHeaders });
        } else {
          throw e;
        }
      }
      expect(meAuth.statusCode === 200 && (Array.isArray(meAuth.json) || meAuth.json?.status === 'success'), 'submissions/my 200 success');
      console.log(`- Submissions/my OK (items ${Array.isArray(meAuth.json) ? meAuth.json.length : Array.isArray(meAuth.json?.data) ? meAuth.json.data.length : 0})`);

    } catch (e) {
      failures.push(`auth-mode: ${e.message}`);
    }
  }

  if (failures.length) {
    console.error('Smoke: Failures detected:\n - ' + failures.join('\n - '));
    process.exit(1);
  }

  console.log('Smoke: All checks passed');
  process.exit(0);
}

run();
