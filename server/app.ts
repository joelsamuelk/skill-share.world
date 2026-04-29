import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { registerRoutes } from "./routes";
import { log } from "./log";
import { storage } from "./storage";

type CreateAppOptions = {
  serveClient?: boolean;
};

async function initializeDefaultPasswords() {
  try {
    const passwords = await storage.getAccessPasswords();

    if (passwords.length === 0) {
      log("No access passwords found. Creating default passwords...");
      await storage.createAccessPassword("stbasils2025");
      await storage.createAccessPassword("redemptive");
      log("Default passwords created: 'stbasils2025' and 'redemptive'");
      return;
    }

    log(`Found ${passwords.length} access password(s) in database`);
  } catch (error) {
    console.error("Error initializing default passwords:", error);
  }
}

export async function createApp({ serveClient = true }: CreateAppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

  const server = await registerRoutes(app);
  await initializeDefaultPasswords();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }

    console.error(err);
  });

  if (serveClient) {
    const { setupVite, serveStatic } = await import("./vite");
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  }

  return { app, server };
}
