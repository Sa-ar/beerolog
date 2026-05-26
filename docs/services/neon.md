# Neon PostgreSQL

## Create a project

1. [neon.tech](https://neon.tech) → New project
2. Project name: `beerolog`
3. PostgreSQL version: 16
4. Region: closest to Railway region (e.g. `us-east-1`)
5. **Create project**

## Get the connection string

Neon dashboard → Connection details → copy the **pooled connection string** (uses PgBouncer, better for serverless):

```
postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Set this as `DATABASE_URL` in `apps/api/.env`.

## Run migrations

From the monorepo root:

```bash
pnpm db:generate   # generate migration SQL from schema changes
pnpm db:migrate    # apply pending migrations to the database
```

Run `db:migrate` whenever:
- Setting up a fresh database
- After pulling changes that modified `packages/db/src/schema.ts`
- After changing the supported MVP persistence tables (`users`, `user_profiles`, `beer_ratings`, `user_style_suppressions`)

## Branches (optional)

Neon supports database branching. Create a `dev` branch for local development to avoid touching production data:

1. Neon dashboard → Branches → **New branch**
2. Name: `dev`, branch from `main`
3. Use the `dev` branch connection string in `apps/api/.env`
