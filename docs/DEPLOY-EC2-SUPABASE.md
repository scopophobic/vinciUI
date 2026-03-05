# Deploy VinciUI on EC2 with Supabase (Google Auth Only)

Quick plan to run VinciUI on a **new EC2** instance using **Supabase** for the database and **Google OAuth** only for auth.

**Coming from AWS RDS?** See [MIGRATE-RDS-TO-SUPABASE.md](./MIGRATE-RDS-TO-SUPABASE.md) to move this project’s DB from RDS to Supabase (fresh start or with data copy).

---

## Quick start (TL;DR)

1. **Password with `#`**: In `DATABASE_URL`, encode the password: `#` → `%23`, `%` → `%25`.
2. **Google Cloud**: Add redirect URI `http://YOUR_EC2_IP/api/auth/callback` (or your domain).
3. **EC2**: Install Node 20 → clone repo → `npm install && npm run build` → create `.env.local` with production vars (encoded `DATABASE_URL`, Google, Gemini, JWT, `API_BASE_URL`, `FRONTEND_ORIGIN`) → run `node server.js` (or PM2). Use Nginx to serve `dist/` and proxy `/api` to port 3001 so one URL works.

Details below.

---

## 1. Supabase password with `#` (or other special characters)

**Yes, `#` in your Supabase password can break the connection.**

In a URL like `postgresql://user:password@host:5432/db`, the `#` character starts the **fragment**. Everything after `#` is stripped by URL parsers, so your password would be cut off and the DB connection will fail.

### Fix: Percent-encode the password in `DATABASE_URL`

Encode **only the password part** of the URL:

| Character | Replace with |
|-----------|----------------|
| `#`       | `%23`         |
| `%`       | `%25`         |
| `@`       | `%40`         |
| `/`       | `%2F`         |
| `?`       | `%3F`         |
| `&`       | `%26`         |
| `=`       | `%3D`         |
| `+`       | `%2B`         |
| space     | `%20`         |

**Example:**  
If your Supabase password is `TH%j#-%WC2yMS%*`:

- Encode: `#` → `%23`, and each literal `%` → `%25`
- Encoded password: `TH%25j%23-%WC2yMS%25*`
- Full URL:  
  `postgresql://postgres:TH%25j%23-%WC2yMS%25*@db.xxxx.supabase.co:5432/postgres`

So in `.env` or EC2 env vars, use:

```env
DATABASE_URL=postgresql://postgres:TH%25j%23-%WC2yMS%25*@db.kxsbvowrgisehlrhbgwf.supabase.co:5432/postgres
```

**Quick check:** In Node, `new URL(process.env.DATABASE_URL).password` should return the **decoded** password (with real `#` and `%`). If it’s truncated or wrong, fix the encoding.

---

## 2. High-level flow

```
[User] → Browser (Vite app) → EC2 (Express API) → Supabase (PostgreSQL)
                    ↓
              Google OAuth (login only)
```

- **Supabase**: DB only (tables: users, user_usage, moderation_logs, etc.). No Supabase Auth.
- **Auth**: Google OAuth only (handled by your Express backend; JWT in cookie).

---

## 3. Prerequisites checklist

- [ ] **Supabase project** with connection string (password encoded as above).
- [ ] **Google Cloud Console**: OAuth 2.0 Client (Web application) with:
  - Authorized redirect URI: `https://YOUR_EC2_DOMAIN_OR_IP/api/auth/callback`  
  - (Later you can add a proper domain and HTTPS.)
- [ ] **Gemini API key** (Google AI Studio).
- [ ] **EC2 instance** (e.g. Ubuntu 22.04, t2.micro or t3.small).

---

## 4. EC2 setup (minimal, quick)

### 4.1 Launch and connect

- Launch Ubuntu 22.04 AMI.
- Security group: allow **22** (SSH), **80** (HTTP), **443** (HTTPS if you use it), **3001** only if you want to hit the API directly (otherwise just 80/443 and put Nginx in front).
- Connect: `ssh -i your-key.pem ubuntu@<EC2-public-IP>`.

### 4.2 Install Node (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # v20.x
```

### 4.3 Clone and build app

```bash
cd ~
git clone <your-repo-url> vinciUI
cd vinciUI
npm install
```

If the frontend and API will be on the **same origin** (e.g. Nginx serving `dist/` and proxying `/api`), you can build with the same host:

```bash
# Same-origin (e.g. http://EC2_IP): set VITE_API_URL to '' or same origin
VITE_API_URL= npm run build
```

If the frontend will be on a different URL than the API, set `VITE_API_URL` to the full API base URL before building:

```bash
VITE_API_URL=http://YOUR_EC2_IP npm run build
# Or with domain: VITE_API_URL=https://api.yourdomain.com npm run build
```

Then:

```bash
npm run build
```

### 4.4 Environment variables on EC2

The server loads **`.env.local`** (see `server.js`). Create it on EC2 with production values (do **not** commit; it’s in `.gitignore`):

```bash
nano ~/vinciUI/.env.local
```

Fill (replace placeholders; password must be **percent-encoded** in `DATABASE_URL`):

```env
NODE_ENV=production
PORT=3001

# Supabase (password with # encoded as %23, % as %25)
DATABASE_URL=postgresql://postgres:YOUR_ENCODED_PASSWORD@db.xxxx.supabase.co:5432/postgres

# Google OAuth (same as in Google Cloud Console)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Gemini
GEMINI_API_KEY=xxx

# JWT (generate: openssl rand -hex 32)
JWT_SECRET=your-long-secret

# Public URL of this API (no trailing slash) — required for OAuth redirect
API_BASE_URL=http://YOUR_EC2_PUBLIC_IP
# Or with domain: API_BASE_URL=https://api.yourdomain.com

# Frontend origin (where the Vite app is served)
FRONTEND_ORIGIN=http://YOUR_EC2_PUBLIC_IP
# Or: FRONTEND_ORIGIN=https://app.yourdomain.com
```

Save as `~/vinciUI/.env.local`. **Google Cloud Console:**  
Add to **Authorized redirect URIs**:

- `http://YOUR_EC2_PUBLIC_IP/api/auth/callback`  
- (Later: `https://api.yourdomain.com/api/auth/callback`)

### 4.5 Run backend (quick test)

```bash
cd ~/vinciUI
node server.js
```

Backend runs on port 3001 and reads `.env.local`. In browser: `http://EC2_IP:3001/api/health` — should return OK and DB status.

### 4.6 Serve frontend + API behind one port (optional, for “one server” setup)

Option A — **Same machine, Nginx** (recommended for production):

- Nginx listens on 80 (and 443 if you add SSL).
- `/` → serve static files from `~/vinciUI/dist` (from `npm run build`).
- `/api` → proxy to `http://127.0.0.1:3001`.

Option B — **PM2 + serve (quick)**:

```bash
sudo npm install -g pm2 serve
cd ~/vinciUI
pm2 start server.js --name vinci-api
pm2 start serve dist -n vinci-web -- --listen 5173
pm2 save && pm2 startup
```

Then open `http://EC2_IP:5173` for the app and `http://EC2_IP:3001` for the API. Set `FRONTEND_ORIGIN=http://EC2_IP:5173` and `API_BASE_URL=http://EC2_IP:3001` so OAuth works.

For a single URL, use Nginx (Option A) so both app and API are under one host.

---

## 5. Nginx one-liner config (single EC2, one domain or IP)

Create `/etc/nginx/sites-available/vinciui`:

```nginx
server {
    listen 80;
    server_name _;   # or your domain

    # Frontend (Vite build)
    root /home/ubuntu/vinciUI/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
}
```

Then:

```bash
sudo ln -sf /etc/nginx/sites-available/vinciui /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Set on EC2:

- `API_BASE_URL=http://EC2_IP` (or `https://yourdomain.com` when you have SSL)
- `FRONTEND_ORIGIN=http://EC2_IP` (same if app and API share origin)

Google redirect URI: `http://EC2_IP/api/auth/callback`.

---

## 6. Load env in production

Backend loads **`.env.local`** only. On EC2, create `~/vinciUI/.env.local` with your production values (same keys as local dev). Do not commit it; it’s in `.gitignore`.

---

## 7. Checklist before going live

- [ ] `DATABASE_URL` has **percent-encoded** password (`#` → `%23`, `%` → `%25`).
- [ ] Google OAuth redirect URI = `{API_BASE_URL}/api/auth/callback`.
- [ ] `API_BASE_URL` and `FRONTEND_ORIGIN` match how users reach the app (same host or separate).
- [ ] Frontend build has correct API URL: build with `VITE_API_URL=https://your-api-url` (or same origin if proxied).
- [ ] DB migration runs on startup (your server.js already does this).
- [ ] Promote your user to developer: `npx tsx scripts/create-developer.ts your@email.com` (run once from your machine with same `DATABASE_URL` or from EC2 with env set).

---

## 8. Summary

| Topic | Action |
|-------|--------|
| **Supabase password with `#`** | Use percent-encoding in `DATABASE_URL`: `#` → `%23`, `%` → `%25`. |
| **Auth** | Google only; Supabase = DB only. |
| **EC2 quick** | Node 20 → clone → `npm install` → `npm run build` → set env (encoded `DATABASE_URL`, Google, Gemini, JWT, `API_BASE_URL`, `FRONTEND_ORIGIN`) → run `node server.js` (or PM2). |
| **Single server** | Nginx: serve `dist/` on `/`, proxy `/api` to port 3001; set OAuth redirect to `http://EC2_IP/api/auth/callback`. |

Once this is done, you can add a domain and HTTPS (e.g. Certbot) and switch `API_BASE_URL` / `FRONTEND_ORIGIN` to `https://...`.
