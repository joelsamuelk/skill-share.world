# Replit Database Restore

Use this when you want the deployed app to start with the PostgreSQL data exported from Replit.

## Before deploy

1. Put the dump at `~/Downloads/database_export.sql`, or keep it elsewhere and pass `--dump`.
2. Point `DATABASE_URL` at the target Postgres database.
3. Restore the dump before the first deployment:

```bash
npm run db:restore:replit -- --reset --force
```

If the dump is not in `~/Downloads/database_export.sql`, run:

```bash
npm run db:restore:replit -- --dump /absolute/path/to/database_export.sql --reset --force
```

## What gets restored

- `users`
- `skill_profiles`
- `access_passwords`
- `sessions`

## Important notes

- `--reset` drops only the four app tables above, then loads the dump.
- Do not run `npm run db:push` first on a fresh database. Restore the dump first.
- The dump contains a legacy `skill_profiles.integrated_faith` column. The app schema now keeps that column for compatibility.
- SQL dumps do not include uploaded object storage files. If any profiles rely on uploaded images, move those objects separately.
