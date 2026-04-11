import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, Request, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? "google";
const strategyName = "oidc";

const isLocalDev = AUTH_PROVIDER === "local";

const LOCAL_AUTH_USER_ID = process.env.LOCAL_AUTH_USER_ID ?? "local-dev-user";
const LOCAL_AUTH_EMAIL = process.env.LOCAL_AUTH_EMAIL ?? "dev@example.com";
const LOCAL_AUTH_FIRST_NAME = process.env.LOCAL_AUTH_FIRST_NAME ?? "Local";
const LOCAL_AUTH_LAST_NAME = process.env.LOCAL_AUTH_LAST_NAME ?? "Developer";

type SessionUser = Express.User & {
  access_token?: string;
  appUserId?: string;
  claims?: Record<string, any>;
  expires_at?: number;
  refresh_token?: string;
};

const getOidcClient = memoize(
  async () => {
    const issuerUrl =
      process.env.OIDC_ISSUER_URL ??
      (AUTH_PROVIDER === "google" ? "https://accounts.google.com" : undefined);
    const clientId = process.env.OIDC_CLIENT_ID ?? process.env.REPL_ID;
    if (!clientId) {
      throw new Error("OIDC_CLIENT_ID or REPL_ID must be provided for OIDC authentication.");
    }
    if (!issuerUrl) {
      throw new Error("OIDC_ISSUER_URL must be provided for OIDC authentication.");
    }

    const clientAuthentication = process.env.OIDC_CLIENT_SECRET
      ? client.ClientSecretPost(process.env.OIDC_CLIENT_SECRET)
      : client.None();

    return client.discovery(
      new URL(issuerUrl),
      clientId,
      undefined,
      clientAuthentication,
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !isLocalDev,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: SessionUser,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
  appUserId?: string,
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
  user.appUserId = appUserId ?? user.appUserId ?? user.claims?.sub;
}

async function upsertUser(
  claims: any,
) {
  const email = typeof claims["email"] === "string"
    ? claims["email"].trim().toLowerCase()
    : undefined;
  const existingUser = email ? await storage.getUserByEmail(email) : undefined;

  return storage.upsertUser({
    id: existingUser?.id ?? claims["sub"],
    email,
    firstName: claims["given_name"] ?? claims["first_name"],
    lastName: claims["family_name"] ?? claims["last_name"],
    profileImageUrl: claims["picture"] ?? claims["profile_image_url"],
  });
}

function getRequestOrigin(req: Request) {
  const host = req.get("host");
  if (!host) {
    throw new Error("Unable to determine request host for OIDC callback.");
  }

  return `${req.protocol}://${host}`;
}

function getCallbackUrl(req: Request) {
  return `${getRequestOrigin(req)}/api/callback`;
}

function getLoginPrompt() {
  if (AUTH_PROVIDER === "google") {
    return "select_account";
  }

  return "login";
}

export function getAuthenticatedUserId(req: Request) {
  const user = req.user as SessionUser | undefined;
  return user?.appUserId ?? user?.claims?.sub;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (isLocalDev) {
    passport.use(
      "local-mock",
      new (class extends passport.Strategy {
        name = "local-mock";

        authenticate(req: any) {
          const mockClaims = {
            sub: LOCAL_AUTH_USER_ID,
            email: LOCAL_AUTH_EMAIL,
            first_name: LOCAL_AUTH_FIRST_NAME,
            last_name: LOCAL_AUTH_LAST_NAME,
            profile_image_url: null,
            email_verified: true,
          };

          upsertUser(mockClaims)
            .then((appUser) => {
              const mockUser: SessionUser = {
                appUserId: appUser.id,
                claims: mockClaims,
              };
              this.success(mockUser);
            })
            .catch((error) => {
              console.error("Error creating mock user:", error);
              this.fail("Authentication failed");
            });
        }
      })(),
    );

    app.get("/api/login", (req, res, next) => {
      passport.authenticate("local-mock")(req, res, next);
    });

    app.get("/api/callback", (_req, res) => {
      res.redirect("/");
    });
  } else {
    const oidcClient = await getOidcClient();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback,
    ) => {
      const appUser = await upsertUser(tokens.claims());
      const user: SessionUser = {};
      updateUserSession(user, tokens, appUser.id);
      verified(null, user);
    };

    const strategy = new Strategy(
      {
        name: strategyName,
        config: oidcClient,
        scope: "openid email profile",
      },
      verify,
    );
    passport.use(strategy);

    app.get("/api/login", (req, res, next) => {
      const authOptions = {
        callbackURL: getCallbackUrl(req),
        prompt: getLoginPrompt(),
        scope: ["openid", "email", "profile"],
      } as any;

      passport.authenticate(strategyName, authOptions)(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      const authOptions = {
        callbackURL: getCallbackUrl(req),
        failureRedirect: "/",
      } as any;

      passport.authenticate(strategyName, authOptions)(req, res, () => {
        res.redirect("/");
      });
    });
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as SessionUser | undefined;

  if (isLocalDev && req.isAuthenticated()) {
    return next();
  }

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!user?.expires_at) {
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return next();
  }

  try {
    const oidcClient = await getOidcClient();
    const tokenResponse = await client.refreshTokenGrant(oidcClient, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
