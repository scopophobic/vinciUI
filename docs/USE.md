# VinciUI — Project Guide & Usage

This document describes what VinciUI is, how to run it, and how to use the **tester**, **developer**, and **admin**-style features (tiers and promotion scripts).

---

## What Is VinciUI?

**VinciUI** is a **node-based AI image generation** app. You build a visual graph of nodes (prompts, images, generators) and generate images using **Google Gemini** (2.5 Flash and 2.0 Flash). Key features:

- **Nodes**: Prompt, Image Input, Generator, Output
- **Generator node**: Model choice, seed lock, auto-refine prompt, “Refine with AI” Q&A, generate button
- **Output node**: Shows the generated image, can be connected as **image input** to another Generator (iterative refinement)
- **Auth**: Google OAuth; JWT in cookie + optional `Authorization: Bearer` header
- **Tiers**: Free, Premium, Tester, Developer — with different rate limits and privileges

---

## Tech Stack

| Layer      | Stack |
|-----------|--------|
| Frontend  | React 18, React Flow, Vite, TypeScript, Tailwind |
| Backend   | Express 5 (Node.js), JWT, cookie-parser |
| Database  | PostgreSQL (e.g. Supabase) |
| AI        | Google Gemini (image generation + text for prompt refinement) |

---

## Prerequisites

- **Node.js** v16+
- **npm** or **yarn**
- **PostgreSQL** (e.g. Supabase) — connection string in `DATABASE_URL`
- **Google Cloud**:
  - OAuth: Client ID + Client Secret (for login)
  - Gemini API key (for image generation and prompt refinement)

---

## Environment Variables

Use a single file **`.env.local`** in the project root. The backend loads it via `dotenv.config({ path: '.env.local' })`.

### Frontend (Vite, optional in dev if backend proxies)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend base URL (e.g. `http://localhost:3001` in dev) |
| `VITE_GEMINI_API_KEY` | (Optional) If you ever call Gemini from client |
| `VITE_GOOGLE_CLIENT_ID` | (Optional) If you use Google SDK on client |

### Backend (required for full functionality)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Supabase) |
| `JWT_SECRET` | Secret for signing JWTs |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `FRONTEND_ORIGIN` | Allowed CORS origin (e.g. `http://localhost:5173` in dev) |
| `API_BASE_URL` | (Optional) Public backend URL for OAuth redirects (e.g. in production) |

Example (values are placeholders):

```env
# Frontend
VITE_API_URL=http://localhost:3001

# Backend
DATABASE_URL=postgresql://user:password@host:5432/postgres
JWT_SECRET=your-secret
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GEMINI_API_KEY=xxx
FRONTEND_ORIGIN=http://localhost:5173
API_BASE_URL=
```

---

## How to Start the Project

### 1. Install dependencies

```bash
cd vinciUI
npm install
```

### 2. Configure environment

- Copy or create `.env.local` in the project root with the variables above.
- Ensure `DATABASE_URL` is set so the backend can run migrations and the scripts can connect.

### 3. Database

Tables are created/updated automatically when the backend starts (migration runs on startup). To initialize or reset the schema manually you can use (if you have an `init-db` script that uses the same schema):

```bash
npx tsx scripts/init-db.ts
```

(Requires `DATABASE_URL` in `.env.local` or environment.)

### 4. Run backend and frontend

**Option A — Both together (recommended for dev):**

```bash
npm run dev:full
```

This runs:

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

**Option B — Separate terminals:**

```bash
# Terminal 1 — Backend
npm run backend

# Terminal 2 — Frontend
npm run dev
```

Then open **http://localhost:5173**, sign in with Google, and use the canvas.

### 5. Production build

```bash
npm run build
```

Serve the `dist/` folder with any static host; point `VITE_API_URL` (and optionally `FRONTEND_ORIGIN` / `API_BASE_URL`) to your production backend URL.

---

## Tester, Developer & Tier System (Admin-Style Features)

VinciUI has **user tiers** stored in the database. They control **rate limits** and **privileges**. There is **no in-app admin UI**; you change tiers by running **CLI scripts** (or by updating the DB directly).

### Tiers

| Tier        | Image generations (per day) | Prompt enhancements (per day) | Content moderation | Notes |
|------------|-----------------------------|--------------------------------|--------------------|--------|
| **free**   | 2 (lifetime cap)             | 5                              | Applied            | Default for new users |
| **premium**| 100                         | 200                            | Applied            | Paid/premium users |
| **tester** | 50                          | 100                            | Applied            | For testers |
| **developer** | 1000                     | 1000                           | **Bypassed**       | For you / internal dev |

- **Free**: 2 total image generations ever (no daily reset).
- **Developer**: Bypasses content moderation; higher limits for testing.

### How to add a tester

1. The user must have signed in at least once (so they exist in `users`).
2. From the project root, with `DATABASE_URL` available (e.g. from `.env.local`):

```bash
npx tsx scripts/create-tester.ts tester-email@example.com
```

This script:

- Finds the user by email
- Sets `tier = 'tester'`
- Sets their `user_usage.daily_limit` to 50

After running, the user refreshes the app to see **tester** tier and the new limits.

### How to make yourself (or someone) a developer

1. The user must have signed in at least once.
2. From the project root:

```bash
npx tsx scripts/create-developer.ts your-email@gmail.com
```

This script:

- Finds the user by email
- Sets `tier = 'developer'`
- Sets `user_usage.daily_limit` to 1000

**Developer** tier gets:

- 1000 image generations per day
- 1000 prompt enhancements per day
- **Content moderation bypass**
- In the UI: “Developer privileges” section in the profile dropdown

There is **no separate “admin” role**; “developer” is the highest privilege tier used for admins/developers.

### Scripts summary

| Script | Purpose |
|--------|--------|
| `scripts/create-tester.ts <email>` | Promote a user to **tester** (50 img/day, 100 enhancements/day). |
| `scripts/create-developer.ts <email>` | Promote a user to **developer** (1000/1000, moderation bypass). |
| `scripts/init-db.ts` | Initialize database tables (if you use this script in your setup). |

All scripts that need the DB expect **`DATABASE_URL`** (e.g. in `.env.local`). Run them from the **project root**. If a script doesn’t load `.env.local` by default, set `DATABASE_URL` in the environment or add `dotenv` to that script.

### Database schema (tiers)

- **`users`**: has `tier` — `VARCHAR` with `CHECK (tier IN ('free', 'premium', 'tester', 'developer'))`, default `'free'`.
- **`user_usage`**: stores `images_generated`, `prompts_enhanced`, `daily_limit`, `reset_time` per user.

To change someone’s tier by hand (e.g. to “premium” or back to “free”):

```sql
UPDATE users SET tier = 'premium', updated_at = NOW() WHERE email = 'user@example.com';
```

---

## API Endpoints (reference)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | API info and endpoint list |
| GET | `/api/health` | No | Health + DB connectivity |
| GET | `/api/auth/google` | No | Start Google OAuth |
| GET | `/api/auth/callback` | No | OAuth callback (redirects to frontend) |
| GET | `/api/auth/me` | Yes | Current user + usage |
| GET | `/api/auth/debug` | No | Debug token/cookie presence (non-sensitive) |
| POST | `/api/auth/logout` | No | Clear auth cookie |
| POST | `/api/generate/image` | Yes | Generate image (prompt, optional `images[]`, `model`, `seed`) |
| POST | `/api/generate/refine` | Yes | Refine prompt (`mode`: auto / questions / apply) |

Auth: cookie `auth_token` or header `Authorization: Bearer <token>`.

---

## Deploy (Nginx example)

A sample Nginx config for the backend is in **`deploy/nginx-vinci-api.conf`**:

- Listens on port 80 for `api.vinci.scopophobic.xyz`
- Proxies to `http://127.0.0.1:3001`
- Sets `X-Forwarded-*` headers

After placing the config:

```bash
sudo ln -sf /etc/nginx/sites-available/vinci-api /etc/nginx/sites-enabled/vinci-api
sudo nginx -t && sudo systemctl reload nginx
# Then TLS, e.g.:
sudo certbot --nginx -d api.vinci.scopophobic.xyz
```

Set **`API_BASE_URL`** and **`FRONTEND_ORIGIN`** in production so OAuth redirects and CORS work.

---

## Quick reference: scripts and tiers

- **Start app (dev):** `npm run dev:full`
- **Backend only:** `npm run backend` (port 3001)
- **Frontend only:** `npm run dev` (port 5173)
- **Add tester:** `npx tsx scripts/create-tester.ts <email>`
- **Add developer:** `npx tsx scripts/create-developer.ts <email>`
- **Tiers:** free (default) → tester / premium / developer via scripts or DB.

For more product and setup detail, see **README.md**.
