import { clerkMiddleware, getAuth, createClerkClient } from "@clerk/express";
import type { Express, Request, RequestHandler } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { users, skillProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

let _clerkClient: ReturnType<typeof createClerkClient>;
function getClerkClient() {
  if (!_clerkClient) {
    _clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
    });
  }
  return _clerkClient;
}

export function getAuthenticatedUserId(req: Request) {
  const auth = getAuth(req);
  return auth?.userId ?? undefined;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }));
}

async function ensureUserInDb(userId: string) {
  const existing = await storage.getUser(userId);
  if (existing) return existing;

  const clerkUser = await getClerkClient().users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;

  // Check if a user with this email already exists (migrated from old auth)
  const existingByEmail = email ? await storage.getUserByEmail(email) : undefined;
  if (existingByEmail && existingByEmail.id !== userId) {
    const oldId = existingByEmail.id;
    console.log(`[auth] Migrating user ${oldId} -> ${userId} (${email})`);

    // Use transaction to handle unique email constraint and FK ordering:
    // 1. Clear old user's email (frees unique constraint)
    // 2. Create new user with the email
    // 3. Migrate skill_profiles to new user
    // 4. Delete old user
    const [newUser] = await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ email: null })
        .where(eq(users.id, oldId));

      const [created] = await tx.insert(users)
        .values({
          id: userId,
          email: existingByEmail.email,
          firstName: existingByEmail.firstName ?? clerkUser.firstName,
          lastName: existingByEmail.lastName ?? clerkUser.lastName,
          profileImageUrl: existingByEmail.profileImageUrl ?? clerkUser.imageUrl,
          isAdmin: existingByEmail.isAdmin,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: existingByEmail.email,
            firstName: existingByEmail.firstName ?? clerkUser.firstName,
            lastName: existingByEmail.lastName ?? clerkUser.lastName,
            profileImageUrl: existingByEmail.profileImageUrl ?? clerkUser.imageUrl,
            isAdmin: existingByEmail.isAdmin,
            updatedAt: new Date(),
          },
        })
        .returning();

      await tx.update(skillProfiles)
        .set({ userId })
        .where(eq(skillProfiles.userId, oldId));

      await tx.delete(users).where(eq(users.id, oldId));

      return [created];
    });

    return newUser;
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
  const auth = getAuth(req);
  const userId = auth?.userId ?? undefined;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await ensureUserInDb(userId);
  } catch (error) {
    console.error("Error syncing user to database:", error);
    return res.status(500).json({ message: "Failed to sync user account" });
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
