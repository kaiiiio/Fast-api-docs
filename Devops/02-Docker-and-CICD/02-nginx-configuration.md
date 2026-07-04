# NGINX — Configuration & Usage

## Why NGINX Sits in Front

```
Internet
 ↓ HTTPS
NGINX (Reverse Proxy)
 ↓ HTTP
Backend (Node.js / FastAPI)
```

NGINX handles:

* **SSL/TLS termination** (HTTPS)
* **Load balancing**
* **Static file serving**
* **Request routing**
* **Rate limiting**
* **Compression**
* **Caching**

---

## Key Terms

* **Reverse proxy** (server in front of backend): receives client traffic and forwards to app servers.
* **SSL/TLS termination** (HTTPS handled at NGINX): NGINX decrypts HTTPS before forwarding HTTP internally.
* **Upstream** (backend server group): list of app servers NGINX can forward to.
* **Load balancing** (spread traffic): sends requests across multiple backend instances.
* **Rate limiting** (request speed control): protects app from abuse or sudden spikes.
* **Static file serving** (serve files directly): NGINX sends images/CSS/JS without hitting backend.
* **Proxy headers** (original request info): pass client IP, host, and protocol to backend.
* **Timeout** (max wait time): prevents hanging backend requests from consuming resources forever.
* **Buffering** (temporary request/response storage): helps handle slow clients safely.
* **Cache** (store repeated responses): reduces backend load for repeated reads.

---

## What is a Reverse Proxy?

### Forward Proxy
```
Client → Proxy → Internet
(Hides client)
```

### Reverse Proxy
```
Client → NGINX → Backend Servers
(Hides servers)
```

---

## Basic NGINX Configuration

**/etc/nginx/nginx.conf** or **/etc/nginx/sites-available/default**

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## SSL/HTTPS Configuration

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;  # Redirect to HTTPS
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Static Files + API Routing

```nginx
server {
    listen 80;
    server_name example.com;

    # Serve static files directly
    location /static/ {
        alias /var/www/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Serve images
    location /images/ {
        alias /var/www/images/;
        expires 7d;
    }

    # API requests to backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend (SPA)
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Load Balancing

```nginx
upstream backend {
    least_conn;  # or ip_hash, round_robin (default)
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}
```

### Load Balancing Methods

| Method | Description |
| ------ | ----------- |
| round_robin | Default, distributes evenly |
| least_conn | Sends to server with fewest connections |
| ip_hash | Same client → same server (sticky sessions) |

---

## Rate Limiting

```nginx
# Define rate limit zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    listen 80;

    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }
}
```

**Explanation**:
- `rate=10r/s`: 10 requests per second
- `burst=20`: Allow bursts up to 20 requests
- `nodelay`: Don't delay excess requests

---

## Caching

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

server {
    listen 80;

    location /api/data {
        proxy_cache my_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_bypass $http_cache_control;
        add_header X-Cache-Status $upstream_cache_status;
        
        proxy_pass http://localhost:3000;
    }
}
```

---

## WebSocket Support

```nginx
server {
    listen 80;

    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;  # 24 hours
    }
}
```

---

## CORS Configuration

```nginx
server {
    listen 80;

    location /api/ {
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Length' 0;
            return 204;
        }

        add_header 'Access-Control-Allow-Origin' '*' always;
        proxy_pass http://localhost:3000;
    }
}
```

---

## Compression

```nginx
server {
    listen 80;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        proxy_pass http://localhost:3000;
    }
}
```

---

## Common NGINX Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration (no downtime)
sudo nginx -s reload

# Restart NGINX
sudo systemctl restart nginx

# View status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Production Configuration Example

```nginx
# /etc/nginx/sites-available/myapp

upstream backend {
    least_conn;
    server localhost:3000 max_fails=3 fail_timeout=30s;
    server localhost:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

# Caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name myapp.com www.myapp.com;
    return 301 https://myapp.com$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name myapp.com www.myapp.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript;

    # Static files
    location /static/ {
        alias /var/www/myapp/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API with rate limiting
    location /api/ {
        limit_req zone=api_limit burst=200 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend SPA
    location / {
        root /var/www/myapp/build;
        try_files $uri $uri/ /index.html;
        expires 1h;
    }
}
```

---

## Interview Questions

**Q: Why use NGINX instead of exposing Node.js/FastAPI directly?**
A:
- SSL/TLS termination
- Load balancing
- Static file serving (more efficient)
- Rate limiting
- Better security
- Caching

**Q: What is the difference between `proxy_pass` and `alias`?**
A:
- `proxy_pass`: Forward request to another server
- `alias`: Serve files from local filesystem

**Q: How does NGINX handle high traffic?**
A: Event-driven architecture with worker processes. Can handle thousands of concurrent connections efficiently.

---

## Best Practices

✅ Always use HTTPS in production
✅ Enable compression (gzip)
✅ Set appropriate timeouts
✅ Implement rate limiting
✅ Use caching for static content
✅ Add security headers
✅ Monitor logs regularly
✅ Use `nginx -t` before reload

❌ Don't expose backend ports directly
❌ Don't skip SSL certificate validation
❌ Don't ignore error logs

---

## Summary

| Feature | Purpose |
| ------- | ------- |
| Reverse Proxy | Hide backend servers |
| SSL Termination | Handle HTTPS |
| Load Balancing | Distribute traffic |
| Static Files | Serve efficiently |
| Rate Limiting | Prevent abuse |
| Caching | Reduce backend load |

**Key Insight**: NGINX is the gateway between internet and your application.
