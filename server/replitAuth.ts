import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? "oidc";
const authDomains = (process.env.AUTH_DOMAINS ?? process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((domain) => domain.trim())
  .filter(Boolean);

const isLocalDev = AUTH_PROVIDER === "local" || (process.env.NODE_ENV === "development" && AUTH_PROVIDER !== "oidc");

const LOCAL_AUTH_USER_ID = process.env.LOCAL_AUTH_USER_ID ?? "local-dev-user";
const LOCAL_AUTH_EMAIL = process.env.LOCAL_AUTH_EMAIL ?? "dev@example.com";
const LOCAL_AUTH_FIRST_NAME = process.env.LOCAL_AUTH_FIRST_NAME ?? "Local";
const LOCAL_AUTH_LAST_NAME = process.env.LOCAL_AUTH_LAST_NAME ?? "Developer";

if (!isLocalDev && authDomains.length === 0) {
  throw new Error("AUTH_DOMAINS must be set for OIDC authentication.");
}

const getOidcClient = memoize(
  async () => {
    const issuerUrl = process.env.OIDC_ISSUER_URL ?? "https://replit.com/oidc";
    const clientId = process.env.OIDC_CLIENT_ID ?? process.env.REPL_ID;
    if (!clientId) {
      throw new Error("OIDC_CLIENT_ID or REPL_ID must be provided for OIDC authentication.");
    }

    const issuer = await client.Issuer.discover(issuerUrl);
    const clientConfig: any = { client_id: clientId };
    if (process.env.OIDC_CLIENT_SECRET) {
      clientConfig.client_secret = process.env.OIDC_CLIENT_SECRET;
    }
    return new issuer.Client(clientConfig);
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
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

function getStrategyName(domain: string) {
  return `oidcauth:${domain}`;
}

function getRequestDomain(req: Express.Request) {
  const hostname = req.hostname;
  if (authDomains.includes(hostname)) {
    return hostname;
  }
  return authDomains[0] || hostname;
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
            .then(() => {
              const mockUser = { claims: mockClaims };
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
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    for (const domain of authDomains) {
      const isLocalhost = domain.includes("localhost");
      const protocol = isLocalhost ? "http" : "https";
      const strategy = new Strategy(
        {
          name: getStrategyName(domain),
          config: oidcClient,
          scope: "openid email profile offline_access",
          callbackURL: `${protocol}://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }

    app.get("/api/login", (req, res, next) => {
      const domain = getRequestDomain(req);
      passport.authenticate(getStrategyName(domain), {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      const domain = getRequestDomain(req);
      passport.authenticate(getStrategyName(domain), {
        failureRedirect: "/login",
      })(req, res, () => {
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
  const user = req.user as any;

  if (isLocalDev && req.isAuthenticated()) {
    return next();
  }

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
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
