import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Skills profiles table
export const skillProfiles = pgTable("skill_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(),
  isMember: varchar("is_member").notNull(), // 'yes', 'no', 'regular-attendee'
  occupation: varchar("occupation").notNull(),
  keySkills: text("key_skills").array().notNull(),
  expertiseToShare: text("expertise_to_share"),
  contactMethod: varchar("contact_method").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  weeklyHours: varchar("weekly_hours"), // '0', '1-2', '3-5', '6-10', '10+'
  integratedFaith: integer("integrated_faith"), // Legacy score kept for Replit dump compatibility
  agreeToContact: boolean("agree_to_contact").default(false),
  profileImageUrl: varchar("profile_image_url"),
  
  // Skills ratings (1-5)
  selfLeadership: integer("self_leadership"),
  cultureTeam: integer("culture_team"),
  socialImpact: integer("social_impact"),
  innovation: integer("innovation"),
  strategy: integer("strategy"),
  marketing: integer("marketing"),
  operations: integer("operations"),
  fundraising: integer("fundraising"),
  
  // Faith integration and calling
  integratesFaith: varchar("integrates_faith"), // 'yes', 'no', 'i-dont-know'
  faithIntegrationEase: varchar("faith_integration_ease"), // 'easy', 'hard', 'i-dont-know'
  cause: text("cause"),
  peopleGroup: text("people_group"),
  passionateIssue: text("passionate_issue"),
  passionateCountry: text("passionate_country"),
  
  // Contact preferences
  agreeToRENews: boolean("agree_to_re_news").default(false),
  
  // Approval status
  status: varchar("status").default("pending"), // 'pending', 'approved', 'rejected'
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Website access passwords
export const accessPasswords = pgTable("access_passwords", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  password: varchar("password").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertSkillProfileSchema = createInsertSchema(skillProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  approvedAt: true,
  approvedBy: true,
}).extend({
  profileImageUrl: z.string().optional(),
});

export type InsertSkillProfile = z.infer<typeof insertSkillProfileSchema>;
export type SkillProfile = typeof skillProfiles.$inferSelect;

export const insertPasswordSchema = createInsertSchema(accessPasswords).omit({
  id: true,
  createdAt: true,
});

export type InsertPassword = z.infer<typeof insertPasswordSchema>;
export type AccessPassword = typeof accessPasswords.$inferSelect;
