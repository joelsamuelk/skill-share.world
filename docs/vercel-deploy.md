# Vercel Deploy

This app now supports a split Vercel deployment:

- the React app is built to `dist/public`
- the Express API runs as the Vercel function in `api/index.ts`
- archived legacy profile pictures are bundled from `data/profile_pictures/profile_pictures`

## 1. Create the Vercel project

From the repo root:

```bash
npx vercel
```

For production deploys:

```bash
npx vercel --prod
```

`vercel.json` already sets:

- `buildCommand` to `npm run build`
- `outputDirectory` to `dist/public`
- rewrites for `/api/*` and `/objects/*`

## 2. Required environment variables

Set these in Vercel Project Settings:

- `DATABASE_URL`
- `SESSION_SECRET`
- `APP_URL`
- `AUTH_PROVIDER=google`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`

Optional email settings:

- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`

Required for persistent profile-image uploads in production:

- `GCS_PROJECT_ID`
- `GCS_CREDENTIALS_JSON`
- `PUBLIC_OBJECT_SEARCH_PATHS`
- `PRIVATE_OBJECT_DIR`

Do not set `LOCAL_OBJECTS_DIR` on Vercel. Local filesystem uploads are for development only. Vercel functions need object storage for new uploads.

## 3. Google OAuth callback URLs

In Google Cloud Console, add:

- `https://<your-vercel-domain>/api/callback`
- `https://<your-custom-domain>/api/callback`

Use the exact production URLs you plan to serve.

## 4. Notes

- The legacy archived image files are packaged for read access on Vercel.
- New profile-picture uploads in production should go to GCS, not local disk.
- Only the `Test` profile currently has a confirmed archived image mapping from the recovered files.
