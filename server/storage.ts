import {
  users,
  skillProfiles,
  accessPasswords,
  type User,
  type UpsertUser,
  type SkillProfile,
  type InsertSkillProfile,
  type AccessPassword,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Skill profile operations
  createSkillProfile(profile: InsertSkillProfile): Promise<SkillProfile>;
  getSkillProfiles(status?: string): Promise<SkillProfile[]>;
  updateSkillProfileStatus(id: string, status: string, approvedBy?: string): Promise<SkillProfile>;
  updateSkillProfile(id: string, profile: InsertSkillProfile): Promise<SkillProfile>;
  deleteSkillProfile(id: string): Promise<void>;
  getSkillProfile(id: string): Promise<SkillProfile | undefined>;
  
  // Password operations
  validateAccessPassword(password: string): Promise<boolean>;
  createAccessPassword(password: string): Promise<AccessPassword>;
  getAccessPasswords(): Promise<AccessPassword[]>;
  deactivateAccessPassword(id: string): Promise<void>;
  
  // Admin operations
  getAdminStats(): Promise<{
    pendingCount: number;
    approvedToday: number;
    totalProfiles: number;
  }>;
  getAllUsers(): Promise<User[]>;
  updateUserAdminStatus(id: string, isAdmin: boolean): Promise<User>;
  getUsersWithoutProfiles(): Promise<User[]>;
  getAdmins(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Skill profile operations
  async createSkillProfile(profile: InsertSkillProfile): Promise<SkillProfile> {
    const [skillProfile] = await db
      .insert(skillProfiles)
      .values(profile)
      .returning();
    return skillProfile;
  }

  async getSkillProfiles(status?: string): Promise<SkillProfile[]> {
    if (status) {
      return await db
        .select()
        .from(skillProfiles)
        .where(eq(skillProfiles.status, status))
        .orderBy(desc(skillProfiles.createdAt));
    }
    return await db
      .select()
      .from(skillProfiles)
      .orderBy(desc(skillProfiles.createdAt));
  }

  async updateSkillProfileStatus(id: string, status: string, approvedBy?: string): Promise<SkillProfile> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = approvedBy;
    }

    const [skillProfile] = await db
      .update(skillProfiles)
      .set(updateData)
      .where(eq(skillProfiles.id, id))
      .returning();
    return skillProfile;
  }

  async getSkillProfile(id: string): Promise<SkillProfile | undefined> {
    const [profile] = await db
      .select()
      .from(skillProfiles)
      .where(eq(skillProfiles.id, id));
    return profile;
  }

  async updateSkillProfile(id: string, profileData: InsertSkillProfile): Promise<SkillProfile> {
    const [profile] = await db
      .update(skillProfiles)
      .set({
        ...profileData,
        updatedAt: new Date()
      })
      .where(eq(skillProfiles.id, id))
      .returning();
    return profile;
  }

  async deleteSkillProfile(id: string): Promise<void> {
    await db
      .delete(skillProfiles)
      .where(eq(skillProfiles.id, id));
  }

  // Password operations
  async validateAccessPassword(password: string): Promise<boolean> {
    const [accessPassword] = await db
      .select()
      .from(accessPasswords)
      .where(and(
        eq(accessPasswords.password, password),
        eq(accessPasswords.isActive, true)
      ));
    return !!accessPassword;
  }

  async createAccessPassword(password: string): Promise<AccessPassword> {
    const [accessPassword] = await db
      .insert(accessPasswords)
      .values({ password, isActive: true })
      .returning();
    return accessPassword;
  }

  async getAccessPasswords(): Promise<AccessPassword[]> {
    return await db
      .select()
      .from(accessPasswords)
      .orderBy(desc(accessPasswords.createdAt));
  }

  async deactivateAccessPassword(id: string): Promise<void> {
    await db
      .update(accessPasswords)
      .set({ isActive: false })
      .where(eq(accessPasswords.id, id));
  }

  // Admin operations
  async getAdminStats(): Promise<{
    pendingCount: number;
    approvedToday: number;
    totalProfiles: number;
  }> {
    const [pending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(skillProfiles)
      .where(eq(skillProfiles.status, 'pending'));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [approvedToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(skillProfiles)
      .where(and(
        eq(skillProfiles.status, 'approved'),
        sql`${skillProfiles.approvedAt} >= ${today}`
      ));

    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(skillProfiles);

    return {
      pendingCount: pending?.count || 0,
      approvedToday: approvedToday?.count || 0,
      totalProfiles: total?.count || 0,
    };
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserAdminStatus(id: string, isAdmin: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isAdmin,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsersWithoutProfiles(): Promise<User[]> {
    const usersWithProfiles = db
      .select({ userId: skillProfiles.userId })
      .from(skillProfiles);

    return await db
      .select()
      .from(users)
      .where(sql`${users.id} NOT IN ${usersWithProfiles}`)
      .orderBy(desc(users.createdAt));
  }

  async getAdmins(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, true));
  }
}

export const storage = new DatabaseStorage();
