# Deployment Guide

Complete guide for deploying the ARG Professional Development application to a production server.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Initial Server Setup](#initial-server-setup)
4. [Application Deployment](#application-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [File Storage & Video Uploads](#file-storage--video-uploads)
8. [SSL/HTTPS Setup](#sslhttps-setup)
9. [Process Management](#process-management)
10. [Security Checklist](#security-checklist)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Domain name configured with DNS pointing to your server
- Server with root/sudo access (VPS, cloud instance, or dedicated server)
- Basic knowledge of Linux command line
- Git installed on your local machine

---

## Server Requirements

### Minimum Specifications
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- **RAM**: 2GB minimum (4GB recommended for video handling)
- **Storage**: 20GB minimum + additional space for video uploads
  - Estimate: ~100MB per video lesson at 1080p
  - For 12 weeks of lessons: Plan for 10-50GB video storage
- **CPU**: 2 cores minimum
- **Network**: Stable connection with sufficient bandwidth for video streaming

### Software Requirements
- Node.js 18+ or 20+ LTS
- npm 9+
- Git
- Nginx or Apache (for reverse proxy)
- Certbot (for SSL certificates)
- SQLite 3.x (included with Node.js sqlite3 package)

---

## Initial Server Setup

### 1. Update System

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Install Node.js

```bash
# Ubuntu/Debian - Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version   # Should be 10.x.x
```

### 3. Install Nginx

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. Create Application User

```bash
# Create a dedicated user for the application
sudo useradd -m -s /bin/bash argapp
sudo usermod -aG sudo argapp  # Optional: if you need sudo access
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Switch to application user
sudo su - argapp

# Clone your repository
cd ~
git clone <your-repository-url> arg-professional-development
cd arg-professional-development
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Build Production Assets

```bash
# Build minified JavaScript and CSS
npm run build

# This runs:
# - terser for JS minification
# - clean-css for CSS minification  
# - brotli compression for both
```

---

## Environment Configuration

### 1. Create Production .env File

```bash
cd ~/arg-professional-development
cp env.example .env
nano .env
```

### 2. Configure Production Variables

**Required Production Settings:**

```env
# Environment
NODE_ENV=production

# Server
PORT=4000
SESSION_SECRET=<GENERATE_STRONG_RANDOM_SECRET_HERE>
DB_PATH=/home/argapp/arg-professional-development/backend/data/project.db

# SMTP for email sharing (configure with your email provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=no-reply@yourdomain.com
```

**Generate Strong SESSION_SECRET:**

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: Using openssl
openssl rand -hex 64
```

### 3. Secure .env File

```bash
chmod 600 .env
```

---

## Database Setup

### 1. Initialize Database

The database will be created automatically on first run. To pre-initialize:

```bash
cd ~/arg-professional-development

# Run database initialization (if you have a seed script)
node backend/tools/seed-sample.js
```

### 2. Database Backup Strategy

```bash
# Create backup directory
mkdir -p ~/backups/database

# Create backup script
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups/database
DB_PATH=~/arg-professional-development/backend/data/project.db
DATE=$(date +%Y%m%d_%H%M%S)
cp "$DB_PATH" "$BACKUP_DIR/project_${DATE}.db"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "project_*.db" -mtime +30 -delete
EOF

chmod +x ~/backup-db.sh

# Add to crontab for daily backups at 2 AM
crontab -e
# Add this line:
# 0 2 * * * /home/argapp/backup-db.sh
```

---

## File Storage & Video Uploads

### 1. Create Upload Directory

```bash
cd ~/arg-professional-development
mkdir -p backend/uploads
chmod 755 backend/uploads
```

### 2. Configure Nginx for Large File Uploads

Video files can be large (100MB+). Update Nginx configuration:

```bash
sudo nano /etc/nginx/nginx.conf
```

Add/update in `http` block:

```nginx
http {
    # Allow large file uploads for videos
    client_max_body_size 500M;
    client_body_timeout 300s;
    
    # Increase buffer sizes
    client_body_buffer_size 128k;
    
    # ... rest of config
}
```

### 3. Video Storage Recommendations

**Option A: Local Storage (Simpler)**
- Store videos in `backend/uploads/videos/`
- Ensure sufficient disk space (plan for growth)
- Regular backups recommended

**Option B: Cloud Storage (Scalable)**
- Use AWS S3, Google Cloud Storage, or DigitalOcean Spaces
- Update application to use cloud URLs for `video_url`
- Benefits: Better scalability, CDN integration, lower server load

### 4. Video Upload Limits

Current multer configuration has no size limit. Add production limits:

Edit [backend/routes/api.js](backend/routes/api.js):

```javascript
const upload = multer({ 
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit for videos
    },
    fileFilter: (req, file, cb) => {
        // Allow videos and documents
        const allowedTypes = /mp4|mov|avi|wmv|pdf|docx|txt/;
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.test(ext.slice(1))) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only videos and documents allowed.'));
        }
    }
});
```

---

## SSL/HTTPS Setup

### 1. Install Certbot

```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/argapp
```

Add configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (will be added after SSL setup)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (certbot will add these)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Large file upload support for videos
    client_max_body_size 500M;
    client_body_timeout 300s;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for large uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:4000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/argapp /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 3. Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically:
- Obtain certificate
- Update Nginx configuration
- Set up auto-renewal

### 4. Test SSL Configuration

Visit: https://www.ssllabs.com/ssltest/ and enter your domain.

---

## Process Management

### Option 1: PM2 (Recommended)

#### Install PM2

```bash
sudo npm install -g pm2
```

#### Start Application

```bash
cd ~/arg-professional-development
pm2 start backend/server.js --name "argapp" --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs (with sudo)
```

#### PM2 Management Commands

```bash
# View logs
pm2 logs argapp

# Restart application
pm2 restart argapp

# Stop application
pm2 stop argapp

# Monitor resources
pm2 monit

# View status
pm2 status
```

### Option 2: systemd Service

Create service file:

```bash
sudo nano /etc/systemd/system/argapp.service
```

Add configuration:

```ini
[Unit]
Description=Professional Development Project platform
After=network.target

[Service]
Type=simple
User=argapp
WorkingDirectory=/home/argapp/arg-professional-development
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=argapp
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable argapp
sudo systemctl start argapp

# Check status
sudo systemctl status argapp

# View logs
sudo journalctl -u argapp -f
```

---

## Security Checklist

### Application Security

- [x] `.env` file is not in version control
- [x] `.gitignore` prevents committing sensitive files
- [x] Strong `SESSION_SECRET` configured (64+ random characters)
- [x] `NODE_ENV=production` is set
- [x] Database file permissions restricted (`chmod 600`)
- [x] Upload directory permissions properly set
- [x] Rate limiting enabled for uploads and authentication
- [x] Helmet.js security headers configured
- [x] Session cookies set to `secure: true` (HTTPS only)
- [x] HTTPS/SSL configured with valid certificate

### Server Security

- [ ] Firewall configured (allow only 22, 80, 443)
- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] Automatic security updates enabled
- [ ] Fail2ban installed for SSH protection
- [ ] Regular system updates scheduled

#### Firewall Setup (UFW)

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## Monitoring & Maintenance

### 1. Application Logs

```bash
# PM2 logs
pm2 logs argapp --lines 100

# systemd logs
sudo journalctl -u argapp -n 100 -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Disk Space Monitoring

```bash
# Check disk usage
df -h

# Check upload directory size
du -sh ~/arg-professional-development/backend/uploads
```

### 3. Database Monitoring

```bash
# Check database size
ls -lh ~/arg-professional-development/backend/data/project.db

# SQLite integrity check
sqlite3 ~/arg-professional-development/backend/data/project.db "PRAGMA integrity_check;"
```

### 4. Update Application

```bash
cd ~/arg-professional-development

# Pull latest changes
git pull origin main

# Install new dependencies
npm install --production

# Rebuild assets
npm run build

# Restart application
pm2 restart argapp
# OR
sudo systemctl restart argapp
```

---

## Troubleshooting

### Application Won't Start

1. **Check logs:**
   ```bash
   pm2 logs argapp --err
   ```

2. **Verify .env file:**
   ```bash
   cat .env  # Ensure all required variables are set
   ```

3. **Check port availability:**
   ```bash
   sudo netstat -tlnp | grep 4000
   ```

### File Upload Fails

1. **Check Nginx configuration:**
   ```bash
   sudo nginx -t
   grep client_max_body_size /etc/nginx/nginx.conf
   ```

2. **Check upload directory permissions:**
   ```bash
   ls -la backend/uploads
   ```

3. **Check disk space:**
   ```bash
   df -h
   ```

### Database Errors

1. **Check file permissions:**
   ```bash
   ls -la backend/data/
   ```

2. **Test database connection:**
   ```bash
   sqlite3 backend/data/project.db "SELECT * FROM users LIMIT 1;"
   ```

### SSL Certificate Issues

1. **Test certificate renewal:**
   ```bash
   sudo certbot renew --dry-run
   ```

2. **Check certificate expiry:**
   ```bash
   sudo certbot certificates
   ```

---

## Production Performance Tips

1. **Enable Nginx caching** for static assets
2. **Use CDN** for video delivery (CloudFlare, AWS CloudFront)
3. **Enable compression** (gzip/brotli) - already configured
4. **Monitor RAM usage** and adjust if needed
5. **Regular database VACUUM** to optimize:
   ```bash
   sqlite3 backend/data/project.db "VACUUM;"
   ```

---

## Support & Updates

- Keep Node.js updated to latest LTS version
- Monitor security advisories: `npm audit`
- Update dependencies regularly: `npm update`
- Review logs weekly for errors or issues
- Test backup restoration periodically

---

**Deployment Complete! 🎉**

Your application should now be running securely in production with:
- HTTPS enabled
- Process management
- Automatic restarts
- Video upload support
- Database backups
- Security hardening
