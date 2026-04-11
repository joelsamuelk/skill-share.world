# Google Auth Setup

This app can keep the same password gate and admin dashboard flow without the Replit consent screen by using Google OpenID Connect directly.

## Required environment variables

Set these in deployment:

```bash
AUTH_PROVIDER=google
OIDC_CLIENT_ID=your-google-oauth-client-id
OIDC_CLIENT_SECRET=your-google-oauth-client-secret
APP_URL=https://skill-share.world
SESSION_SECRET=replace-this-with-a-long-random-secret
DATABASE_URL=your-postgres-connection-string
```

For local development with Google auth instead of the local mock:

```bash
AUTH_PROVIDER=google
APP_URL=http://localhost:3000
OIDC_CLIENT_ID=your-google-oauth-client-id
OIDC_CLIENT_SECRET=your-google-oauth-client-secret
```

## Google OAuth redirect URIs

Register these callback URLs in the Google OAuth client:

- `http://localhost:3000/api/callback`
- `https://skill-share.world/api/callback`

Add your production host variants too if you use them, for example `https://www.skill-share.world/api/callback`.

## How user mapping works

- Existing app users are matched by email first.
- That means `joelsamuelk@gmail.com` will keep the same existing user record, admin flag, and linked skill profiles even though Google and Replit use different subject IDs.
- New users who do not already exist in the database are created on first login.
