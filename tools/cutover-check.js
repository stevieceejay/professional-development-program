const { spawnSync } = require('child_process');

function runStep(label, args) {
  console.log(`\n==> ${label}`);
  const npmExecPath = process.env.npm_execpath;
  const result = npmExecPath
    ? spawnSync(process.execPath, [npmExecPath, ...args], { stdio: 'inherit', shell: false })
    : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { stdio: 'inherit', shell: false });
  const code = typeof result.status === 'number' ? result.status : 1;
  return code;
}

console.log('ARG Cutover Check');
console.log('================');

const preflightCode = runStep('Preflight (build + quick smoke)', ['run', 'preflight:prod']);
if (preflightCode !== 0) {
  console.error('\n✖ cutover:check failed at preflight');
  process.exit(preflightCode);
}

const authCode = runStep('Auth smoke', ['run', 'smoke:auth']);
if (authCode !== 0) {
  console.error('\n✖ cutover:check failed at auth smoke');
  process.exit(authCode);
}

const auditCode = runStep('Production risk audit', ['run', 'risk:audit:prod']);
if (auditCode !== 0) {
  const accepted = process.env.RISK_ACCEPTANCE_ACTIVE === '1';
  if (!accepted) {
    console.error('\n✖ cutover:check failed at risk audit (set RISK_ACCEPTANCE_ACTIVE=1 only when RR acceptance is active and valid)');
    process.exit(auditCode);
  }
  console.warn('\n⚠ risk audit failed but RISK_ACCEPTANCE_ACTIVE=1 is set; continuing under approved residual risk process');
}

console.log('\n✔ cutover:check completed');
