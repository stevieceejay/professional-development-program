const http = require('http');

const PORT = process.env.TARGET_PORT || process.env.PORT || 8080;
const HOST = 'localhost';
const CI_USER = process.env.CI_USERNAME || 'e2e_ci_user';
const CI_PASS = process.env.CI_PASSWORD;
if (!CI_PASS) {
  console.error('CI_PASSWORD not set. Set CI_PASSWORD before running this focused test.');
  process.exit(2);
}

function request(method, path, body, cookies) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: {
        'Accept': 'application/json',
      },
    };
    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cookies) {
      opts.headers['Cookie'] = cookies.join('; ');
    }

    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        const setCookie = res.headers['set-cookie'] || [];
        let json = null;
        try { json = JSON.parse(text); } catch (e) { json = text; }
        resolve({ statusCode: res.statusCode, body: json, setCookie });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async function(){
  console.log('Target server:', HOST + ':' + PORT);

  // Sign in
  console.log('Signing in as', CI_USER);
  const signin = await request('POST', '/api/signin', { username: CI_USER, password: CI_PASS });
  console.log('Signin status:', signin.statusCode);
  console.log('Signin body:', signin.body);
  if (!signin.setCookie || signin.setCookie.length === 0) {
    console.error('No set-cookie received; aborting');
    process.exit(2);
  }
  // take session cookie(s)
  const cookies = signin.setCookie.map(c => c.split(';')[0]);

  // Verify session on server
  const who = await request('GET', '/api/users/me', null, cookies);
  console.log('GET /api/users/me status:', who.statusCode);
  console.log('GET /api/users/me body:', who.body);

  // Submit a test submission
  const submissionPayload = { lesson_id: 1, content: 'E2E focus test at ' + new Date().toISOString() };
  console.log('Posting submission:', submissionPayload);
  const post = await request('POST', '/api/submissions', submissionPayload, cookies);
  console.log('POST /api/submissions status:', post.statusCode);
  console.log('POST body:', post.body);

  // Fetch my submissions
  const getMy = await request('GET', '/api/submissions/my', null, cookies);
  console.log('GET /api/submissions/my status:', getMy.statusCode);
  console.log('GET body:', getMy.body);

  // Exit code based on success
  if (post.statusCode === 200 && getMy.statusCode === 200) process.exit(0);
  process.exit(1);
})();
