# Multi-Project EC2 Setup with Custom Domains

This guide explains how to run **multiple projects** on one EC2 server, each behind its own subdomain (e.g. `api.vinci.scopophobic.xyz`), with Nginx handling HTTPS and routing. It also covers what you need for Google OAuth (redirect URIs require a custom domain).

---

## 1. Overview

| What | How |
|------|-----|
| **One EC2** | One public IP. All projects share it. |
| **Traffic** | Internet → **only** ports **80** and **443** (Nginx). |
| **Per project** | One **subdomain** (e.g. `api.vinci.scopophobic.xyz`) and one **internal port** (e.g. 3001). |
| **Routing** | Nginx listens on 80/443 and forwards by **hostname** to the right port (3001, 3002, …). |
| **OAuth** | Google requires a **valid top private domain** for redirect URIs — use your subdomain, not the EC2 hostname. |

---

## 2. What You Need to Do (Step by Step)

### Step 1: DNS — Point Each API Subdomain to EC2

For each project you want to expose:

1. In your DNS provider (where `scopophobic.xyz` is managed), add an **A record**:
   - **Name/host:** the API subdomain (e.g. `api.vinci` or `api.vinci.scopophobic` so the full name is `api.vinci.scopophobic.xyz`).
   - **Type:** A  
   - **Value:** your EC2 **public IP** (e.g. the IP of `ec2-52-90-38-37.compute-1.amazonaws.com`).  
   - **TTL:** 300 (or default).

2. Repeat for every project:
   - VinciUI: `api.vinci.scopophobic.xyz` → EC2 IP  
   - Next project: `api.otherproject.scopophobic.xyz` → same EC2 IP  

**Important:** Do **not** put any port in the DNS record. Only the IP. Port is always 443 (HTTPS) for the browser.

---

### Step 2: Install Nginx and (Optional) Certbot on EC2

SSH into your EC2, then:

```bash
sudo apt-get update -y
sudo apt-get install -y nginx

# Optional but recommended: SSL certificates
sudo apt-get install -y certbot python3-certbot-nginx
```

Ensure Nginx is running:

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

### Step 3: Get an SSL Certificate for Your API Subdomain

Replace `api.vinci.scopophobic.xyz` with your real subdomain. DNS must already point to the EC2 IP.

```bash
sudo certbot --nginx -d api.vinci.scopophobic.xyz
```

Follow the prompts (email, agree to terms). Certbot will edit Nginx config to add HTTPS. When you add more projects, run certbot again for each subdomain:

```bash
sudo certbot --nginx -d api.otherproject.scopophobic.xyz
```

---

### Step 4: Configure Nginx — One Server Block per Project

Nginx decides which backend to use by the **Host** header (your subdomain). Each project gets one `server { ... }` block.

**Create a config file** (e.g. for VinciUI + one extra project):

```bash
sudo nano /etc/nginx/sites-available/api-projects
```

Paste the following, then **replace**:

- `api.vinci.scopophobic.xyz` with your VinciUI API subdomain.  
- `api.otherproject.scopophobic.xyz` with your second project’s subdomain (or remove that block if you only have one).  
- `3001` and `3002` with the **internal ports** your Docker containers use.  
- Cert paths if Certbot used different names.

```nginx
# VinciUI API
server {
    listen 80;
    server_name api.vinci.scopophobic.xyz;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name api.vinci.scopophobic.xyz;

    ssl_certificate     /etc/letsencrypt/live/api.vinci.scopophobic.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.vinci.scopophobic.xyz/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
}

# Second project (example)
server {
    listen 80;
    server_name api.otherproject.scopophobic.xyz;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name api.otherproject.scopophobic.xyz;

    ssl_certificate     /etc/letsencrypt/live/api.otherproject.scopophobic.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.otherproject.scopophobic.xyz/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable the site and reload Nginx:**

```bash
sudo ln -sf /etc/nginx/sites-available/api-projects /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Note:** If you ran `certbot --nginx` first, Certbot may have already created a config. You can either edit that file or use the one above and disable the default site: `sudo rm /etc/nginx/sites-enabled/default` (after your config is in place).

---

### Step 5: Ensure Your App (e.g. VinciUI) Listens on the Right Port

Your VinciUI API runs in Docker and is mapped to host port **3001** (as in your `docker-compose.yml`). No change needed if it’s already:

```yaml
ports:
  - "3001:3001"
```

For a **second project**, run its container on a different port, e.g. **3002**:

```yaml
ports:
  - "3002:3002"
```

Only Nginx needs to be reachable on 80/443 from the internet. The security group should allow **80** and **443** inbound; you do **not** need to open 3001, 3002, etc. to the public.

---

### Step 6: Set Environment Variables for the Custom Domain

On the EC2, in your project’s `.env.local` (e.g. `~/project/vinciUI/.env.local`), set:

```env
API_BASE_URL=https://api.vinci.scopophobic.xyz
FRONTEND_ORIGIN=https://vinci.scopophobic.xyz
```

Use **no trailing slash**. Restart the container after changing:

```bash
cd ~/project/vinciUI
docker-compose down
docker-compose up -d
```

---

### Step 7: Google OAuth — Use the Custom Domain for Redirect URI

1. Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → your OAuth 2.0 Client ID (Web application).
2. Under **Authorized redirect URIs**, remove any URI that uses the EC2 hostname (e.g. `ec2-52-90-38-37.compute-1.amazonaws.com`).
3. Add the callback URL for your API using the **custom domain** and the path your backend uses. For VinciUI it is `/api/auth/callback`:

   ```
   https://api.vinci.scopophobic.xyz/api/auth/callback
   ```

4. Under **Authorized JavaScript origins**, you can add (if your frontend uses this domain):

   ```
   https://vinci.scopophobic.xyz
   ```

5. Save. Changes can take a few minutes to apply.

---

## 3. Adding Another Project Later

1. **Pick an internal port** not in use (e.g. 3002, 3003).
2. **DNS:** Add an A record: `api.newproject.scopophobic.xyz` → EC2 IP.
3. **Run the app** so it listens on that port (e.g. in Docker `ports: ["3002:3002"]`).
4. **SSL:** `sudo certbot --nginx -d api.newproject.scopophobic.xyz`
5. **Nginx:** Add a new `server { server_name api.newproject.scopophobic.xyz; ... proxy_pass http://127.0.0.1:3002; }` block (and HTTP→HTTPS redirect), then `sudo nginx -t && sudo systemctl reload nginx`.
6. **App env:** Set `API_BASE_URL=https://api.newproject.scopophobic.xyz` (and frontend origin if needed).
7. **OAuth:** In Google (or another provider), set redirect URI to `https://api.newproject.scopophobic.xyz/.../callback` (use the correct path for that app).

---

## 4. Quick Reference

| Item | Example (VinciUI) |
|------|-------------------|
| API subdomain | `api.vinci.scopophobic.xyz` |
| DNS | A record → EC2 public IP |
| Nginx | `server_name api.vinci...; proxy_pass http://127.0.0.1:3001` |
| Internal port | 3001 (VinciUI), 3002 (next app), … |
| API_BASE_URL | `https://api.vinci.scopophobic.xyz` |
| OAuth redirect URI | `https://api.vinci.scopophobic.xyz/api/auth/callback` |

---

## 5. Troubleshooting

- **502 Bad Gateway:** Backend not running or wrong port. Check `curl http://127.0.0.1:3001/api/health` and that Nginx `proxy_pass` port matches.
- **Certificate errors:** Ensure DNS points to EC2 and run `sudo certbot --nginx -d api.vinci.scopophobic.xyz` again.
- **OAuth “redirect_uri_mismatch”:** The redirect URI in Google must match **exactly** what your app sends (including `https`, domain, and path like `/api/auth/callback`).
