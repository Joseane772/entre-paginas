# Deploying to Vercel (free plan) with Neon Postgres

The Vercel Hobby plan is for non-commercial use, which fits while this is a proof of concept.
Before BookBox takes payments, move to Vercel Pro or another host. The Docker image in this repo
runs anywhere, so you're not tied to Vercel.

## One-time setup

1. **Vercel project.** On vercel.com, use *Add New → Project* and import the GitHub repo
   (framework: Next.js, settings unchanged). Or from this folder: `npx vercel link`.
2. **Database.** In the project, open *Storage → Create Database → Neon* (free plan) and connect
   it to all environments. This adds `DATABASE_URL` to the project.
3. **Load the catalogue** into the new (empty) database, from this folder:

   ```bash
   npx vercel env pull .env.vercel        # gets DATABASE_URL
   DATABASE_URL="$(grep ^DATABASE_URL= .env.vercel | cut -d= -f2- | tr -d '"')" npm run db:load-snapshot
   ```

   (Needs Docker locally, for `psql`.) Skip this to start with an empty catalogue.
4. **Environment variables** (*Settings → Environment Variables*):

   | Name | Value |
   | --- | --- |
   | `BETTER_AUTH_SECRET` | output of `openssl rand -base64 32` |
   | `ADMIN_EMAILS` | your email, so your account becomes admin |
   | `DATA_USER_AGENT` | `EntrePaginas/0.1 (+https://<your-site>.vercel.app)` |
   | `TMDB_READ_TOKEN`, `GOOGLE_BOOKS_API_KEY`, `GOOGLE_CLIENT_ID`/`SECRET`, `SMTP_URL`, `MAIL_FROM` | optional |

   `BETTER_AUTH_URL` can stay unset: the production URL is picked up from Vercel.
5. **Deploy.** Push to `main` (or `npx vercel --prod`). Each build runs the database migrations
   first (`vercel.json`), then `next build`.

## Notes

- Use Neon's **pooled** connection string (host contains `-pooler`); `src/db/index.ts` turns off
  prepared statements for it and keeps each function's pool small.
- Free Neon databases pause when idle, so the first request after a while is slower.
- Google sign-in: add `https://<your-site>.vercel.app/api/auth/callback/google` as an authorised
  redirect URI.
