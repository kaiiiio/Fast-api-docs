# Detailed EC2 Deployment for FastAPI

Deploying a high-performance Python/FastAPI application with Gunicorn, Uvicorn, and Nginx.

## Key Terms

* **Uvicorn** (ASGI server): runs FastAPI app.
* **Gunicorn** (worker manager): supervises multiple Uvicorn workers.
* **systemd** (Linux service manager): keeps FastAPI running after reboot.
* **Nginx** (reverse proxy): forwards public traffic to FastAPI.
* **Virtualenv** (isolated Python packages): keeps project dependencies separate.
* **Environment variable** (runtime config): DB URL, secret key, app mode.
* **Health endpoint** (simple status route): used to verify deployment.
* **SSL/HTTPS** (encrypted traffic): production requirement.

---

## 1. Server Setup
1. **Launch Instance:** Ubuntu 22.04.
2. **Security Group:** 22, 80, 443.

---

## 2. Environment Configuration
```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Python install
sudo apt install python3-pip python3-venv -y

# Setup project folder
mkdir ~/myapi && cd ~/myapi
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn gunicorn pydantic-settings
```

---

## 3. Gunicorn + Uvicorn Configuration
Gunicorn acts as the process manager, and Uvicorn handles the ASGI async execution.

**Create Systemd Service:**
`sudo nano /etc/systemd/system/fastapi.service`

```ini
[Unit]
Description=Gunicorn instance to serve FastAPI
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/myapi
Environment="PATH=/home/ubuntu/myapi/venv/bin"
ExecStart=/home/ubuntu/myapi/venv/bin/gunicorn \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    main:app \
    --bind 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl start fastapi
sudo systemctl enable fastapi
```

---

## 4. Nginx Configuration
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/default
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        include proxy_params;
        proxy_redirect off;
    }
}
```

```bash
sudo service nginx restart
```

---

## 5. Migrations & Secrets
- **Alembic:** Run `alembic upgrade head` after setting up the DB.
- **Environment Variables:** Create a `.env` file and use `pydantic-settings` to load configuration.
