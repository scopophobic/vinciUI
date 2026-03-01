# Supabase Auth — What You Need to Do

VinciUI now uses **Supabase Auth** (email/password + optional Google). Follow these steps.

## 1. Install dependencies

```bash
npm install
```

This installs `@supabase/supabase-js`. All Clerk packages have been removed.

---

## 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**, choose org, name, database password, region.
3. Wait for the project to be ready.

---

## 3. Get Supabase keys and add to `.env.local`

In the Supabase dashboard:

- **Project Settings → API**
  - **Project URL** → use as `VITE_SUPABASE_URL`
  - **Project API keys → anon public** → use as `VITE_SUPABASE_ANON_KEY`
- **Project Settings → API → JWT Settings**
  - **JWT Secret** → use as `SUPABASE_JWT_SECRET` (backend only; do not expose in frontend)

Add to your `.env.local`:

```env
# Frontend (required for Supabase Auth)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Backend (required to verify Supabase JWTs)
SUPABASE_JWT_SECRET=your-jwt-secret-from-dashboard
```

---

## 4. Use Supabase Postgres for the app database (optional)

You can use the same Supabase project’s Postgres for VinciUI’s `users` and `user_usage` tables:

- **Project Settings → Database → Connection string**
- Choose **URI** and copy the connection string (use the one that includes the password).
- Add to `.env.local`:

```env
DATABASE_URL=postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

If you use a different Postgres (e.g. Neon, local), set `DATABASE_URL` to that instead.

---

## 5. Configure redirect URLs (for OAuth and email links)

- **Authentication → URL Configuration**
- **Redirect URLs**: add:
  - `http://localhost:5173` (dev)
  - Your production frontend URL, e.g. `https://vinciui.vercel.app`

---

## 6. Enable auth providers

- **Authentication → Providers**
- **Email**: Enable (default). Users can sign up with email/password.
- **Google** (optional): Enable and add your Google OAuth client ID and secret in the Supabase dashboard so “Continue with Google” works.

---

## 7. Run the app

```bash
npm run dev:full
```

Open `http://localhost:5173` → Enter Workshop → Sign in with email/password or Google.

---

## Summary checklist

- [ ] Supabase project created
- [ ] `.env.local` has `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`
- [ ] `.env.local` has `DATABASE_URL` (Supabase or other Postgres)
- [ ] Redirect URLs include `http://localhost:5173` (and production URL if needed)
- [ ] Email provider enabled; Google optional
- [ ] `npm install` and `npm run dev:full` run without errors

For more detail (production env, tier/usage, scripts), see **use.md**.
