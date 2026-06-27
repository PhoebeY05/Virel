import { z } from "zod";
import { AccountSetupSchema, PostSchema, PlatformNameSchema } from "./platform";

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional()
});

export type Project = z.infer<typeof ProjectSchema>;

export const AccountSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  platform: PlatformNameSchema,
  username: z.string(),
  bio: z.string().default(""),
  profile_image_url: z.string().url().nullable().optional(),
  account_url: z.string().url().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().default(""),
  phone_required: z.boolean().default(false),
  session_path: z.string().nullable().optional()
});

export type Account = z.infer<typeof AccountSchema>;

export const UserSettingsSchema = z.object({
  company_name: z.string().default(""),
  legal_entity_name: z.string().default(""),
  company_start_date: z.string().default(""),
  website_url: z.string().default(""),
  support_email: z.string().default(""),
  phone_number: z.string().default(""),
  country: z.string().default(""),
  timezone: z.string().default(""),
  display_name: z.string().default(""),
  brand_handle: z.string().default(""),
  brand_bio: z.string().default(""),
  profile_image_url: z.string().nullable().optional(),
  backup_email: z.string().default(""),
  google_account_email: z.string().default(""),
  google_link_status: z.string().default("Not linked"),
  linkedin_url: z.string().default(""),
  instagram_handle: z.string().default(""),
  x_handle: z.string().default(""),
  tiktok_handle: z.string().default(""),
  reddit_username: z.string().default(""),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const CampaignSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string()
});

export type Campaign = z.infer<typeof CampaignSchema>;

export const CampaignPostSchema = PostSchema;
export type CampaignPost = z.infer<typeof CampaignPostSchema>;

export const AutomationSessionSchema = z.object({
  id: z.string(),
  platform: PlatformNameSchema,
  accountId: z.string().optional(),
  status: z.string()
});

export type AutomationSession = z.infer<typeof AutomationSessionSchema>;
