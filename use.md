# VinciUI -- Complete Project Reference

## What Is VinciUI

VinciUI is a **node-based AI image generation** tool. You build visual pipelines on a canvas by connecting nodes -- prompt, image input, generator, output -- and the system calls Google Gemini models to produce images. The core idea is **iterative refinement**: the output of one generation can be fed as input into another generator, letting you evolve an image step by step without leaving the canvas.

**Live deployment:**
- Frontend: `vinciui.vercel.app`
- Backend: `ec2-51-20-72-178.eu-north-1.compute.amazonaws.com`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Flow 11, Tailwind CSS 3, Vite 5 |
| Backend | Express 5 (ESM), Node.js |
| Database | PostgreSQL (AWS RDS) |
| Auth | Supabase Auth (email/password + Google OAuth via Supabase), JWT verified by backend |
| AI | Google Gemini API (2.5 Flash, 2.0 Flash Legacy) |
| Deployment | Vercel (frontend), AWS EC2 (backend), AWS RDS (database) |

---

## Project Structure

```
vinciUI/
├── server.js                        # Express backend (single-file server)
├── package.json                     # Dependencies & scripts
├── vite.config.ts                   # Vite config
├── tailwind.config.js               # Tailwind config
├── tsconfig.json                    # TypeScript config (strict mode)
├── .env.local                       # Environment variables (not committed)
│
├── src/
│   ├── App.tsx                      # Main app -- React Flow canvas, node wiring, generation logic
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Tailwind imports
│   │
│   ├── nodes/
│   │   ├── PromptNode.tsx           # Text prompt input node
│   │   ├── ImageInputNode.tsx       # File upload image input node
│   │   ├── GeneratorNode.tsx        # Central hub -- model select, seed, refine, generate
│   │   └── OutputNode.tsx           # Displays generated image, acts as source for chaining
│   │
│   ├── components/
│   │   ├── LandingPage.tsx          # Public landing page
│   │   └── Auth/
│   │       ├── LoginPage.tsx        # Supabase sign-in (email/password + Google OAuth)
│   │       └── UserProfile.tsx      # User avatar, tier badge, usage stats, sign out
│   │
│   ├── lib/
│   │   └── supabase.ts              # Supabase client (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   │
│   ├── context/
│   │   └── AuthContext.tsx           # Auth state (Supabase session + backend user tier/usage)
│   │
│   ├── services/
│   │   └── api.ts                   # Centralized API client (generateImage, refinePrompt, auth)
│   │
│   └── utils/
│       └── wordDiff.ts              # Word-level diff for prompt history visualization
│
├── api/
│   ├── middleware/
│   │   ├── auth.js                  # Supabase JWT verification + sync user to DB
│   │   ├── rateLimit.js             # Per-tier rate limiting middleware
│   │   └── contentModeration.js     # Keyword/pattern content filter
│   │
│   └── utils/
│       └── database.js              # PostgreSQL pool, table init, CRUD, migrations
│
└── scripts/
    ├── create-tester.ts             # Promote a user to tester tier
    └── create-developer.ts          # Promote a user to developer tier
```

---

## How to Start the Project

### Prerequisites

- **Node.js** v16+
- **npm**
- **PostgreSQL** database (e.g. Supabase Postgres for DB + Auth)
- **Supabase project** (for Auth and optionally DB)
- **Google Gemini API key** (for image generation; Tier 1+ for Gemini 2.5 Flash)

### 1. Install Dependencies

```bash
cd vinciUI
npm install
```

### 2. Configure Environment Variables (Dev vs Production)

VinciUI is set up so you **never need to edit env values when switching between development and production**:

- **Local development** uses a `.env.local` file (loaded only when `NODE_ENV !== 'production'`).  
- **Production** reads real environment variables from the host (Vercel, EC2, Render, etc.) and **does not** read `.env.local`.

#### 2.1 Local Development (`.env.local`)

Create a `.env.local` file in the project root **for development only**:

```env
# --- Frontend (VITE_ prefix exposes to browser) ---
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_dev_gemini_key
VITE_API_URL=http://localhost:3001

# --- Backend (server-side only) ---
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
GEMINI_API_KEY=your_dev_gemini_key

# Local URLs for dev
API_BASE_URL=http://localhost:3001
FRONTEND_ORIGIN=http://localhost:5173
```

> **Note:** Do **not** set `NODE_ENV` in `.env.local`. Vite will manage its own mode; the backend checks `process.env.NODE_ENV !== 'production'` to decide whether to load `.env.local`.

#### 2.2 Production (Vercel + Backend Host)

In production you configure **environment variables in the hosting dashboards**, not in `.env.local`:

- **Frontend (Vercel) env vars:**
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `VITE_GEMINI_API_KEY`
  - `VITE_API_URL` → e.g. `https://your-backend-domain.com`

- **Backend (EC2 / Render / other) env vars:**
  - `DATABASE_URL` → production Postgres (e.g. Supabase connection string)
  - `SUPABASE_JWT_SECRET` → from Supabase Project Settings → API → JWT Secret
  - `GEMINI_API_KEY` → production Gemini key
  - `API_BASE_URL` → e.g. `https://your-backend-domain.com`
  - `FRONTEND_ORIGIN` → e.g. `https://vinciui.vercel.app`
  - `NODE_ENV=production`

The backend now behaves like this:

- If `NODE_ENV === 'production'` → **does not read `.env.local`**, only real env vars.  
- If `NODE_ENV !== 'production'` → loads `.env.local` for convenient local dev.

#### 2.3 Supabase setup (required for auth)

1. **Create a project** at [supabase.com](https://supabase.com) → New project.
2. **Get URL and anon key:** Project Settings → API → Project URL and `anon` `public` key. Put them in `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Get JWT secret:** Project Settings → API → JWT Settings → JWT Secret. Put it in `.env.local` as `SUPABASE_JWT_SECRET` (backend only; never expose this in the frontend).
4. **Database:** Use the same Supabase project’s Postgres (or a separate DB). Connection string: Project Settings → Database → Connection string (URI). Use this as `DATABASE_URL` for the backend.
5. **Redirect URL for OAuth (e.g. Google):** Authentication → URL Configuration → Redirect URLs. Add `http://localhost:5173` for dev and `https://your-production-domain.com` for production. Supabase will redirect here after sign-in.
6. **Enable providers:** Authentication → Providers → enable Email and optionally Google (follow Supabase docs to add Google OAuth credentials).

#### 2.4 Where to get other variables

| Variable | Source |
|----------|--------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection string (or any Postgres URI) |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Settings → API → JWT Secret |

### 3. Start Development

**Both frontend + backend together:**

```bash
npm run dev:full
```

This runs `concurrently` to start:
- Vite dev server on `http://localhost:5173` (frontend)
- Express server on `http://localhost:3001` (backend)

**Or run them separately:**

```bash
# Terminal 1 -- backend
npm run backend

# Terminal 2 -- frontend
npm run dev
```

### 4. First-Time Database Setup

The database tables are auto-created on server startup via `migrateDatabase()`. No manual SQL needed. Tables created:

- **`users`** -- id, supabase_user_id (or google_id for legacy), email, name, picture, tier, timestamps
- **`user_usage`** -- per-user-per-day generation and enhancement counts
- **`moderation_logs`** -- blocked/flagged prompt history

### 5. Open the App

Go to `http://localhost:5173`. You'll see the landing page. Click "Enter Workshop", then sign in with email/password or "Continue with Google" (if enabled in Supabase).

### 6. Build for Production

```bash
npm run build
```

Output goes to `dist/`. Frontend is static and can be deployed to Vercel, Netlify, etc. Backend runs as a standalone Node process.

---

## Node System

The canvas has four node types. You drag them onto the canvas and connect them with edges.

### Prompt Node (blue)
- A textarea where you type your image prompt.
- Has a **source** handle on the right.
- Connect it to a Generator's **prompt** input (blue dot on left).

### Image Input Node (green)
- Click to upload an image file from your computer.
- Has a **source** handle on the right.
- Connect it to a Generator's **image** input (green dot on left).

### Generator Node (purple)
The central control hub. Features:

- **Model selector** -- choose between Gemini 2.5 Flash (multi-image) or Gemini 2.0 Flash Legacy (single-image).
- **Seed control** -- set a specific seed number, lock it for reproducible results, or randomize with the dice button.
- **Auto-refine toggle** -- when enabled, the system silently improves your prompt with visual details before generating (uses Gemini text model).
- **Refine with AI** button -- opens an interactive Q&A dialog where AI asks clarifying questions about style, mood, composition, etc. You pick answers and the prompt gets rewritten.
- **Generate** button -- triggers image generation. Automatically creates an Output Node (or updates the existing one connected to this generator).
- **Prompt history** -- collapsible panel showing all iteration versions with word-level diffs (green = added, red strikethrough = removed).

Handles:
- Left side: **prompt** input (blue, top) and **image** input (green, middle). Multiple images OK for Gemini 2.5.
- Right side: **source** output connecting to the auto-spawned Output Node.

### Output Node (orange)
- Displays the generated image.
- Shows the prompt that was used.
- **Download** button to save the image.
- Has **both** a target handle (left, receives from Generator) and a **source** handle (right).
- The source handle is the key to iteration: drag from an Output's right handle into another Generator's image input to use the generated image as a reference for the next generation.

### Iteration Workflow

```
[Prompt] ──→ [Generator] ──→ [Output] ──→ [Generator 2] ──→ [Output 2] ──→ ...
                                ↑
[Image Input] ──────────────────┘
```

You can have **multiple Generator Nodes** on the canvas simultaneously, each with different models, seeds, or prompts.

---

## User Tiers & Rate Limits

The system has four user tiers, enforced by the `rateLimit.js` middleware:

| Tier | Images/Day | Enhancements/Day | Content Moderation | Notes |
|------|-----------|-------------------|-------------------|-------|
| **free** | 2 (lifetime total, not daily) | 5 | Yes | Default for new signups |
| **tester** | 50 | 100 | Yes | For invited testers |
| **premium** | 100 | 200 | Yes | For paying users (not yet active) |
| **developer** | 1000 | 1000 | **Bypassed** | For project developers |

The `tier` column on the `users` table controls this. Allowed values: `free`, `premium`, `tester`, `developer`.

### Free Tier Specifics
- Gets 2 image generations **total** (lifetime cap, not daily reset).
- 5 prompt enhancements per day.
- Credits do **not** reset on the free tier.
- Upgrade notice shown in the user profile dropdown.

### How Rate Limiting Works
1. `authenticateToken` middleware verifies the JWT and attaches `req.user` (with `tier`).
2. `rateLimitMiddleware` looks up the user's cumulative usage from `user_usage` table, compares against the tier's limits, and returns `429` if exceeded.
3. `contentModerationMiddleware` checks the prompt against a keyword blocklist and regex patterns. Developers with `bypassModeration: true` skip this check.

---

## Admin & Tester Management Scripts

There is no admin UI panel. Tier management is done via CLI scripts that directly update the PostgreSQL database.

### Promote a User to Tester

The user must have signed in at least once (so their account exists in the database).

```bash
npx tsx scripts/create-tester.ts user-email@gmail.com
```

This will:
1. Look up the user by email in the `users` table.
2. Set their `tier` to `tester`.
3. Update their `daily_limit` to 50 in `user_usage`.

**Tester privileges:**
- 50 image generations per day
- 100 prompt enhancements per day
- Content moderation still active

### Promote a User to Developer

```bash
npx tsx scripts/create-developer.ts your-email@gmail.com
```

This will:
1. Look up the user by email.
2. Set their `tier` to `developer`.
3. Update their `daily_limit` to 1000 in `user_usage`.

**Developer privileges:**
- 1000 image generations per day
- 1000 prompt enhancements per day
- Content moderation **bypassed**
- Priority API access

### Demoting / Changing Tiers Manually

There's no dedicated script for demoting. Run SQL directly:

```sql
-- Demote to free tier
UPDATE users SET tier = 'free', updated_at = NOW() WHERE email = 'user@example.com';
UPDATE user_usage SET daily_limit = 2, updated_at = NOW()
  WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');

-- Set to premium
UPDATE users SET tier = 'premium', updated_at = NOW() WHERE email = 'user@example.com';
UPDATE user_usage SET daily_limit = 100, updated_at = NOW()
  WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');
```

### Checking a User's Tier

```sql
SELECT email, tier, created_at FROM users ORDER BY created_at DESC;
```

Or hit the debug endpoint (no auth required):

```
GET /api/auth/debug
```

Returns the decoded JWT info and the user's tier from the database (useful for verifying auth is working).

---

## API Endpoints

All endpoints are on the backend (`http://localhost:3001` in dev).

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health info, lists available endpoints |
| GET | `/api/health` | Server + database connectivity check |
| GET | `/api/auth/debug` | Auth diagnostics (Bearer token = Supabase JWT, decoded sub/email, DB user tier) |

### Authenticated (Bearer token = Supabase session access_token)

| Method | Path | Middleware | Description |
|--------|------|------------|-------------|
| GET | `/api/auth/me` | `authenticateToken` | Returns current user info + usage stats (syncs Supabase user to DB) |
| POST | `/api/auth/logout` | -- | No-op (client signs out via Supabase) |
| POST | `/api/generate/image` | `authenticateToken`, `rateLimitMiddleware`, `contentModerationMiddleware` | Generate an image with Gemini |
| POST | `/api/generate/refine` | `authenticateToken`, `rateLimitMiddleware` | Refine a prompt (3 modes) |

### POST `/api/generate/image`

**Body:**
```json
{
  "prompt": "A cat wizard casting a spell",
  "images": ["base64string1", "base64string2"],
  "model": "gemini-2.5-flash-image-preview",
  "seed": 12345
}
```

- `images` -- array of base64 image strings (Gemini 2.5 supports multiple; 2.0 uses only the first).
- `model` -- `gemini-2.5-flash-image-preview` (default) or `gemini-2.0-flash-preview-image-generation` (legacy).
- `seed` -- optional, for reproducible results.

**Response:**
```json
{
  "image": "data:image/png;base64,...",
  "usage": { "imagesGenerated": 3, "promptsEnhanced": 1, "resetTime": "..." }
}
```

### POST `/api/generate/refine`

Three modes controlled by the `mode` field:

**`mode: "auto"`** -- Silent prompt improvement. Takes a basic prompt, adds visual details. Returns `{ "refinedPrompt": "..." }`.

**`mode: "questions"`** -- Generates 3 clarifying questions with preset options. Returns:
```json
{
  "questions": [
    { "question": "What style?", "options": ["Photorealistic", "Anime", "Oil painting"], "answer": "" },
    ...
  ]
}
```

**`mode: "apply"`** -- Rewrites the prompt incorporating the user's answers. Requires `answers` array in the body. Returns `{ "refinedPrompt": "..." }`.

All modes accept optional `referenceImages` array for context.

---

## Authentication Flow (Supabase)

1. User signs in on the login page (email/password or "Continue with Google" via Supabase).
2. Supabase Auth returns a session; the frontend stores it (Supabase client handles persistence).
3. The frontend sends the Supabase session **access_token** in the `Authorization: Bearer <token>` header on every request to the backend.
4. Backend `authenticateToken` middleware verifies the JWT using `SUPABASE_JWT_SECRET`, reads `sub` (Supabase user id) and optional `email` / `user_metadata`.
5. Backend finds or creates a row in `users` by `supabase_user_id` and attaches `req.user` (our DB user id, email, tier).
6. Protected routes use `req.user` for rate limits and usage.

---

## Content Moderation

The `contentModerationMiddleware` runs on the `/api/generate/image` endpoint. It checks prompts against:

1. **Prohibited keywords** -- explicit content, violence, hate speech, drugs (hard block).
2. **Suspicious regex patterns** -- combinations involving minors + sexual terms, requests for illegal content, clothing removal (hard block).

Developers with the `developer` tier bypass moderation entirely.

Blocked requests return a `400` with `code: "PROHIBITED_CONTENT"` or `code: "SUSPICIOUS_PATTERN"`.

---

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key, auto-generated |
| supabase_user_id | VARCHAR(255) | Unique, from Supabase Auth JWT `sub` |
| google_id | VARCHAR(255) | Optional, legacy Google OAuth |
| email | VARCHAR(255) | Unique |
| name | VARCHAR(255) | Display name |
| picture | TEXT | Profile picture URL |
| tier | VARCHAR(50) | `free`, `premium`, `tester`, or `developer` |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

### user_usage
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to users, cascading delete |
| date | DATE | One row per user per day |
| images_generated | INTEGER | Count for this day |
| prompts_enhanced | INTEGER | Count for this day |
| daily_limit | INTEGER | Configured per tier |
| reset_time | TIMESTAMPTZ | When daily limit resets |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

Unique index on `(user_id, date)` for upsert support.

### moderation_logs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK to users |
| prompt | TEXT | The flagged prompt |
| action | VARCHAR(50) | `blocked`, `flagged`, or `approved` |
| reason | TEXT | Optional explanation |
| created_at | TIMESTAMPTZ | Auto |

---

## Environment-Specific Behavior

| Behavior | Development | Production |
|----------|------------|------------|
| CORS origin | `http://localhost:5173` | Value of `FRONTEND_ORIGIN` env var |
| Auth cookie | `httpOnly`, `sameSite: lax`, no `secure` flag | `httpOnly`, `secure`, `sameSite: none`, `domain: .scopophobic.xyz` |
| OAuth callback | Includes JWT in redirect URL for easy testing | Cookie-only, no token in URL |
| API base URL | Derived from request headers | Uses `API_BASE_URL` env var |

---

## Gemini Model Notes

- **Gemini 2.5 Flash** (`gemini-2.5-flash-image-preview`) -- supports multiple input images, higher quality. Requires Tier 1+ API key.
- **Gemini 2.0 Flash** (`gemini-2.0-flash-preview-image-generation`) -- legacy, single image input only. Works with free-tier API keys.

If you only have a free-tier Gemini API key, switch the model to "Gemini 2.0 Flash (Legacy)" in the Generator Node dropdown.

---

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start Vite frontend dev server (port 5173) |
| `backend` | `node server.js` | Start Express backend (port 3001) |
| `dev:full` | `concurrently "npm run backend" "npm run dev"` | Start both simultaneously |
| `build` | `vite build` | Production build to `dist/` |
| `preview` | `vite preview` | Preview production build locally |
| `lint` | `eslint . --ext ts,tsx` | Run ESLint |
