const http = require('http');

// Try multiple ports in case the server started on a different port
const TARGET = process.env.TARGET_PORT ? Number(process.env.TARGET_PORT) : null;
const PORTS = TARGET ? [TARGET] : Array.from({ length: 11 }, (_, i) => 8080 + i);
let activePort = null;

function reqToPort(port, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers
    };
    const r = http.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => b += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: b }));
    });
    r.on('error', (err) => reject(err));
    if (body) r.write(body);
    r.end();
  });
}

async function req(method, path, headers = {}, body = null) {
  if (activePort) return reqToPort(activePort, method, path, headers, body);
  for (const port of PORTS) {
    try {
      const res = await reqToPort(port, method, path, headers, body);
      activePort = port;
      return res;
    } catch (e) {
      // try next port
    }
  }
  throw new Error('No server responded on ports ' + PORTS.join(', '));
}

async function waitForLessons(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await req('GET', '/api/lessons');
      if (r.statusCode === 200) {
        try { return JSON.parse(r.body); } catch (e) { return r.body; }
      }
    } catch (e) {
      // ignore and retry
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}

// Try to detect the most appropriate active port by probing /api/submissions for a non-404 response
async function detectActivePort() {
  for (const port of PORTS) {
    try {
      const r = await reqToPort(port, 'GET', '/api/submissions');
      // prefer ports that respond with anything other than 404
      if (r && r.statusCode && r.statusCode !== 404) {
        activePort = port;
        return activePort;
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

(async function main(){
  try {
    console.log('Waiting for server to be ready...');
    const lessons = await waitForLessons(30000);
    if (!lessons) {
      console.error('Server did not respond with lessons within timeout');
      process.exit(2);
    }

    let lessonId = 1;
    if (Array.isArray(lessons) && lessons.length) lessonId = lessons[0].id || 1;
    if (lessons && lessons.data && Array.isArray(lessons.data) && lessons.data.length) lessonId = lessons.data[0].id || lessonId;

    const username = 'e2e_user_' + Date.now();
    const email = username + '@example.test';
    const password = 'Password123!';

    // Try signing in with a known CI/test account first to avoid signup rate limits
    let cookieHeader = '';
    try {
      const ciSigninBody = JSON.stringify({ username: 'e2e_ci_user', password: 'Password123!' });
      const ciSigninRes = await req('POST', '/api/signin', { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(ciSigninBody) }, ciSigninBody);
      if (ciSigninRes && ciSigninRes.statusCode === 200 && ciSigninRes.headers && ciSigninRes.headers['set-cookie']) {
        cookieHeader = ciSigninRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        console.log('Signed in using CI test account');
      } else {
        console.log('CI test signin not available; proceeding to signup flow');
      }
    } catch (e) {
      console.log('CI signin attempt error, proceeding to signup:', e.message || e);
    }

    if (!cookieHeader) {
      console.log('Signing up user:', username);
      const signupBody = JSON.stringify({ username, email, password, confirmPassword: password });
      const signupRes = await req('POST', '/api/signup', { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(signupBody) }, signupBody);
      console.log('Signup status:', signupRes.statusCode);
      console.log('Signup body:', signupRes.body);

      if (signupRes.headers && signupRes.headers['set-cookie']) {
        const cookies = signupRes.headers['set-cookie'].map(c => c.split(';')[0]);
        cookieHeader = cookies.join('; ');
      }
    }

    // If signup was attempted and failed, or we still don't have a cookie, try signing in with same creds
    if ((typeof signupRes !== 'undefined' && signupRes.statusCode >= 400) || !cookieHeader) {
      console.log('Signup failed or no session cookie; attempting signin fallback...');
      try {
        const signinBody = JSON.stringify({ username, password });
        const signinRes = await req('POST', '/api/signin', { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(signinBody) }, signinBody);
        console.log('Signin status:', signinRes.statusCode);
        console.log('Signin body:', signinRes.body);
        if (signinRes.headers && signinRes.headers['set-cookie']) {
          const cookies = signinRes.headers['set-cookie'].map(c => c.split(';')[0]);
          cookieHeader = cookies.join('; ');
        }
        if (!cookieHeader && signinRes.statusCode >= 400) {
          console.error('Signin fallback failed (will try CI fallback)');
        }
      } catch (e) {
        console.error('Signin fallback error (will try CI fallback):', e);
      }
      // If signin fallback failed because account doesn't exist or wrong credentials,
      // try a known CI/test account if present in repo (ci_test_user3 / Password123!)
      if (!cookieHeader) {
        console.log('Attempting known CI test account signin as last resort');
        try {
          const ciBody = JSON.stringify({ username: 'ci_test_user3', password: 'Password123!' });
          const ciRes = await req('POST', '/api/signin', { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(ciBody) }, ciBody);
          console.log('CI signin status:', ciRes.statusCode);
          if (ciRes.headers && ciRes.headers['set-cookie']) {
            const cookies = ciRes.headers['set-cookie'].map(c => c.split(';')[0]);
            cookieHeader = cookies.join('; ');
          }
        } catch (e) {
          console.error('CI signin attempt error:', e);
        }
      }
    }

    // Small delay to allow session to be fully established
    await new Promise(r => setTimeout(r, 250));

    // Prefer a port that actually exposes the submissions API (avoid stale/other servers)
    const detected = await detectActivePort();
    if (detected) console.log('Detected submissions-capable port:', detected);
    console.log('Using active port:', activePort, 'Cookie present:', !!cookieHeader);

    console.log('Submitting assignment for lesson', lessonId);
    const content = 'E2E test submission content: ' + new Date().toISOString();
    const submitBody = JSON.stringify({ lesson_id: lessonId, content });
    // Attempt submit with a few retries to avoid transient errors
    let submitRes = null;
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        submitRes = await req('POST', `/api/submissions`, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(submitBody), 'Cookie': cookieHeader }, submitBody);
        console.log('Submit attempt', attempts, 'status:', submitRes.statusCode);
        console.log('Submit body snippet:', submitRes.body ? String(submitRes.body).slice(0,200) : '');
        if (submitRes.statusCode < 400) break;
      } catch (e) {
        console.error('Submit attempt error:', e);
      }
      await new Promise(r => setTimeout(r, 300));
    }
    if (!submitRes || submitRes.statusCode >= 400) {
      console.error('Submission failed');
      process.exit(4);
    }

    console.log('Fetching submissions for current user to verify');
    const checkRes = await req('GET', `/api/submissions/my`, { 'Cookie': cookieHeader });
    console.log('Check status:', checkRes.statusCode);
    console.log('Check body snippet:', checkRes.body ? checkRes.body.slice(0,300) : '');
    if (checkRes.statusCode === 200) {
      let arr = [];
      try { arr = JSON.parse(checkRes.body); } catch (e) { arr = []; }
      const found = Array.isArray(arr) && arr.some(s => Number(s.lesson_id) === Number(lessonId));
      if (found) { console.log('E2E test succeeded'); process.exit(0); }
    }
    console.error('E2E verification failed');
    process.exit(5);
  } catch (err) {
    console.error('E2E script error:', err);
    process.exit(10);
  }
})();
