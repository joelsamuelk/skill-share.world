import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { setupAuth, isAuthenticated, requireAdmin, getAuthenticatedUserId } from "./replitAuth";
import { getAuth } from "@clerk/express";
import { insertSkillProfileSchema } from "@shared/schema";
import { z } from "zod";
import { sendEmail, notifyAdminsOfPendingProfile } from "./sendgrid";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Debug endpoint - test if Clerk middleware is working
  app.get('/api/auth/debug', (req: any, res) => {
    try {
      const auth = getAuth(req);
      console.log("[debug]", JSON.stringify({ userId: auth?.userId, sessionId: auth?.sessionId }));
      res.json({ userId: auth?.userId, sessionId: auth?.sessionId });
    } catch (err: any) {
      console.error("[debug error]", err.message);
      res.json({ error: err.message });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Password validation endpoint
  app.post('/api/validate-password', async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      const isValid = await storage.validateAccessPassword(password);
      res.json({ valid: isValid });
    } catch (error) {
      console.error("Error validating password:", error);
      res.status(500).json({ message: "Failed to validate password" });
    }
  });

  // Skill profile routes
  app.post('/api/skill-profiles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const existingProfileForUser = await storage.getSkillProfileByUserId(userId);
      if (existingProfileForUser) {
        return res.status(409).json({
          message: "A skills profile already exists for this account.",
          profile: existingProfileForUser,
        });
      }

      const profileData = insertSkillProfileSchema.parse({
        ...req.body,
        userId
      });

      const normalizedEmail = profileData.email.trim().toLowerCase();
      profileData.email = normalizedEmail;
      const existingProfileForEmail = await storage.getSkillProfileByEmail(normalizedEmail);
      if (existingProfileForEmail) {
        if (existingProfileForEmail.userId === userId) {
          return res.status(409).json({
            message: "A skills profile already exists for this account.",
            profile: existingProfileForEmail,
          });
        }

        return res.status(409).json({
          message: "A skills profile already exists for this email address. Please sign in with that email or ask an admin to link your account.",
          profile: existingProfileForEmail,
        });
      }

      const profile = await storage.createSkillProfile(profileData);
      
      // Send admin email notification (async, don't block response)
      const fromEmail = process.env.SENDGRID_FROM_EMAIL;
      if (fromEmail) {
        const admins = await storage.getAdmins();
        const adminEmails = admins
          .map(a => a.email)
          .filter((email): email is string => !!email);
        
        if (adminEmails.length > 0) {
          const appUrl = process.env.APP_URL || 'http://localhost:3000';
          
          // Fire and forget - don't await to avoid slowing down profile creation
          notifyAdminsOfPendingProfile({
            adminEmails,
            fromEmail,
            profileName: profile.name,
            profileEmail: profile.email,
            profileId: profile.id,
            appUrl,
          }).then(result => {
            console.log(`Admin notifications sent: ${result.sent} succeeded, ${result.failed} failed`);
          }).catch(err => {
            console.error('Failed to send admin notifications:', err);
          });
        }
      } else {
        console.log("SENDGRID_FROM_EMAIL not set, skipping admin notification");
      }
      
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating skill profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create skill profile" });
    }
  });

  app.put(
    "/api/local-objects/upload/:objectId",
    isAuthenticated,
    express.raw({ type: "image/*", limit: "5mb" }),
    async (req: any, res) => {
      try {
        const objectStorageService = new ObjectStorageService();
        if (!objectStorageService.isLocalObjectStorageEnabled()) {
          return res.sendStatus(404);
        }

        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ message: "Image body is required" });
        }

        await objectStorageService.writeLocalObjectUpload(
          req.params.objectId,
          req.body,
          req.get("content-type") ?? undefined,
        );

        res.status(200).json({ success: true });
      } catch (error) {
        console.error("Error uploading local object:", error);
        res.status(500).json({ message: "Failed to upload image" });
      }
    },
  );

  app.get('/api/skill-profiles', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const profiles = await storage.getSkillProfiles(status as string);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching skill profiles:", error);
      res.status(500).json({ message: "Failed to fetch skill profiles" });
    }
  });

  app.patch('/api/skill-profiles/:id/status', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = getAuthenticatedUserId(req);

      const profile = await storage.updateSkillProfileStatus(id, status, userId);
      res.json(profile);
    } catch (error) {
      console.error("Error updating skill profile status:", error);
      res.status(500).json({ message: "Failed to update skill profile status" });
    }
  });

  app.put('/api/skill-profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get the user and the profile to be updated
      const user = await storage.getUser(userId);
      const existingProfile = await storage.getSkillProfile(id);
      
      if (!existingProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      // Check if user is admin OR owns the profile
      const canEdit = user?.isAdmin || existingProfile.userId === userId;
      if (!canEdit) {
        return res.status(403).json({ message: "Not authorized to edit this profile" });
      }

      const profileData = insertSkillProfileSchema.parse({
        ...req.body,
        userId: existingProfile.userId // Always keep the original owner
      });

      const profile = await storage.updateSkillProfile(id, profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error updating skill profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update skill profile" });
    }
  });

  app.delete('/api/skill-profiles/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      await storage.deleteSkillProfile(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting skill profile:", error);
      res.status(500).json({ message: "Failed to delete skill profile" });
    }
  });

  // Object storage routes for profile images
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.sendStatus(401);
      }
      const objectStorageService = new ObjectStorageService();

      if (await objectStorageService.hasLocalObjectEntity(req.path)) {
        const canAccess = await objectStorageService.canAccessLocalObjectEntity({
          objectPath: req.path,
          userId,
          requestedPermission: ObjectPermission.READ,
        });

        if (!canAccess) {
          return res.sendStatus(401);
        }

        await objectStorageService.downloadLocalObject(req.path, res);
        return;
      }
      
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(401);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.put("/api/profile-images", isAuthenticated, async (req: any, res) => {
    if (!req.body.profileImageURL) {
      return res.status(400).json({ error: "profileImageURL is required" });
    }

    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const objectStorageService = new ObjectStorageService();
      
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.profileImageURL,
        {
          owner: userId,
          visibility: "public", // Profile images should be public
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting profile image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get current user's skill profile
  app.get('/api/my-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userProfile = await storage.getSkillProfileByUserId(userId);
      
      if (!userProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(userProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Admin stats endpoint
  app.get('/api/admin/stats', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Password management endpoints
  app.get('/api/admin/passwords', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const passwords = await storage.getAccessPasswords();
      res.json(passwords);
    } catch (error) {
      console.error("Error fetching passwords:", error);
      res.status(500).json({ message: "Failed to fetch passwords" });
    }
  });

  app.post('/api/admin/passwords', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { password } = req.body;
      if (!password || password.trim().length < 3) {
        return res.status(400).json({ message: "Password must be at least 3 characters" });
      }

      const newPassword = await storage.createAccessPassword(password.trim());
      res.status(201).json(newPassword);
    } catch (error) {
      console.error("Error creating password:", error);
      res.status(500).json({ message: "Failed to create password" });
    }
  });

  app.delete('/api/admin/passwords/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deactivateAccessPassword(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deactivating password:", error);
      res.status(500).json({ message: "Failed to deactivate password" });
    }
  });

  // User management endpoints
  app.get('/api/admin/users', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/admin-status', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isAdmin } = req.body;

      if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ message: "isAdmin must be a boolean value" });
      }

      const updatedUser = await storage.updateUserAdminStatus(id, isAdmin);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user admin status:", error);
      res.status(500).json({ message: "Failed to update user admin status" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const currentUserId = getAuthenticatedUserId(req);

      if (id === currentUserId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Export data endpoint
  app.get('/api/admin/export', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const profiles = await storage.getSkillProfiles('approved');
      
      // Convert to CSV format
      const csvHeader = 'Name,Occupation,Email,Phone,Key Skills,Weekly Hours,Status\n';
      const csvData = profiles.map(profile => 
        `"${profile.name}","${profile.occupation}","${profile.email}","${profile.phone || ''}","${profile.keySkills}","${profile.weeklyHours || ''}","${profile.status}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="st-basils-skills-profiles.csv"');
      res.send(csvHeader + csvData);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Get users without profiles
  app.get('/api/admin/users-without-profiles', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const usersWithoutProfiles = await storage.getUsersWithoutProfiles();
      res.json(usersWithoutProfiles);
    } catch (error) {
      console.error("Error fetching users without profiles:", error);
      res.status(500).json({ message: "Failed to fetch users without profiles" });
    }
  });

  // Send profile reminder emails
  app.post('/api/admin/send-profile-reminders', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { fromEmail } = req.body;
      if (!fromEmail || !fromEmail.includes('@')) {
        return res.status(400).json({ message: "Valid 'fromEmail' is required" });
      }

      const usersWithoutProfiles = await storage.getUsersWithoutProfiles();
      
      if (usersWithoutProfiles.length === 0) {
        return res.json({ 
          success: true, 
          sent: 0, 
          failed: 0, 
          message: "No users without profiles found" 
        });
      }

      let sent = 0;
      let failed = 0;

      for (const userToEmail of usersWithoutProfiles) {
        if (!userToEmail.email) {
          failed++;
          continue;
        }

        const emailSubject = "Create Your St Basil's Skills Profile";
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hello ${userToEmail.firstName || 'there'}!</h2>
            
            <p>We noticed you've joined the St Basil's Redemptive Enterprise community but haven't yet created your skills profile.</p>
            
            <p>Your profile helps us connect community members and share expertise across the network. It only takes a few minutes to complete!</p>
            
            <p style="margin: 30px 0;">
              <a href="${process.env.APP_URL ? `${process.env.APP_URL}/setup-skills` : 'https://skill-share.world/setup-skills'}" 
                 style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Create Your Profile
              </a>
            </p>
            
            <p>Share your skills, expertise, and passion to help build our redemptive enterprise community.</p>
            
            <p style="color: #666; font-size: 14px; margin-top: 40px;">
              Best regards,<br/>
              St Basil's Redemptive Enterprise Team
            </p>
          </div>
        `;

        const emailText = `Hello ${userToEmail.firstName || 'there'}!

We noticed you've joined the St Basil's Redemptive Enterprise community but haven't yet created your skills profile.

Your profile helps us connect community members and share expertise across the network. It only takes a few minutes to complete!

Create your profile here: ${process.env.APP_URL ? `${process.env.APP_URL}/setup-skills` : 'https://skill-share.world/setup-skills'}

Share your skills, expertise, and passion to help build our redemptive enterprise community.

Best regards,
St Basil's Redemptive Enterprise Team`;

        const success = await sendEmail({
          to: userToEmail.email,
          from: fromEmail,
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
        });

        if (success) {
          sent++;
        } else {
          failed++;
        }
      }

      res.json({ 
        success: true, 
        sent, 
        failed, 
        total: usersWithoutProfiles.length 
      });
    } catch (error) {
      console.error("Error sending profile reminders:", error);
      res.status(500).json({ message: "Failed to send profile reminders" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
