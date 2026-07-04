# Detailed EC2 Deployment for Node.js/Express

A step-by-step guide to deploying a production-ready Node.js application on a single EC2 instance.

## Key Terms

* **EC2 instance** (virtual Linux server): where Node.js runs.
* **PM2** (Node process manager): auto-restarts and monitors app.
* **Nginx** (reverse proxy): handles public traffic before Node.
* **Elastic IP** (stable IP): prevents public IP changing after restart.
* **Security Group** (firewall): controls SSH/HTTP/HTTPS access.
* **systemd startup** (boot-time service): makes PM2/app restart after reboot.
* **Log file** (debug record): PM2/Nginx/system logs help troubleshoot.
* **SSL/HTTPS** (encrypted browser traffic): required for production.

---

## 1. Instance Setup
1. **Launch Instance:** Ubuntu 22.04, `t3.micro` or higher.
2. **Security Group:** Inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS).
3. **Elastic IP:** Allocate and associate an Elastic IP (so your IP stays constant).

---

## 2. Server Configuration (The Setup Script)
Run these commands after SSH login:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify install
node -v
npm -v

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

---

## 3. Deployment Steps
1. **Clone project:**
```bash
git clone https://github.com/user/repo.git
cd repo
npm install
```

2. **Configure Environment Variables:**
```bash
nano .env
# Add: PORT=5000, DB_URL, JWT_SECRET, etc.
```

3. **Start Application with PM2:**
```bash
pm2 start server.js --name my-app
pm2 save
pm2 startup # Follow the instructions it provides!
```

---

## 4. Nginx Reverse Proxy
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/default
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo service nginx restart
```

---

## 5. SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
# Follow the prompts (email, terms, redirect).
```

---

## 6. Maintenance Commands
- **View Logs:** `pm2 logs`
- **Restart App:** `pm2 restart my-app`
- **Check Status:** `pm2 status`
- **Monitor RAM/CPU:** `pm2 monit`
