# DigitalOcean Deployment Guide

Complete step-by-step guide to deploy your Professional Development Project platform on DigitalOcean.

---

## Step 1: Create DigitalOcean Account

### Get $200 Free Credit (60 Days)

1. **Search for promo codes**: Google "DigitalOcean $200 credit 2026" or "DigitalOcean promo code"
   - Common sources: GitHub Student Pack, cloud provider comparison sites
   - Alternative: Standard $100/60-day credit for new users

2. **Sign up**: Go to https://www.digitalocean.com/
   - Click "Sign Up"
   - Use email: stephenjohnson118120@gmail.com
   - Create password
   - Verify email

3. **Add payment method**:
   - Credit/debit card OR PayPal
   - **No charges** until you exceed free credit
   - Card verification charge: $1 (refunded immediately)

---

## Step 2: Create a Droplet (Virtual Server)

### Recommended Configuration

1. **Go to**: Create → Droplets
2. **Choose Region**: 
   - Select closest to your users (e.g., New York, San Francisco, Toronto)
3. **Choose Image**: 
   - **Ubuntu 22.04 LTS** (recommended)
4. **Choose Size**:
   - **Basic Plan**: $12/month
   - **CPU**: Regular (Disk: SSD)
   - **2 GB RAM / 1 vCPU / 50 GB SSD / 2 TB transfer**
5. **Choose Authentication**:
   - **SSH Keys** (recommended) OR
   - **Password** (easier for beginners)
   
   **For Password**: 
   - Create strong password (save it!)
   
   **For SSH Key** (more secure):
   - On your Windows machine, run in PowerShell:
     ```powershell
     ssh-keygen -t ed25519 -C "stephenjohnson118120@gmail.com"
     # Press Enter 3 times (default location, no passphrase)
     
     # Copy public key
     Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | clip
     ```
   - Paste into DigitalOcean "SSH Key" field
   - Name it: "Windows-PC"

6. **Finalize**:
   - Hostname: `arg-platform` (or your choice)
   - Tags: `production`, `nodejs`
   - Click **"Create Droplet"**

7. **Wait 1-2 minutes** for droplet creation
8. **Copy the IP address** (e.g., 167.99.123.45)

---

## Step 3: Connect to Your Server

### Windows PowerShell Connection

```powershell
# Replace with YOUR droplet IP
ssh root@167.99.123.45
```

**First connection**:
- Type `yes` when asked "Are you sure you want to continue connecting?"
- Enter password if you chose password authentication

### Initial Server Setup

```bash
# Update system packages
apt update && apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (web server)
apt install -y nginx

# Install Certbot (SSL certificates)
apt install -y certbot python3-certbot-nginx

# Create app directory
mkdir -p /var/www/arg-platform
cd /var/www/arg-platform
```

---

## Step 4: Upload Your Application

### Option A: Using Git (Recommended)

```bash
# Install Git if not installed
apt install -y git

# Clone your repository (if you have one)
# git clone https://github.com/yourusername/your-repo.git .

# For now, we'll upload files manually (see Option B)
```

### Option B: Upload Files from Windows

**On your Windows machine** (new PowerShell window):

```powershell
# Navigate to your project
cd C:\Users\NewAdmin\Documents\ARG-professional-developement

# Create archive (exclude node_modules and database)
$exclude = @('node_modules', 'backend\data\*.db', 'backend\uploads\*', '.git')
Compress-Archive -Path * -DestinationPath deploy.zip -Force

# Upload to server (replace IP address)
scp deploy.zip root@167.99.123.45:/var/www/arg-platform/

# Connect back to server
ssh root@167.99.123.45
```

**On the server**:

```bash
cd /var/www/arg-platform

# Install unzip
apt install -y unzip

# Extract files
unzip deploy.zip
rm deploy.zip

# Install dependencies
npm install --production

# Create necessary directories
mkdir -p backend/data
mkdir -p backend/uploads
mkdir -p frontend/public/videos
```

---

## Step 5: Configure Environment

### Create Production Environment File

```bash
cd /var/www/arg-platform/backend

# Create .env file
nano .env
```

**Paste this configuration** (press Ctrl+Shift+V):

```env
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Session Secret (CHANGE THIS!)
SESSION_SECRET=your-super-secure-random-secret-at-least-32-characters-long-12345678

# Database
DB_PATH=./data/project.db

# Email Configuration (for password resets)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=stephenjohnson118120@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=stephenjohnson118120@gmail.com

# Application
APP_NAME=Professional Development Project platform
APP_URL=http://your-domain.com
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

### Generate Secure Session Secret

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output and update SESSION_SECRET in .env
nano .env
# Paste the generated secret, save and exit
```

### Initialize Database

```bash
cd /var/www/arg-platform

# Run database setup if you have seed script
# node backend/tools/seed-sample.js

# Or restore from backup
# sqlite3 backend/data/project.db < backup.sql
```

---

## Step 6: Configure Firewall

```bash
# Allow SSH (port 22)
ufw allow 22/tcp

# Allow HTTP (port 80)
ufw allow 80/tcp

# Allow HTTPS (port 443)
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## Step 7: Start Application with PM2

```bash
cd /var/www/arg-platform

# Start the app
pm2 start backend/server.js --name "arg-platform"

# Set up auto-restart on server reboot
pm2 startup systemd
# Copy and run the command it outputs

pm2 save

# Check status
pm2 status
pm2 logs arg-platform --lines 50
```

**Test the app**:
```bash
curl http://localhost:3000
# Should see HTML response
```

---

## Step 8: Configure Nginx Reverse Proxy

### Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/arg-platform
```

**Paste this configuration**:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # CHANGE THIS

    # Redirect to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Increase upload size for videos
    client_max_body_size 500M;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve uploaded files
    location /uploads/ {
        alias /var/www/arg-platform/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Serve video files with streaming support
    location /videos/ {
        alias /var/www/arg-platform/frontend/public/videos/;
        expires 7d;
        add_header Cache-Control "public";
        
        # Enable range requests for video seeking
        add_header Accept-Ranges bytes;
    }
}
```

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

### Enable the Site

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/arg-platform /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Test Access

```bash
# Get your public IP
curl ifconfig.me

# Open in browser: http://YOUR-DROPLET-IP
```

---

## Step 9: Set Up Domain (Optional but Recommended)

### Buy a Domain

1. **Go to**: Namecheap.com or Google Domains
2. **Search**: `arg-platform.com` (or your preferred name)
3. **Purchase**: ~$12/year
4. **Note**: Domain may take 15 minutes to activate

### Point Domain to DigitalOcean

**In your domain registrar**:
1. Go to DNS settings
2. Add **A Record**:
   - **Host**: `@`
   - **Value**: Your droplet IP (167.99.123.45)
   - **TTL**: 300
3. Add **A Record** for www:
   - **Host**: `www`
   - **Value**: Your droplet IP
   - **TTL**: 300

**Wait 5-30 minutes** for DNS propagation

**Test**:
```bash
ping your-domain.com
# Should show your droplet IP
```

---

## Step 10: Install SSL Certificate (HTTPS)

### Update Nginx Config with Domain

```bash
nano /etc/nginx/sites-available/arg-platform

# Update the server_name line:
# server_name your-actual-domain.com www.your-actual-domain.com;

# Save and reload
nginx -t
systemctl reload nginx
```

### Install Certbot SSL Certificate

```bash
# Get free SSL certificate from Let's Encrypt
certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts:
# - Enter email: stephenjohnson118120@gmail.com
# - Agree to terms: Y
# - Share email: N (optional)
# - Redirect HTTP to HTTPS: 2 (Yes, recommended)
```

**Certbot automatically**:
- Obtains SSL certificate
- Updates Nginx config
- Sets up HTTPS redirect
- Configures auto-renewal

### Test SSL

```bash
# Check SSL grade
curl https://your-domain.com

# Open in browser: https://your-domain.com
# Should see lock icon 🔒
```

### Auto-Renewal Test

```bash
# SSL certificates expire in 90 days
# Certbot auto-renews via cron job

# Test renewal
certbot renew --dry-run

# Should show "Congratulations, all renewals succeeded"
```

---

## Step 11: Upload Videos

### From Windows to Server

```powershell
# On your Windows machine
cd C:\path\to\your\videos

# Upload single video
scp week1.mp4 root@your-domain.com:/var/www/arg-platform/frontend/public/videos/

# Upload multiple videos
scp *.mp4 root@your-domain.com:/var/www/arg-platform/frontend/public/videos/
```

### On the Server

```bash
# Set proper permissions
cd /var/www/arg-platform/frontend/public/videos
chmod 644 *.mp4

# Verify
ls -lh
```

### Update Database with Video URLs

```bash
cd /var/www/arg-platform

# Access database
sqlite3 backend/data/project.db

# Update lesson video URLs
UPDATE lessons SET video_url = '/videos/week1.mp4' WHERE week = 1;
UPDATE lessons SET video_url = '/videos/week2.mp4' WHERE week = 2;
-- etc...

.quit
```

---

## Step 12: Create Admin User

### Using Seed Script

```bash
cd /var/www/arg-platform

# Run seed script
node backend/tools/seed-sample.js
```

### Or Manually

```bash
cd /var/www/arg-platform

# Generate password hash
node -e "const bcrypt = require('bcrypt'); console.error('Set admin password via SEED_ADMIN_PASSWORD; do not hardcode secrets in commands')"

# Copy the hash output, then:
sqlite3 backend/data/project.db

# Insert admin user
INSERT INTO users (username, email, password_hash, role, created_at)
VALUES ('admin', 'stephenjohnson118120@gmail.com', 'PASTE_HASH_HERE', 'admin', datetime('now'));

.quit
```

---

## Step 13: Monitoring & Maintenance

### Check Application Status

```bash
# PM2 status
pm2 status

# View logs
pm2 logs arg-platform

# View last 100 lines
pm2 logs arg-platform --lines 100

# Monitor in real-time
pm2 monit
```

### Restart Application

```bash
# Restart app
pm2 restart arg-platform

# Restart with zero downtime
pm2 reload arg-platform

# Stop app
pm2 stop arg-platform

# Delete from PM2
pm2 delete arg-platform
```

### Update Application Code

```bash
cd /var/www/arg-platform

# Backup database first!
cp backend/data/project.db backend/data/project.db.backup

# Pull new code (if using Git)
git pull

# Or upload new files via SCP from Windows

# Install new dependencies
npm install --production

# Restart app
pm2 restart arg-platform

# Check logs
pm2 logs arg-platform --lines 50
```

### Database Backups

```bash
# Create backup directory
mkdir -p /var/backups/arg-platform

# Manual backup
sqlite3 backend/data/project.db ".backup '/var/backups/arg-platform/backup-$(date +%Y%m%d-%H%M%S).db'"

# Set up daily backups
crontab -e

# Add this line (daily at 2 AM):
0 2 * * * sqlite3 /var/www/arg-platform/backend/data/project.db ".backup '/var/backups/arg-platform/backup-$(date +\%Y\%m\%d).db'"
```

### Download Backups to Windows

```powershell
# On Windows
scp root@your-domain.com:/var/backups/arg-platform/backup-*.db C:\backups\
```

---

## Step 14: Security Hardening

### Update System Regularly

```bash
# Update packages weekly
apt update && apt upgrade -y

# Set up automatic security updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

### Create Non-Root User (Recommended)

```bash
# Create user
adduser argadmin

# Add to sudo group
usermod -aG sudo argadmin

# Copy SSH keys
rsync --archive --chown=argadmin:argadmin ~/.ssh /home/argadmin

# Test login from Windows
# ssh argadmin@your-domain.com

# Disable root SSH login (after testing)
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
systemctl restart sshd
```

### Monitor Failed Login Attempts

```bash
# Install fail2ban
apt install -y fail2ban

# Check status
fail2ban-client status
fail2ban-client status sshd
```

---

## Quick Reference Commands

### Application Management
```bash
pm2 status                    # Check app status
pm2 logs arg-platform        # View logs
pm2 restart arg-platform     # Restart app
pm2 monit                    # Monitor CPU/memory
```

### Nginx Management
```bash
systemctl status nginx       # Check Nginx status
nginx -t                     # Test config
systemctl reload nginx       # Reload config
systemctl restart nginx      # Restart Nginx
```

### Database Management
```bash
sqlite3 backend/data/project.db    # Open database
sqlite3 backend/data/project.db ".tables"    # List tables
sqlite3 backend/data/project.db ".schema users"    # Show table structure
```

### View Logs
```bash
pm2 logs arg-platform --lines 100    # App logs
tail -f /var/log/nginx/error.log     # Nginx errors
tail -f /var/log/nginx/access.log    # Nginx access
journalctl -u nginx -f               # Nginx system logs
```

---

## Troubleshooting

### App Won't Start
```bash
# Check logs
pm2 logs arg-platform --lines 100

# Common issues:
# - Missing .env file
# - Wrong DB_PATH in .env
# - Port 3000 already in use

# Check if port is in use
netstat -tulpn | grep 3000

# Kill process on port 3000
kill $(lsof -t -i:3000)
```

### Can't Access Site
```bash
# Check Nginx status
systemctl status nginx

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Test Nginx config
nginx -t

# Check firewall
ufw status

# Test app directly
curl http://localhost:3000
```

### SSL Certificate Issues
```bash
# Renew certificate manually
certbot renew

# Check certificate status
certbot certificates

# Test renewal
certbot renew --dry-run
```

### Database Locked Error
```bash
# Stop app
pm2 stop arg-platform

# Check for lock file
ls -la backend/data/

# Remove lock (if exists)
rm backend/data/project.db-wal
rm backend/data/project.db-shm

# Restart app
pm2 start arg-platform
```

### Videos Won't Play
```bash
# Check file permissions
ls -la frontend/public/videos/

# Fix permissions
chmod 644 frontend/public/videos/*.mp4

# Check Nginx config has video location block
nginx -t

# Check video URL in database
sqlite3 backend/data/project.db "SELECT id, title, video_url FROM lessons;"
```

---

## Cost Estimate

| Item | Cost |
|------|------|
| DigitalOcean Droplet ($12/month) | $144/year |
| Domain name (optional) | $12/year |
| SSL Certificate (Let's Encrypt) | FREE |
| **Total** | **$156/year** |

**With $200 promo code**: First 16 months FREE!

---

## Support

- **DigitalOcean Docs**: https://docs.digitalocean.com/
- **Community**: https://www.digitalocean.com/community/
- **Support Tickets**: Available in DigitalOcean dashboard
- **Your DEPLOYMENT.md**: More detailed deployment info

---

## Next Steps After Deployment

1. ✅ **Test all features**: Login, video playback, assignments, admin panel
2. ✅ **Create organizations**: Set up your first org in admin panel
3. ✅ **Generate access tokens**: Use `/api/org/token/:orgId` endpoint
4. ✅ **Upload educational content**: Videos, assignments, curriculum
5. ✅ **Invite users**: Share organization access links
6. ✅ **Monitor usage**: Check PM2 logs, Nginx access logs
7. ✅ **Set up backups**: Daily database backups to external storage
8. ✅ **Register copyright**: File with U.S. Copyright Office (see COPYRIGHT_GUIDE.md)

---

**Deployment completed! Your platform is now live at https://your-domain.com 🚀**

For questions: stephenjohnson118120@gmail.com
