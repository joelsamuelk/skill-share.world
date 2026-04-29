import { clerkMiddleware, getAuth } from "@clerk/express";
import { createClerkClient } from "@clerk/express";
import type { Express, Request, RequestHandler } from "express";
import { storage } from "./storage";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

export function getAuthenticatedUserId(req: Request) {
  const auth = getAuth(req);
  return auth?.userId ?? undefined;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(clerkMiddleware());
}

async function ensureUserInDb(userId: string) {
  const existing = await storage.getUser(userId);
  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;

  // Check if a user with this email already exists (e.g. migrated from old auth)
  const existingByEmail = email ? await storage.getUserByEmail(email) : undefined;
  if (existingByEmail) {
    // Update the existing user's ID to match Clerk's ID
    return storage.upsertUser({
      id: userId,
      email: existingByEmail.email,
      firstName: existingByEmail.firstName ?? clerkUser.firstName,
      lastName: existingByEmail.lastName ?? clerkUser.lastName,
      profileImageUrl: existingByEmail.profileImageUrl ?? clerkUser.imageUrl,
      isAdmin: existingByEmail.isAdmin,
    });
  }

  return storage.upsertUser({
    id: userId,
    email,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    profileImageUrl: clerkUser.imageUrl,
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Ensure user exists in our database
  try {
    await ensureUserInDb(userId);
  } catch (error) {
    console.error("Error syncing user to database:", error);
  }

  next();
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const dbUser = await storage.getUser(userId);
  if (!dbUser?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
