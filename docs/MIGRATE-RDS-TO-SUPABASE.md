# Migrate VinciUI from AWS RDS to Supabase

You’re currently on **AWS RDS** (PostgreSQL) and want to move this project to **Supabase**. There’s not much data, so you can either start fresh or copy data once.

**Context:** For *this* project you’re standardizing on Supabase. For *other* projects you’ll use EC2 for backend and DB; this guide is only for moving VinciUI from RDS → Supabase.

---

## Option A — Fresh start (recommended if data doesn’t matter)

Fastest path: new Supabase DB, app creates tables on first run.

1. **Create a Supabase project**
   - [Supabase Dashboard](https://supabase.com/dashboard) → New project.
   - Set a strong database password (if it contains `#` or `%`, you’ll percent-encode it in the URL later).

2. **Get the connection string**
   - Project Settings → Database → Connection string → **URI**.
   - Copy the URI. It looks like:
     `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - If your password has special characters, encode them in the **password part only**:
     - `#` → `%23`
     - `%` → `%25`
     - `@` → `%40`
   - Use the **direct** (non-pooler) host/port if you prefer (e.g. port 5432); the app uses a single connection pool.

3. **Point the app to Supabase**
   - In `.env.local` (and on EC2 when you deploy), set:
     ```env
     DATABASE_URL=postgresql://postgres.[ref]:YOUR_ENCODED_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres
     ```
   - Remove or stop using the old RDS URL.

4. **Run the app**
   - Start the backend (`node server.js`). On startup it runs `migrateDatabase()`, which creates/updates:
     - `users`
     - `user_usage`
     - `moderation_logs`
   - No manual schema export from RDS needed.

5. **Re-create your own user**
   - Sign in once with Google so your user exists in Supabase.
   - Promote yourself to developer:
     ```bash
     npx tsx scripts/create-developer.ts your@gmail.com
     ```
   - Use the same `DATABASE_URL` (Supabase) when running the script (e.g. from your machine with `.env.local` pointing to Supabase).

**Result:** VinciUI now uses Supabase only. Old RDS can be decommissioned when you’re sure you don’t need it.

---

## Option B — Copy existing data from RDS to Supabase

Use this only if you need to keep current users/usage/moderation logs.

1. **Create Supabase project** (same as Option A step 1).

2. **Export from RDS**
   - From a machine that can reach RDS (or a one-off EC2/bastion):
     ```bash
     PGPASSWORD='rds_password' pg_dump -h your-rds-endpoint -U postgres -d postgres \
       -t users -t user_usage -t moderation_logs \
       --no-owner --no-acl -F c -f vinciui_rds.dump
     ```
   - Or schema + data as SQL:
     ```bash
     pg_dump -h your-rds-endpoint -U postgres -d postgres \
       -t users -t user_usage -t moderation_logs \
       --no-owner --no-acl -f vinciui_rds.sql
     ```

3. **Create schema on Supabase**
   - Let the app create tables: point `DATABASE_URL` at Supabase and start the server once so `migrateDatabase()` runs, then stop it.
   - Or run the schema yourself: the tables are defined in `api/utils/database.js` (`initializeDatabase()`). You can run that once or paste the `CREATE TABLE` statements in Supabase SQL editor.

4. **Import data**
   - If you used custom format (`.dump`):
     ```bash
     pg_restore -h db.xxxx.supabase.co -p 5432 -U postgres -d postgres --no-owner --no-acl -d postgres vinciui_rds.dump
     ```
   - If you used SQL (`.sql`), in Supabase SQL editor you can run the `INSERT` parts (or the full file if it’s clean). Fix any sequence/ID conflicts if needed.

5. **Point app to Supabase**
   - Set `DATABASE_URL` in `.env.local` (and on EC2) to the Supabase URI (with encoded password). Restart the app.

6. **Verify**
   - Sign in, check profile and usage. Promote yourself to developer again if needed:
     ```bash
     npx tsx scripts/create-developer.ts your@gmail.com
     ```

---

## Summary

| Situation | What to do |
|----------|------------|
| No need to keep RDS data | **Option A**: New Supabase project → set `DATABASE_URL` (encoded password) → run app → sign in → run `create-developer.ts`. |
| Need to keep users/data | **Option B**: New Supabase → export from RDS (`pg_dump`) → create schema on Supabase → import data → set `DATABASE_URL` → verify. |

After migration, your **backend** can still run on EC2; only the **database** moves from RDS to Supabase. Deploy the app on EC2 as in [DEPLOY-EC2-SUPABASE.md](./DEPLOY-EC2-SUPABASE.md), with `DATABASE_URL` pointing at Supabase.
