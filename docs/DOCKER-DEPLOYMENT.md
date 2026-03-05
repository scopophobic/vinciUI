# Docker Deployment for VinciUI (Multi‑Project EC2 Setup)

This guide explains how to run **VinciUI’s backend** in Docker and how it fits into your plan of using **one EC2 server for multiple projects**.

The pattern is:

- One EC2 → many Docker containers (one per project API).
- A shared Docker network (e.g. `web`) so a reverse proxy (nginx/Traefik) can route traffic to the right container.
- Supabase is the database (managed), not a container.

---

## 1. What this Docker setup covers

- **VinciUI backend only** (`server.js` on port `3001`).
  - Frontend can stay on Vercel, another host, or be served by an Nginx/reverse‑proxy in front of this container.
- Uses your existing **`.env.local`** for configuration:
  - `DATABASE_URL` (Supabase)
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - `GEMINI_API_KEY`
  - `JWT_SECRET`
  - `API_BASE_URL`, `FRONTEND_ORIGIN`, `NODE_ENV`, etc.
- Designed to work well in a **multi‑project** layout where each project is one container, and a separate reverse‑proxy container (or host Nginx) is in front.

Files added for Docker:

- `Dockerfile` – how to build the VinciUI API image.
- `.dockerignore` – keeps the image small (ignores `node_modules`, `dist`, git, logs, etc.).
- `docker-compose.yml` – how to run the VinciUI API container on EC2 and attach it to a shared `web` network.

---

## 2. Dockerfile overview

Located at project root: `Dockerfile`

```Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies (production only)
COPY package*.json ./
RUN npm install --only=production

# Copy application source
COPY . .

# The API listens on port 3001
EXPOSE 3001

# Default environment configuration
ENV NODE_ENV=production

# Start the Express backend
CMD ["node", "server.js"]
```

Key points:

- Uses **Node 20 alpine** (small, stable).
- Installs only **production dependencies** (`npm install --only=production`).
- Assumes `server.js` is the entrypoint and listens on **port 3001** (this is already true).
- `NODE_ENV=production` by default in the container.

> Note: secrets are **not baked** into the image – they come from `.env.local` via `docker-compose.yml`.

---

## 3. docker-compose.yml overview

At project root: `docker-compose.yml`

```yaml
version: "3.9"

services:
  vinci-api:
    build: .
    container_name: vinci-api
    restart: always
    # Expose the API on host port 3001
    ports:
      - "3001:3001"
    # Load environment from your existing .env.local
    env_file:
      - .env.local
    networks:
      - web

networks:
  # Shared network for reverse proxy + multiple project APIs
  web:
    external: true
```

What this does:

- Builds the **VinciUI API image** from the `Dockerfile`.
- Binds container port **3001** to host port **3001**.
- Loads environment variables from `.env.local` (you already use this locally).
- Joins the external `web` network so a reverse proxy (and other project containers) can talk to it by name `vinci-api`.

> The `web` network is marked `external: true`, which means you create it once on the EC2 host and reuse it across projects.

Create the network on the server:

```bash
docker network create web
```

You only do this once per EC2 instance.

---

## 4. Building and running VinciUI in Docker (locally or on EC2)

From the project root (`vinciUI/`):

### 4.1 Prepare `.env.local`

Make sure `.env.local` exists and has **production‑ready values**, especially:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:ENCODED_PASSWORD@db.xxxx.supabase.co:5432/postgres
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GEMINI_API_KEY=...
JWT_SECRET=...
API_BASE_URL=https://api.yourdomain.com      # or http://YOUR_EC2_IP
FRONTEND_ORIGIN=https://app.yourdomain.com   # or http://YOUR_EC2_IP
```

> For Supabase: remember to **percent‑encode** special characters in the password (`#` → `%23`, `%` → `%25`, etc.). See `DEPLOY-EC2-SUPABASE.md` for details.

### 4.2 Build the image

```bash
docker compose build
```

This builds the `vinci-api` image using the `Dockerfile`.

### 4.3 Run the container

```bash
docker compose up -d
```

This:

- Starts the container `vinci-api`.
- Binds `3001` on the host → `3001` inside the container.
- Reads `.env.local` for all config.

Check it:

```bash
curl http://localhost:3001/api/health
```

On EC2 you’d use the server’s IP or domain instead of `localhost` (unless you’re curling from inside the machine).

View logs:

```bash
docker compose logs -f
```

Stop:

```bash
docker compose down
```

---

## 5. Using one EC2 for multiple project servers

With Docker, your EC2 layout can look like this:

```text
[EC2 instance]
  ├─ reverse-proxy container (nginx/traefik)  → listens on :80 / :443
  ├─ vinci-api container                      → port 3001, name: vinci-api
  ├─ another-api container                    → port 4001, name: another-api
  ├─ ...
  └─ all containers share Docker network 'web'
```

### 5.1 Reverse proxy idea (high-level)

You can run one nginx/traefik container attached to the same `web` network and route domains to your APIs:

```nginx
server {
  listen 80;
  server_name api.vinci.yourdomain.com;

  location / {
    proxy_pass http://vinci-api:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  server_name api.other.yourdomain.com;

  location / {
    proxy_pass http://another-api:4001;
    # same headers...
  }
}
```

Because all services are on the `web` network, nginx can reach them by **container name** (`vinci-api`, `another-api`, etc.).

### 5.2 Frontends

You have options for frontends (VinciUI React app):

- Host on **Vercel** (simple, auto‑deploy from GitHub) and point it to your Dockerized API.
- Or serve the built `dist/` files behind the same reverse proxy (e.g. Nginx serving static files on `/`, proxy `/api` to `vinci-api`). This can be in a separate container or on the host, as described in `DEPLOY-EC2-SUPABASE.md`.

The Docker setup here focuses on the **API server**; frontends can be deployed independently.

---

## 6. Typical EC2 flow with Docker

On a **fresh EC2** (Ubuntu) where Docker is installed:

```bash
# One-time: create shared network
docker network create web

# Clone project
git clone <your-repo-url> vinciUI
cd vinciUI

# Copy/create .env.local with production values
nano .env.local

# Build and run
docker compose build
docker compose up -d

# Check health
curl http://YOUR_EC2_IP:3001/api/health
```

If you later update code:

```bash
git pull
docker compose build
docker compose up -d
```

Docker will recreate the `vinci-api` container with the new code.

---

## 7. Summary

- **Dockerfile**: packages VinciUI backend as a reusable image.
- **docker-compose.yml**: runs the backend with `.env.local` and attaches to a shared `web` network.
- **Supabase** remains your DB; not containerized here.
- **Reverse proxy** (nginx/traefik) + Docker networks let one EC2 host **multiple project servers** cleanly.

Use this project’s Docker setup as a template for your future APIs: copy the same pattern (Dockerfile + docker‑compose + shared `web` network) for each new repo, and they can all live on the same EC2 box behind one proxy.

