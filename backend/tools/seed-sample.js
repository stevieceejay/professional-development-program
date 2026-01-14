const http = require('http');

function requestJSON({ hostname = 'localhost', port = 4000, path, method = 'GET', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path, method, headers, agent: new http.Agent({ keepAlive: false }) }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const ct = (res.headers['content-type'] || '').toLowerCase();
        let parsed = data;
        if (ct.includes('application/json')) {
          try { parsed = JSON.parse(data); } catch {}
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const portArg = process.argv.find(a => a.startsWith('--port='));
  const port = portArg ? Number(portArg.split('=')[1]) : (Number(process.env.PORT) || 4000);
  const host = 'localhost';

  // 1) Fetch assignments and pick the first
  const aResp = await requestJSON({ hostname: host, port, path: '/api/assignments', method: 'GET' });
  if (aResp.status !== 200 || !aResp.body || aResp.body.status !== 'success' || !Array.isArray(aResp.body.data) || aResp.body.data.length === 0) {
    console.error('No assignments available to seed against.');
    console.error('Response:', aResp.status, aResp.body);
    process.exitCode = 1;
    return;
  }
  const assignmentId = aResp.body.data[0].id;

  // 2) Signup a throwaway user to get a session cookie
  const uname = 'seed_' + Date.now();
  const signupBody = { username: uname, email: `${uname}@example.test`, password: 'Welcome123', confirmPassword: 'Welcome123' };
  const sResp = await requestJSON({ hostname: host, port, path: '/api/signup', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: signupBody });
  if (sResp.status !== 200 || !sResp.body || sResp.body.status !== 'success') {
    console.error('Signup failed:', sResp.status, sResp.body);
    process.exitCode = 1;
    return;
  }
  const setCookie = sResp.headers['set-cookie'] && sResp.headers['set-cookie'][0];
  const cookiePair = setCookie ? setCookie.split(';')[0] : null;
  if (!cookiePair) {
    console.error('No Set-Cookie returned on signup.');
    process.exitCode = 1;
    return;
  }

  // 3) Create a sample submission for the first assignment
  const subBody = { assignment_id: assignmentId, content: 'Sample submission seeded by script.' };
  const subResp = await requestJSON({ hostname: host, port, path: '/api/submissions', method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': cookiePair }, body: subBody });
  if (subResp.status !== 200 || !subResp.body || subResp.body.status !== 'success') {
    console.error('Submission failed:', subResp.status, subResp.body);
    process.exitCode = 1;
    return;
  }

  console.log('Seed complete:', { assignment_id: assignmentId, submission_id: subResp.body.id, username: uname });
}

main().catch(e => { console.error('Seed error:', e && e.message || e); process.exitCode = 1; });
