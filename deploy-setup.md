# Valor Digital Ocean Deployment Guide

## Server Requirements
- Ubuntu 20.04+ Droplet (2GB RAM minimum)
- Node.js 18+
- PostgreSQL 12+
- Nginx (for SSL/HTTPS)
- PM2 (for process management)

## Quick Setup Commands

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js 18
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4. Install PM2 & Nginx
```bash
sudo npm install -g pm2
sudo apt install nginx -y
```

### 5. Setup Database
```bash
sudo -u postgres createuser --interactive
sudo -u postgres createdb valor_db
```

### 6. Setup SSL with Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

## Environment Variables
Create `.env` file:
```
NODE_ENV=production
OPENAI_API_KEY=your_openai_key_here
DATABASE_URL=postgresql://username:password@localhost:5432/valor_db
PORT=3000
```

## Deployment Commands
```bash
# Clone/upload Valor files
npm install --production
npm run build
pm2 start dist/index.js --name "valor"
pm2 startup
pm2 save
```

## Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
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
}
```