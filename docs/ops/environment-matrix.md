# Environment Matrix

This file is the durable source of truth for the Beerolog launch environment contract. Variable names, ownership, format expectations, and configuration locations are listed here without live secret values.

| System | Variable | Required | Format / allowed values | Owner | Where configured | Notes |
|---|---|---|---|---|---|---|
| Web | `VITE_API_URL` | yes | Full URL, e.g. `https://beerolog-api.up.railway.app` | operator | Vercel env vars | Must match the Railway API public URL |
| Web | `VITE_CLERK_PUBLISHABLE_KEY` | yes | `pk_test_...` (dev) / `pk_live_...` (prod) | operator | Vercel env vars | Obtained from Clerk Dashboard → API Keys |
| API | `APP_ENV` | yes | `development` / `production` | operator | Railway env vars | Controls startup validation strictness |
| API | `DATABASE_URL` | yes | PostgreSQL connection string (pooled) | operator | Railway env vars | Neon pooled connection string |
| API | `OPENAI_API_KEY` | yes | `sk-...` | operator | Railway env vars | OpenAI secret key |
| API | `CLERK_SECRET_KEY` | yes | `sk_test_...` (dev) / `sk_live_...` (prod) | operator | Railway env vars | Obtained from Clerk Dashboard → API Keys |
| API | `CLERK_PUBLISHABLE_KEY` | yes | `pk_test_...` (dev) / `pk_live_...` (prod) | operator | Railway env vars | Used to derive the Clerk JWKS URL for token verification |
| API | `CORS_ALLOWED_ORIGINS` | yes | Comma-separated origin URLs | operator | Railway env vars | Must include each Vercel origin (production + supported preview) |
| API | `LOG_LEVEL` | no | `DEBUG` / `INFO` / `WARNING` / `ERROR` | operator | Railway env vars | Default `INFO`; use `DEBUG` temporarily when diagnosing issues |
| API | `API_SECRET` | yes | Random hex string, min 32 chars | operator | Railway env vars | `openssl rand -hex 32`; used to sign QR tokens — must not be the default |
| Clerk | Google OAuth credentials | yes (prod) | Client ID + client secret from Google Cloud Console | operator | Clerk Dashboard → Social connections | Not required for development instances |
| Clerk | Apple OAuth credentials | yes (prod) | Services ID, Team ID, Key ID, private key | operator | Clerk Dashboard → Social connections | Not required for development instances |
| Clerk | Facebook OAuth credentials | yes (prod) | App ID + app secret from Meta for Developers | operator | Clerk Dashboard → Social connections | Not required for development instances |
| Clerk | Instagram OAuth credentials | yes (prod) | App ID + app secret from Meta for Developers | operator | Clerk Dashboard → Social connections | Not required for development instances |
| Clerk | Allowed origins | yes (prod) | Full origin URLs | operator | Clerk Dashboard → Domains → Allowed origins | Must include every supported Vercel origin |
