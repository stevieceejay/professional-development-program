const bcrypt = require('bcrypt');

(async () => {
  const adminHash = await bcrypt.hash('adminpass', 10);
  const userHash = await bcrypt.hash('userpass', 10);

  console.log('Admin hash:', adminHash);
  console.log('User hash:', userHash);
})();
